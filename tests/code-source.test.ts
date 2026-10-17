import assert from "node:assert/strict";
import test from "node:test";
import { createGithubClient, GithubFailure } from "../app/data/github.server.ts";
import { createCodeReader } from "../app/data/github-code.server.ts";
import { createSnapshotLoader } from "../app/data/load-snapshot.server.ts";
import { createRoster } from "../app/data/roster.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import type { GraphqlRequest } from "../app/data/github-request.server.ts";
import { fakeGithub, fixtureToken, historyResponse, rawCommit, sha } from "./github-fixtures.ts";

const roster = createRoster();

test("default-branch capture attributes linked IDs, excludes merges, and retains unknown authors", async () => {
  const fake = fakeGithub();
  fake.setCommits([rawCommit(1), rawCommit(2, { databaseId: 500, login: "commit-only" }), rawCommit(3, null),
    rawCommit(4, { databaseId: 600, login: "automation[bot]" }), rawCommit(5, null, 2), rawCommit(6, null, 0)]);
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(snapshot.code?.[0].commits?.length, 5);
  assert.equal(snapshot.code?.[0].status, "ready");
  assert.equal(snapshot.code?.[0].commits?.find((entry) => entry.sha === sha(1))?.authorPersonId, "named:harshal-more");
  assert.equal(snapshot.code?.[0].commits?.find((entry) => entry.sha === sha(3))?.authorPersonId, null);
  const board = deriveLeaderboard(snapshot, "month", fake.now());
  assert.equal(board.rows.find((row) => row.personId === "github:500")?.merged, 0);
  assert.equal(board.rows.find((row) => row.personId === "github:500")?.additions, 25);
  assert.ok(!board.rows.some((row) => row.personId === "github:600"));
  assert.equal(board.codeCoverage.unattributedCommits, 2);
  assert.ok(snapshot.code?.[0].commits?.every((entry) => entry.committedAt === "2026-10-02T12:00:00Z"));
  assert.ok(fake.maxActive <= 3);
  const request = fake.requests.find((entry) => entry.method === "POST")!;
  const body = JSON.parse(String(request.body));
  assert.equal(new Headers(request.headers).get("authorization"), `Bearer ${fixtureToken}`);
  assert.deepEqual(body.variables, { name: "repo-0" });
  assert.match(body.query, /defaultBranchRef/);
  assert.match(body.query, /history\(first: 100, after: \$cursor\)/);
  assert.doesNotMatch(body.query, /email|avatar|since|until/);
  assert.ok(!JSON.stringify(snapshot).includes(fixtureToken));
});

test("duplicate commit records reject history rather than concealing a pagination fault", async () => {
  const fake = fakeGithub();
  fake.setCommits([rawCommit(1), rawCommit(1)]);
  const client = createGithubClient(fake);
  const repository = (await client.catalog()).repositories[0];
  await assert.rejects(client.code(repository, roster), GithubFailure);
  assert.equal(fake.urls.filter((url) => url.endsWith("/graphql")).length, 1);
});

test("code failures retain successful PRs and preserve unknown changed lines", async () => {
  for (const failure of ["history", "stats", "object", "errors"] as const) {
    const fake = fakeGithub(); fake.fail(failure);
    const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
    assert.equal(snapshot.work[0].status, "ready");
    assert.equal(snapshot.work[0].pulls?.length, 1);
    assert.equal(snapshot.source.status, "partial");
    const row = deriveLeaderboard(snapshot, "month", fake.now()).rows[0];
    assert.equal(row.merged, 1);
    assert.equal(row.additions, null);
    assert.equal(row.deletions, null);
    assert.equal(row.commits, failure === "stats" ? 1 : null);
    assert.equal(snapshot.code?.[0].status, failure === "stats" ? "partial" : "unavailable");
    assert.equal(!!snapshot.code?.[0].retryAt, failure !== "stats");
    assert.ok(!JSON.stringify(snapshot).includes("Private upstream error"));
  }
});

test("code TTL and single-flight avoid repeated history reads", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  await Promise.all([load({ mode: "github" }), load({ mode: "github" })]);
  assert.equal(fake.urls.filter((url) => url.endsWith("/graphql")).length, 1);
  fake.advance(360000);
  await load({ mode: "github" });
  assert.equal(fake.urls.filter((url) => url.endsWith("/graphql")).length, 1);
  fake.advance(541000);
  await Promise.all([load({ mode: "github" }), load({ mode: "github" })]);
  assert.equal(fake.urls.filter((url) => url.endsWith("/graphql")).length, 2);
});

