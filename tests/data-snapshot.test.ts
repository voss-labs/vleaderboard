import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshotLoader, InvalidSnapshotRequest } from "../app/data/load-snapshot.server.ts";
import type { OfficeSnapshot } from "../app/data/types.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { loader as apiLoader } from "../app/routes/api.snapshot.ts";
import type { Route } from "../app/routes/+types/api.snapshot";
import { createSnapshotContext } from "../app/snapshot-context.server.ts";
import { fixtureToken, historyResponse } from "./github-fixtures.ts";

const catalog = [{ id: 1332389317, name: "vroom", full_name: "voss-labs/vroom", private: false,
  owner: { login: "voss-labs" }, archived: false, fork: false, pushed_at: "2026-10-08T00:00:00Z" }];
const capturedPull = {
  number: 8, title: "Captured public PR", state: "closed", user: { id: 86048671, login: "harshalmore31", type: "User" },
  merged_by: { id: 900, login: "somebody-else" },
  assignees: [{ id: 120, login: "outside-contributor" }], requested_reviewers: [{ id: 205825698, login: "Mandar885" }],
  created_at: "2026-10-02T12:00:00Z", updated_at: "2026-10-08T12:00:00Z", merged_at: "2026-10-08T12:00:00Z",
};

function fakeGithub() {
  let count = 0;
  let clock = Date.parse("2026-10-09T08:00:00Z");
  let failure: "rate" | "network" | null = null;
  let pagination = false;
  let mergedAt = capturedPull.merged_at;
  const urls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    urls.push(url); count += 1;
    assert.equal(new Headers(init?.headers).get("X-GitHub-Api-Version"), "2026-03-10");
    if (failure === "network") throw new Error("Network unavailable");
    if (failure === "rate") return new Response("", { status: 429, headers: { "retry-after": "600" } });
    const observedPull = { ...capturedPull, merged_at: mergedAt, updated_at: mergedAt };
    const data = url.includes("/orgs/") ? catalog : url.endsWith("/graphql") ? historyResponse([], false, "vroom") : url.includes("/pulls?") ? [observedPull]
      : [{ ...observedPull, number: 20, state: "open", merged_at: null }, { ...observedPull, pull_request: {} }];
    return Response.json(data, { headers: pagination ? { Link: '<https://api.github.com/ignored>; rel="next"' } : {} });
  };
  return {
    fetcher, now: () => new Date(clock), urls, token: fixtureToken, deadlineMs: 86400000,
    get count() { return count; },
    advance(milliseconds: number) { clock += milliseconds; },
    fail(value: "rate" | "network" | null) { failure = value; },
    paginate() { pagination = true; },
    mergeAt(value: string) { mergedAt = value; },
  };
}

test("preview reaches no upstream and rejects invalid requests", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader({ ...fake, allowPreview: true });
  assert.equal((await load({ mode: "preview" })).source.mode, "preview");
  assert.equal(fake.count, 0);
  await assert.rejects(load({ mode: "preview", repositoryId: "https://example.org" }), InvalidSnapshotRequest);
  await assert.rejects(load({ mode: "preview", repositoryId: "" }), InvalidSnapshotRequest);
  await assert.rejects(load({ mode: "preview", repositoryId: "github:999999" }), InvalidSnapshotRequest);
});

test("concurrent snapshots coalesce reads and real authors retain identities", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  const [first, second] = await Promise.all([load({ mode: "github" }), load({ mode: "github" })]);
  assert.equal(fake.count, 3);
  assert.deepEqual(first, second);
  assert.equal(first.source.mode, "github");
  assert.equal(first.source.status, "partial");
  assert.equal(first.work[0].pulls?.[0].authorPersonId, "named:harshal-more");
  assert.deepEqual(first.work[0].pulls?.[0].requestedReviewerPersonIds, ["named:mandar-patil"]);
  assert.equal(first.work[0].issues, null);
  assert.equal(first.people.find((person) => person.id === "github:120")?.homeRoomId, "commons");
  assert.ok(!first.people.some((person) => person.kind === "preview" || person.id === "github:900"));
  assert.ok(first.activity.every((event) => !event.fresh && event.source === "github"));
  assert.equal(first.repositories[0].assignment, "unknown");
  assert.equal(first.repositories[0].leadPersonId, null);
  await load({ mode: "github" });
  assert.equal(fake.count, 3);
});

