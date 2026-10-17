import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshotLoader, InvalidSnapshotRequest } from "../app/data/load-snapshot.server.ts";
import { createGithubClient } from "../app/data/github.server.ts";
import { fixtureToken, historyResponse, rawCommit } from "./github-fixtures.ts";
import { createRoster } from "../app/data/roster.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { loader as apiLoader } from "../app/routes/api.snapshot.ts";
import type { Route } from "../app/routes/+types/api.snapshot";
import { createSnapshotContext } from "../app/snapshot-context.server.ts";

function allRepositorySource() {
  const clock = new Date("2026-10-09T08:00:00Z");
  const urls: string[] = [];
  let active = 0;
  let maxActive = 0;
  let failure = false;
  const repositories = Array.from({ length: 7 }, (_, index) => ({
    id: index + 1000, name: `product-${index}`, full_name: `voss-labs/product-${index}`,
    private: false, owner: { login: "voss-labs" }, archived: index === 5, fork: index === 6,
    pushed_at: `2026-10-0${index + 1}T00:00:00Z`,
  }));
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    urls.push(url);
    active += 1; maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active -= 1;
    const history = url.endsWith("/graphql");
    const name = history ? JSON.parse(String(init?.body)).variables.name as string : url;
    const repository = Number(name.match(/product-(\d+)/)?.[1] ?? 0);
    if (failure && repository === 6 && url.includes("/pulls?")) return new Response("", { status: 500 });
    if (failure && repository === 5 && history) throw new Error("Independent code failure");
    if (url.includes("/orgs/")) return Response.json([...repositories,
      { ...repositories[0], id: 9000, name: "private", private: true },
      { ...repositories[0], id: 9001, name: "foreign", owner: { login: "another-org" } },
    ]);
    const user = { id: 5000 + repository, login: `contributor-${repository}` };
    if (url.includes("/pulls?")) return Response.json([{
      number: 1, title: `Contribution to product ${repository}`, state: "closed", user,
      created_at: "2026-10-02T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", merged_at: "2026-10-03T00:00:00Z",
    }]);
    if (history) {
      assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${fixtureToken}`);
      return Response.json(historyResponse([{ ...rawCommit(1, { databaseId: user.id, login: user.login }),
        additions: repository + 1, deletions: 0 }], false, `product-${repository}`));
    }
    throw new Error("Unexpected upstream endpoint");
  };
  return { fetcher, now: () => clock, urls, token: fixtureToken,
    get maxActive() { return maxActive; }, failOneOfEach() { failure = true; } };
}

test("all public products contribute, including repos outside the top four, forks and archives", async () => {
  const fake = allRepositorySource();
  const load = createSnapshotLoader(fake);
  const [first, second] = await Promise.all([load({ mode: "github" }), load({ mode: "github" })]);
  assert.deepEqual(first, second);
  assert.equal(first.repositories.length, 7);
  assert.equal(first.mainRepositoryIds.length, 4);
  assert.ok(first.work.every((repository) => repository.pulls?.length === 1 && repository.issues === null));
  assert.ok(first.code?.every((repository) => repository.commits?.length === 1));
  const board = deriveLeaderboard(first, "month", fake.now());
  assert.equal(board.coveredRepositoryIds.length, 7);
  assert.equal(board.codeCoverage.repositoryIds.length, 7);
  assert.equal(board.rows.reduce((sum, row) => sum + row.merged, 0), 7);
  assert.equal(board.rows.reduce((sum, row) => sum + (row.commits ?? 0), 0), 7);
  assert.equal(board.rows.find((row) => row.personId === "github:5000")?.additions, 1);
  assert.equal(board.rows.find((row) => row.personId === "github:5006")?.additions, 7);
  assert.ok(fake.maxActive <= 3);
  assert.equal(fake.urls.length, 15);
  assert.ok(!fake.urls.some((url) => url.includes("/issues")));
  const selected = await load({ mode: "github", repositoryId: "github:1000" });
  assert.equal(selected.work.length, 7);
  assert.equal(fake.urls.length, 15);
});

test("one repository's PR or code failure preserves every other repository's contribution", async () => {
  const fake = allRepositorySource(); fake.failOneOfEach();
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(snapshot.source.status, "partial");
  assert.equal(snapshot.work.find((repository) => repository.repositoryId === "github:1006")?.pulls, null);
  assert.equal(snapshot.code?.find((repository) => repository.repositoryId === "github:1005")?.commits, null);
  assert.equal(snapshot.work.find((repository) => repository.repositoryId === "github:1005")?.pulls?.length, 1);
  assert.equal(snapshot.code?.find((repository) => repository.repositoryId === "github:1006")?.commits?.length, 1);
  const board = deriveLeaderboard(snapshot, "month", fake.now());
  assert.equal(board.coveredRepositoryIds.length, 6);
  assert.equal(board.codeCoverage.repositoryIds.length, 6);
  assert.equal(board.codeCoverage.status, "partial");
  assert.equal(board.rows.find((row) => row.personId === "github:5006")?.commits, 1);
  assert.equal(board.rows.reduce((sum, row) => sum + row.merged, 0), 6);
});

test("authenticated history measures lines without an obsolete per-SHA allowance", async () => {
  const fake = allRepositorySource();
  const client = createGithubClient(fake);
  assert.equal(client.codeDetailLimit, null);
  const repository = (await client.catalog()).repositories[0];
  const captured = (await client.code(repository, createRoster())).code;
  assert.equal(captured.detailReadLimit, null);
  assert.equal(captured.commits?.[0].additions, 1);
  assert.equal(fake.urls.filter((url) => url.endsWith("/graphql")).length, 1);
  assert.ok(!fake.urls.some((url) => url.includes("/commits")));
});

test("production preview requests are rejected before any fixture or upstream read", async () => {
  const fake = allRepositorySource();
  const load = createSnapshotLoader({ ...fake, allowPreview: false });
  await assert.rejects(load({ mode: "preview" }), InvalidSnapshotRequest);
  assert.equal(fake.urls.length, 0);
  const context = createSnapshotContext(load);
  const url = new URL("http://localhost/api/snapshot?mode=preview");
  const args: Route.LoaderArgs = { request: new Request(url), url, context, params: {}, pattern: "/api/snapshot" };
  const response = await apiLoader(args);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "Preview data is unavailable in production." });
  assert.equal(fake.urls.length, 0);
});
