import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshotLoader, InvalidSnapshotRequest } from "../app/data/load-snapshot.server.ts";
import { createGithubClient } from "../app/data/github.server.ts";
import { createCodeDetailBudget } from "../app/data/github-code.server.ts";
import { createRoster } from "../app/data/roster.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { loader as apiLoader } from "../app/routes/api.snapshot.ts";
import type { Route } from "../app/routes/+types/api.snapshot";

function allRepositorySource() {
  const clock = new Date("2026-10-09T08:00:00Z");
  const urls: string[] = [];
  let active = 0;
  let maxActive = 0;
  let failure = false;
  const sha = "a".repeat(40);
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
    const repository = Number(url.match(/product-(\d+)/)?.[1] ?? 0);
    if (failure && repository === 6 && url.includes("/pulls?")) return new Response("", { status: 500 });
    if (failure && repository === 5 && url.includes("/commits?")) throw new Error("Independent code failure");
    if (url.includes("/orgs/")) return Response.json([...repositories,
      { ...repositories[0], id: 9000, name: "private", private: true },
      { ...repositories[0], id: 9001, name: "foreign", owner: { login: "another-org" } },
    ]);
    const user = { id: 5000 + repository, login: `contributor-${repository}` };
    if (url.includes("/pulls?")) return Response.json([{
      number: 1, title: `Contribution to product ${repository}`, state: "closed", user,
      created_at: "2026-10-02T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", merged_at: "2026-10-03T00:00:00Z",
    }]);
    if (url.includes("/commits?")) return Response.json([{
      sha, author: user, parents: [{ sha: "b".repeat(40) }], commit: { committer: { date: "2026-10-03T12:00:00Z" } },
    }]);
    if (url.includes("/commits/")) {
      const token = new Headers(init?.headers).get("authorization");
      if (token) assert.equal(token, "Bearer server-only-test-token");
      return Response.json({ sha, stats: { additions: repository + 1, deletions: 0 } });
    }
    throw new Error("Unexpected upstream endpoint");
  };
  return { fetcher, now: () => clock, urls, codeDetailBudget: createCodeDetailBudget(),
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
  assert.equal(fake.urls.length, 22);
  assert.ok(!fake.urls.some((url) => url.includes("/issues")));
  const selected = await load({ mode: "github", repositoryId: "github:1000" });
  assert.equal(selected.work.length, 7);
  assert.equal(fake.urls.length, 22);
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

test("authentication selects a bounded 600-details/hour process budget", async () => {
  const budget = createCodeDetailBudget(true);
  assert.equal(budget.limit, 600);
  for (let i = 0; i < 600; i += 1) assert.equal(budget.take(1000), null);
  assert.equal(budget.take(1000), 3601000);
  assert.equal(budget.take(3601000), null);
  const fake = allRepositorySource();
  const client = createGithubClient({ fetcher: fake.fetcher, now: fake.now, token: "server-only-test-token" });
  assert.equal(client.codeDetailLimit, 600);
  const repository = (await client.catalog()).repositories[0];
  assert.equal((await client.code(repository, createRoster())).code.detailReadLimit, 600);
});

test("production preview requests are rejected before any fixture or upstream read", async () => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const fake = allRepositorySource();
    await assert.rejects(createSnapshotLoader(fake)({ mode: "preview" }), InvalidSnapshotRequest);
    assert.equal(fake.urls.length, 0);
    const args = { request: new Request("http://localhost/api/snapshot?mode=preview") } as Route.LoaderArgs;
    const response = await apiLoader(args);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { error: "Preview data is unavailable in production." });
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
});
