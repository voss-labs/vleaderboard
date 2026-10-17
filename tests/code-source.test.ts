import assert from "node:assert/strict";
import test from "node:test";
import { createGithubClient } from "../app/data/github.server.ts";
import { createCodeDetailBudget, createCodeReader } from "../app/data/github-code.server.ts";
import { createSnapshotLoader } from "../app/data/load-snapshot.server.ts";
import { createRoster } from "../app/data/roster.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import type { GithubRequest } from "../app/data/github.server.ts";

const roster = createRoster();
const sha = (number: number) => number.toString(16).padStart(40, "0");
const rawCommit = (number: number, author: unknown = { id: 86048671, login: "harshalmore31" }, parents = 1) => ({
  sha: sha(number), author, parents: Array.from({ length: parents }, (_, i) => ({ sha: sha(i + 10000) })),
  commit: { author: { name: "Harshal More", email: "ignored@example.org", date: "1999-01-01T00:00:00Z" },
    committer: { date: "2026-10-02T12:00:00Z" } },
});

function fakeGithub(repositoryCount = 1) {
  let clock = Date.parse("2026-10-09T08:00:00Z");
  let failure: "list" | "details" | "rate" | "object" | null = null;
  let next = false;
  let remaining: string | null = null;
  let commits = [rawCommit(1)];
  let active = 0;
  let maxActive = 0;
  const urls: string[] = [];
  const catalog = Array.from({ length: repositoryCount }, (_, i) => ({ id: i + 1000, name: `repo-${i}`,
    full_name: `voss-labs/repo-${i}`, private: false, owner: { login: "voss-labs" }, archived: false, fork: false,
    pushed_at: "2026-10-08T00:00:00Z" }));
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    active += 1; maxActive = Math.max(maxActive, active);
    await Promise.resolve();
    active -= 1;
    const list = url.includes("/commits?");
    const detail = url.includes("/commits/");
    if (list && failure === "list" || detail && failure === "details") throw new Error("Code network failure");
    if (list && failure === "rate") return new Response("", { status: 429, headers: { "retry-after": "600" } });
    const headers: Record<string, string> = {};
    if (list && next) headers.link = '<https://api.github.com/not-followed>; rel="next"';
    if (remaining !== null) {
      headers["x-ratelimit-remaining"] = remaining;
      headers["x-ratelimit-reset"] = String((clock + 3600000) / 1000);
    }
    if (url.includes("/orgs/")) return Response.json(catalog, { headers });
    if (list) return Response.json(commits, { headers });
    if (detail) return Response.json(failure === "object" ? [] : {
      sha: url.split("/").at(-1), stats: { additions: 25, deletions: 4 }, files: [{ additions: 999999 }],
    }, { headers });
    if (url.includes("/pulls?")) return Response.json([{
      number: 1, title: "Public PR", state: "closed", user: { id: 86048671, login: "harshalmore31" },
      created_at: "2026-10-02T00:00:00Z", updated_at: "2026-10-08T00:00:00Z", merged_at: "2026-10-08T00:00:00Z",
    }], { headers });
    return Response.json([], { headers });
  };
  return { fetcher, now: () => new Date(clock), codeDetailBudget: createCodeDetailBudget(), urls,
    get maxActive() { return maxActive; },
    advance(milliseconds: number) { clock += milliseconds; },
    fail(value: typeof failure) { failure = value; },
    setCommits(value: typeof commits) { commits = value; },
    paginate() { next = true; },
    remaining(value: string) { remaining = value; },
  };
}

test("default-branch capture attributes IDs, excludes merges, and retains unknown authors", async () => {
  const fake = fakeGithub();
  fake.setCommits([rawCommit(1), rawCommit(2, { id: 500, login: "commit-only" }), rawCommit(3, null),
    rawCommit(4, { id: 600, login: "automation[bot]", type: "Bot" }), rawCommit(5, undefined, 2), rawCommit(6, null, 0)]);
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(snapshot.code?.[0].commits?.length, 5);
  assert.equal(snapshot.code?.[0].status, "ready");
  assert.equal(snapshot.code?.[0].commits?.find((entry) => entry.sha === sha(1))?.authorPersonId, "named:harshal-more");
  assert.equal(snapshot.code?.[0].commits?.find((entry) => entry.sha === sha(3))?.authorPersonId, null);
  assert.ok(!fake.urls.some((url) => url.endsWith(sha(5))));
  const board = deriveLeaderboard(snapshot, "month", fake.now());
  assert.equal(board.rows.find((row) => row.personId === "github:500")?.merged, 0);
  assert.equal(board.rows.find((row) => row.personId === "github:500")?.additions, 25);
  assert.ok(!board.rows.some((row) => row.personId === "github:600"));
  assert.equal(board.codeCoverage.unattributedCommits, 2);
  assert.ok(snapshot.code?.[0].commits?.every((entry) => entry.committedAt === "2026-10-02T12:00:00Z"));
  assert.ok(fake.maxActive <= 3);
});