test("failed code refresh preserves stale code independently and honors retry", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  const initial = await load({ mode: "github" });
  fake.advance(901000); fake.fail("rate");
  const stale = await load({ mode: "github" });
  assert.equal(stale.work[0].status, "ready");
  assert.equal(stale.code?.[0].status, "stale");
  assert.deepEqual(stale.code?.[0].commits, initial.code?.[0].commits);
  assert.equal(stale.code?.[0].fetchedAt, initial.code?.[0].fetchedAt);
  assert.ok(stale.code?.[0].retryAt);
  const count = fake.urls.length;
  await load({ mode: "github" });
  assert.equal(fake.urls.length, count);
  fake.advance(601000); fake.fail(null);
  const recovered = await load({ mode: "github" });
  assert.equal(recovered.code?.[0].status, "ready");
  assert.equal(recovered.code?.[0].retryAt, null);
});

test("GraphQL requires explicit authentication without consuming upstream requests", async () => {
  const fake = fakeGithub();
  const client = createGithubClient({ ...fake, token: undefined });
  const repository = (await client.catalog()).repositories[0];
  await assert.rejects(client.code(repository, roster), (error: unknown) => error instanceof GithubFailure && /configured token/.test(error.message));
  assert.equal(fake.urls.length, 1);
});

test("successful zero-remaining headers and GraphQL rate errors block subsequent reads", async () => {
  const fake = fakeGithub(); fake.remaining("0");
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(fake.urls.length, 1);
  assert.equal(snapshot.code?.[0].commits, null);
  assert.ok(snapshot.code?.[0].retryAt);
  const rate = fakeGithub();
  const client = createGithubClient(rate);
  const repository = (await client.catalog()).repositories[0];
  rate.fail("graphql-rate");
  await assert.rejects(client.code(repository, roster), GithubFailure);
  const reads = rate.urls.length;
  await assert.rejects(client.work(repository, roster), GithubFailure);
  assert.equal(rate.urls.length, reads);
  const exhausted = fakeGithub();
  const exhaustedClient = createGithubClient(exhausted);
  const publicRepository = (await exhaustedClient.catalog()).repositories[0];
  exhausted.remaining("0");
  assert.equal((await exhaustedClient.code(publicRepository, roster)).code.status, "ready");
  await assert.rejects(exhaustedClient.work(publicRepository, roster), GithubFailure);
  assert.equal(exhausted.urls.length, 2);
});

test("malformed nodes reject capture and identities never come from names or emails", async () => {
  const fake = fakeGithub();
  const unlinked = rawCommit(1, { databaseId: -1, login: "harshalmore31", name: "Harshal More", email: "ignored@example.org" });
  fake.setCommits([unlinked]);
  const client = createGithubClient(fake);
  const repository = (await client.catalog()).repositories[0];
  const result = await client.code(repository, roster);
  assert.equal(result.code.commits?.[0].authorPersonId, null);
  assert.deepEqual(result.people, []);
  for (const malformed of [{ ...rawCommit(2), oid: "not-a-sha" }, null, { ...rawCommit(3), parents: null }, { ...rawCommit(4), messageHeadline: undefined }]) {
    fake.setCommits([unlinked, malformed]);
    await assert.rejects(client.code(repository, roster), GithubFailure);
  }
});

test("empty branches are measured empty; inaccessible repositories and malformed pagination fail", async () => {
  const fake = fakeGithub();
  const client = createGithubClient(fake);
  const repository = (await client.catalog()).repositories[0];
  fake.fail("empty");
  const empty = await client.code(repository, roster);
  assert.deepEqual(empty.code.commits, []);
  assert.equal(empty.code.captureComplete, true);
  assert.equal(empty.code.status, "ready");
  fake.fail("missing");
  await assert.rejects(client.code(repository, roster), GithubFailure);
  const request: GraphqlRequest = async <T>() => {
    const response = historyResponse([]);
    response.data.repository.defaultBranchRef.target.history.pageInfo = { hasNextPage: true, endCursor: null };
    return response.data as T;
  };
  await assert.rejects(createCodeReader(request, fake.now)(repository, roster), GithubFailure);
});

test("measured zero remains zero and history beyond ten records remains available", async () => {
  const fake = fakeGithub();
  fake.setCommits([{ ...rawCommit(1), additions: 0, deletions: 0 }, ...Array.from({ length: 10 }, (_, i) => rawCommit(i + 2))]);
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(snapshot.code?.[0].commits?.length, 11);
  assert.equal(snapshot.code?.[0].commits?.[0].additions, 0);
  assert.equal(snapshot.code?.[0].commits?.[0].deletions, 0);
  assert.equal(snapshot.code?.[0].captureComplete, true);
  assert.equal(snapshot.code?.[0].retryAt, null);
});