test("expired work preserves data and rate-limit retry prevents more reads", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  const initial = await load({ mode: "github" });
  fake.advance(301000); fake.fail("rate");
  const stale = await load({ mode: "github" });
  assert.equal(stale.source.status, "stale");
  assert.equal(stale.work[0].status, "stale");
  assert.deepEqual(stale.work[0].pulls, initial.work[0].pulls);
  assert.equal(stale.source.fetchedAt, initial.source.fetchedAt);
  assert.ok(stale.source.retryAt);
  const count = fake.count;
  await load({ mode: "github" });
  assert.equal(fake.count, count);
  fake.advance(601000); fake.fail(null);
  const recovered = await load({ mode: "github" });
  assert.equal(recovered.source.status, "partial");
  assert.equal(recovered.source.retryAt, null);
  assert.equal(recovered.work[0].status, "ready");
});

test("work refresh advances board capture inside the catalog cache window", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  const initial = await load({ mode: "github" });
  fake.advance(360000);
  fake.mergeAt("2026-10-09T08:03:00Z");
  const refreshed = await load({ mode: "github" });
  assert.equal(initial.source.fetchedAt, "2026-10-09T08:00:00.000Z");
  assert.equal(refreshed.source.fetchedAt, "2026-10-09T08:06:00.000Z");
  assert.equal(fake.urls.filter((url) => url.includes("/orgs/")).length, 1);
  assert.equal(fake.count, 4);
  const board = deriveLeaderboard(refreshed, "month", new Date(refreshed.source.fetchedAt!));
  assert.equal(board.rows.find((row) => row.personId === "named:harshal-more")?.merged, 1);
  fake.advance(301000); fake.fail("network");
  const failedRefresh = await load({ mode: "github" });
  assert.equal(failedRefresh.source.status, "stale");
  assert.equal(failedRefresh.source.fetchedAt, refreshed.source.fetchedAt);
  assert.deepEqual(failedRefresh.work[0].pulls, refreshed.work[0].pulls);
});

test("cold GitHub failure stays genuine with unknown data", async () => {
  const fake = fakeGithub(); fake.fail("network");
  const load = createSnapshotLoader(fake);
  const snapshot = await load({ mode: "github" });
  assert.equal(snapshot.source.status, "unavailable");
  assert.equal(snapshot.source.mode, "github");
  assert.deepEqual(snapshot.repositories, []);
  assert.deepEqual(snapshot.work, []);
  assert.deepEqual(snapshot.activity, []);
  assert.ok(snapshot.people.every((person) => person.kind === "named"));
  await load({ mode: "github" });
  assert.equal(fake.count, 1);
});

test("unknown repository IDs never trigger an arbitrary repository fetch", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  await assert.rejects(load({ mode: "github", repositoryId: "github:123" }), InvalidSnapshotRequest);
  assert.equal(fake.count, 1);
  assert.ok(fake.urls.every((url) => url.startsWith("https://api.github.com/orgs/voss-labs/")));
});

test("pagination is bounded and disclosed for catalog and work", async () => {
  const fake = fakeGithub(); fake.paginate();
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(fake.count, 5);
  assert.equal(snapshot.catalogComplete, false);
  assert.equal(snapshot.work[0].status, "partial");
  assert.equal(snapshot.repositories.length, 1);
});

test("resource route returns no-store JSON and structured validation errors", async () => {
  const context = createSnapshotContext(createSnapshotLoader({ allowPreview: true }));
  const args = (url: string): Route.LoaderArgs => ({ request: new Request(url), url: new URL(url), context, params: {}, pattern: "/api/snapshot" });
  const good = await apiLoader(args("http://localhost/api/snapshot?mode=preview"));
  assert.equal(good.status, 200);
  assert.equal(good.headers.get("cache-control"), "no-store");
  assert.equal((await good.json<OfficeSnapshot>()).source.mode, "preview");
  const bad = await apiLoader(args("http://localhost/api/snapshot?mode=other"));
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { error: "Invalid snapshot mode." });
});