test("bounded partial list and SHA dedup use top-level detail stats", async () => {
  const fake = fakeGithub();
  fake.paginate();
  fake.setCommits([rawCommit(1), rawCommit(1), ...Array.from({ length: 10 }, (_, i) => rawCommit(i + 2))]);
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  const code = snapshot.code![0];
  assert.equal(code.captureComplete, false);
  assert.equal(code.status, "partial");
  assert.equal(code.commits?.length, 9);
  assert.equal(fake.urls.filter((url) => url.includes("/commits/")).length, 9);
  assert.ok(code.commits?.every((entry) => entry.additions === 25 && entry.deletions === 4));
  assert.ok(!fake.urls.some((url) => url.includes("not-followed")));
});

test("code failures cannot erase successful PRs or masquerade as zero changed lines", async () => {
  for (const failure of ["list", "details", "object"] as const) {
    const fake = fakeGithub(); fake.fail(failure);
    const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
    assert.equal(snapshot.work[0].status, "ready");
    assert.equal(snapshot.work[0].pulls?.length, 1);
    assert.equal(snapshot.source.status, "partial");
    const row = deriveLeaderboard(snapshot, "month", fake.now()).rows[0];
    assert.equal(row.merged, 1);
    assert.equal(row.additions, null);
    assert.equal(row.deletions, null);
    assert.equal(row.commits, failure === "list" ? null : 1);
    assert.equal(snapshot.code?.[0].status, failure === "list" ? "unavailable" : "partial");
  }
});

test("code TTL, immutable detail cache and single-flight avoid repeated upstream reads", async () => {
  const fake = fakeGithub();
  const load = createSnapshotLoader(fake);
  await Promise.all([load({ mode: "github" }), load({ mode: "github" })]);
  assert.equal(fake.urls.filter((url) => url.includes("/commits?")).length, 1);
  assert.equal(fake.urls.filter((url) => url.includes("/commits/")).length, 1);
  fake.advance(360000);
  await load({ mode: "github" });
  assert.equal(fake.urls.filter((url) => url.includes("/commits?")).length, 1);
  fake.advance(541000);
  await Promise.all([load({ mode: "github" }), load({ mode: "github" })]);
  assert.equal(fake.urls.filter((url) => url.includes("/commits?")).length, 2);
  assert.equal(fake.urls.filter((url) => url.includes("/commits/")).length, 1);
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

test("the shared rolling budget caps new details at 20/hour and reuses cached stats", async () => {
  const fake = fakeGithub(3);
  const client = createGithubClient(fake);
  const repositories = (await client.catalog()).repositories;
  for (let repository = 0; repository < 3; repository += 1) {
    fake.setCommits(Array.from({ length: 10 }, (_, i) => rawCommit(repository * 10 + i + 1)));
    const { code } = await client.code(repositories[repository], roster);
    assert.equal(code.status, repository === 2 ? "partial" : "ready");
    if (repository === 2) assert.ok(code.commits!.every((entry) => entry.additions === null) && code.retryAt);
  }
  assert.equal(fake.urls.filter((url) => url.includes("/commits/")).length, 20);
  fake.advance(3600001);
  fake.setCommits(Array.from({ length: 10 }, (_, i) => rawCommit(i + 21)));
  const recovered = await client.code(repositories[2], roster);
  assert.equal(recovered.code.status, "ready");
  assert.equal(fake.urls.filter((url) => url.includes("/commits/")).length, 30);
});

test("successful zero-remaining headers stop subsequent reads until reset", async () => {
  const fake = fakeGithub(); fake.remaining("0");
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(fake.urls.length, 1);
  assert.equal(snapshot.code?.[0].commits, null);
  assert.ok(snapshot.code?.[0].retryAt);
});

test("malformed list entries are disclosed as partial rather than attributed by names", async () => {
  const fake = fakeGithub();
  fake.setCommits([rawCommit(1, { id: -1, login: "harshalmore31" }), { ...rawCommit(2), sha: "not-a-sha" }]);
  const client = createGithubClient(fake);
  const repository = (await client.catalog()).repositories[0];
  const result = await client.code(repository, roster);
  assert.equal(result.code.status, "partial");
  assert.equal(result.code.captureComplete, false);
  assert.equal(result.code.commits?.[0].authorPersonId, null);
  assert.deepEqual(result.people, []);
});

test("immutable detail cache coalesces directly and evicts beyond 1000 SHAs", async () => {
  const fake = fakeGithub();
  const repository = (await createGithubClient(fake).catalog()).repositories[0];
  let page = [rawCommit(1)];
  let detailReads = 0;
  const request: GithubRequest = async <T>(path: string) => {
    await Promise.resolve();
    if (path.includes("/commits?")) return { data: page as T, next: false };
    detailReads += 1;
    return { data: { sha: path.split("/").at(-1), stats: { additions: 0, deletions: 0 } } as T, next: false };
  };
  const read = createCodeReader(request, fake.now, { limit: 20, take: () => null });
  await Promise.all([read(repository, roster), read(repository, roster)]);
  assert.equal(detailReads, 1);
  for (let start = 2; start <= 1001; start += 10) {
    page = Array.from({ length: 10 }, (_, i) => rawCommit(start + i));
    await read(repository, roster);
  }
  const before = detailReads;
  page = [rawCommit(1)];
  await read(repository, roster);
  assert.equal(detailReads, before + 1);
});
