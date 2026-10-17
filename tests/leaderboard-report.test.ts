import assert from "node:assert/strict";
import test from "node:test";
import { createContributorReport } from "../app/data/contributor-report.ts";
import type { CodeCommit, OfficeSnapshot, Person, Repository, WorkItem } from "../app/data/types.ts";
import { action, loader } from "../app/routes/api.leaderboard.ts";
import { createSnapshotContext } from "../app/snapshot-context.server.ts";

type ContributorReport = ReturnType<typeof createContributorReport>;

const capturedAt = "2026-10-09T08:00:00.000Z";
const eventAt = "2026-10-02T08:00:00.000Z";

function person(id: string, name: string, githubId: number | null): Person {
  return {
    id, name, role: "Contributor", kind: "github", homeRoomId: "commons", table: null,
    repositoryIds: [], assignment: "unknown", palette: 0,
    github: githubId === null ? null : { id: githubId, login: name.toLowerCase(), url: `https://github.com/${name.toLowerCase()}` },
  };
}

function repository(id: number, name: string): Repository {
  return {
    id: `github:${id}`, githubId: id, name, fullName: `voss-labs/${name}`, description: null,
    url: `https://github.com/voss-labs/${name}`, language: null, archived: false, fork: false,
    pushedAt: capturedAt, leadPersonId: null, memberPersonIds: [], assignment: "unknown",
  };
}

function fixture(): OfficeSnapshot {
  const repositories = [repository(101, "one"), repository(102, "two")];
  const people = [person("github:1", "Alice", 1), person("github:2", "Bob", 2),
    person("named:casey", "Casey", null), { ...person("preview:1", "Preview", null), kind: "preview" as const },
    person("github:4", "Robot", 4)];
  return {
    version: 1, source: { mode: "github", status: "partial", fetchedAt: capturedAt, message: "Captured public history.", retryAt: null },
    repositories, people, mainRepositoryIds: [], roomSelectionBasis: "", catalogComplete: true, activity: [],
    work: repositories.map((entry) => ({ repositoryId: entry.id, status: "ready", fetchedAt: capturedAt,
      pulls: [], issues: null, message: "Captured latest 100 PRs." })),
    code: repositories.map((entry) => ({ repositoryId: entry.id, status: "partial", fetchedAt: capturedAt,
      commits: [], captureComplete: false, message: "Captured latest 10 records.", retryAt: null, detailReadLimit: 20 })),
  };
}

function pull(snapshot: OfficeSnapshot, repo: number, author: number, number: number, at = eventAt): WorkItem {
  const repositoryId = snapshot.repositories[repo].id;
  return {
    id: `${repositoryId}:pr:${number}`, repositoryId, number, title: "Captured work", url: "https://github.com/pull",
    kind: "pull-request", state: "merged", authorPersonId: snapshot.people[author].id,
    assigneePersonIds: [], requestedReviewerPersonIds: [], createdAt: at, updatedAt: at, mergedAt: at, isBot: false,
  };
}

function commit(snapshot: OfficeSnapshot, repo: number, author: number | null, number: number, at = eventAt): CodeCommit {
  const repositoryId = snapshot.repositories[repo].id;
  const sha = number.toString(16).padStart(40, "0");
  return { id: `${repositoryId}:commit:${sha}`, repositoryId, sha, url: "https://github.com/commit",
    authorPersonId: author === null ? null : snapshot.people[author].id, committedAt: at,
    additions: 10, deletions: 2, isBot: false };
}

function requestArgs(snapshot: OfficeSnapshot, path = "", method = "GET", onRead = () => {}) {
  const url = new URL(`https://example.com/api/leaderboard${path}`);
  return {
    request: new Request(url, { method }),
    url,
    context: createSnapshotContext(async (request) => {
      onRead();
      assert.deepEqual(request, { mode: "github" });
      return snapshot;
    }),
    params: {},
    pattern: "/api/leaderboard",
  };
}

test("report preserves competition ranks, linked identities and per-repository captured subtotals", () => {
  const snapshot = fixture();
  const first = pull(snapshot, 0, 0, 1);
  snapshot.work[0].pulls = [first, first, pull(snapshot, 0, 0, 2), pull(snapshot, 0, 1, 3),
    pull(snapshot, 0, 2, 4), pull(snapshot, 0, 3, 5), { ...pull(snapshot, 0, 4, 6), isBot: true }];
  snapshot.work[1].pulls = [pull(snapshot, 1, 1, 7)];
  snapshot.code![0].commits = [commit(snapshot, 0, 0, 1),
    { ...commit(snapshot, 0, 0, 2), additions: null, deletions: null },
    { ...commit(snapshot, 0, 1, 3), additions: 0, deletions: 0 },
    commit(snapshot, 0, 2, 4), commit(snapshot, 0, null, 5),
    { ...commit(snapshot, 0, 4, 6), isBot: true }, commit(snapshot, 0, 3, 7)];
  snapshot.code![1].commits = [commit(snapshot, 1, 0, 8)];
  const before = structuredClone(snapshot);
  const report = createContributorReport(snapshot, "month");
  assert.deepEqual(report.contributors.map((entry) => [entry.name, entry.rank, entry.merged, entry.opened]),
    [["Alice", 1, 2, 2], ["Bob", 1, 2, 2], ["Casey", 3, 1, 1]]);
  const [alice, bob, casey] = report.contributors;
  assert.equal(alice.login, "alice");
  assert.equal(alice.profileUrl, "https://github.com/alice");
  assert.equal(alice.avatarUrl, "https://avatars.githubusercontent.com/u/1?s=80&v=4");
  assert.deepEqual([casey.login, casey.profileUrl, casey.avatarUrl], [null, null, null]);
  assert.deepEqual([alice.capturedCommits, alice.additions, alice.deletions, alice.codeStatus], [3, null, null, "partial"]);
  assert.deepEqual([bob.capturedCommits, bob.additions, bob.deletions], [1, 0, 0]);
  assert.deepEqual(alice.repositories.map((entry) => [entry.fullName, entry.merged, entry.capturedCommits, entry.additions]),
    [["voss-labs/one", 2, 2, null], ["voss-labs/two", 0, 1, 10]]);
  assert.equal(report.coverage.code.capturedCommits, 6);
  assert.equal(report.coverage.code.unattributedCommits, 1);
  assert.equal(report.coverage.code.missingStats, 1);
  assert.equal(report.coverage.complete, false);
  assert.deepEqual(report.coverage.pagination, { pullRequestPageSize: 100, commitPageSize: 100 });
  assert.deepEqual(report.coverage.history, { pullRequests: false, commits: false, complete: false });
  assert.equal("limits" in report.coverage, false);
  assert.match(report.coverage.message, /Partial saved history/);
  for (const contributor of report.contributors) {
    for (const metric of ["merged", "opened", "capturedCommits"] as const) {
      assert.equal(contributor[metric], contributor.repositories.reduce((sum, entry) => sum + (entry[metric] ?? 0), 0));
    }
  }
  assert.deepEqual(snapshot, before);
});

test("unavailable measurements stay null in the report and each repository scope", () => {
  const snapshot = fixture();
  snapshot.work[0].pulls = [pull(snapshot, 0, 0, 1)];
  snapshot.code = [];
  const uncapturedCode = createContributorReport(snapshot, "month").contributors[0];
  assert.deepEqual([uncapturedCode.capturedCommits, uncapturedCode.additions, uncapturedCode.deletions], [null, null, null]);
  assert.equal(uncapturedCode.repositories[0].capturedCommits, null);
  snapshot.work.forEach((entry) => { entry.pulls = null; entry.status = "unavailable"; });
  snapshot.code = [{ repositoryId: snapshot.repositories[1].id, status: "partial", fetchedAt: capturedAt,
    commits: [commit(snapshot, 1, 2, 1)], captureComplete: false, message: "Captured records.", retryAt: null, detailReadLimit: 20 }];
  const codeOnly = createContributorReport(snapshot, "month").contributors[0];
  assert.deepEqual([codeOnly.merged, codeOnly.opened, codeOnly.capturedCommits], [null, null, 1]);
  assert.equal(codeOnly.repositories.length, 1);
  assert.equal(codeOnly.repositories[0].id, snapshot.repositories[1].id);
  assert.equal(codeOnly.repositories[0].merged, null);
  assert.equal(codeOnly.avatarUrl, null);
});

test("all periods use the captured source time and event-specific boundaries", () => {
  const snapshot = fixture();
  const times = ["2026-10-01T00:00:00Z", "2026-09-30T23:59:59.999Z",
    "2026-09-09T08:00:00Z", "2026-09-09T07:59:59.999Z", capturedAt];
  snapshot.work[0].pulls = times.map((time, index) => pull(snapshot, 0, 0, index + 1, time));
  snapshot.work[0].pulls[0].createdAt = "2026-08-01T00:00:00Z";
  snapshot.code![0].commits = times.map((time, index) => commit(snapshot, 0, 0, index + 1, time));
  const reports = (["month", "30d", "all"] as const).map((period) => createContributorReport(snapshot, period));
  assert.deepEqual(reports.map((entry) => [entry.contributors[0].merged, entry.contributors[0].opened, entry.contributors[0].capturedCommits]),
    [[1, 0, 1], [3, 2, 3], [4, 4, 4]]);
  assert.equal(reports[0].from, "2026-10-01T00:00:00.000Z");
  assert.equal(reports[1].from, "2026-09-09T08:00:00.000Z");
  assert.equal(reports[2].from, null);
  assert.ok(reports.every((entry) => entry.to === capturedAt));
});

test("route validates methods and periods before reading storage or fetching upstream", async (t) => {
  let reads = 0;
  let upstream = 0;
  t.mock.method(globalThis, "fetch", async () => { upstream += 1; throw new Error("Unexpected upstream request."); });
  for (const path of ["?period=year", "?period=", "?period=MONTH", "?period=all&period=month", "?mode=preview", "?mode=invalid"]) {
    const response = await loader(requestArgs(fixture(), path, "GET", () => { reads += 1; }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await action(requestArgs(fixture(), "", method, () => { reads += 1; }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "GET, HEAD");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(reads, 0);
  assert.equal(upstream, 0);
});

test("GET and HEAD read the injected cached snapshot without upstream work", async (t) => {
  let reads = 0;
  let upstream = 0;
  t.mock.method(globalThis, "fetch", async () => { upstream += 1; throw new Error("Unexpected upstream request."); });
  const snapshot = fixture();
  snapshot.work[0].pulls = [pull(snapshot, 0, 0, 1)];
  const response = await loader(requestArgs(snapshot, "", "GET", () => { reads += 1; }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const report = await response.json() as ContributorReport;
  assert.equal(report.period, "all");
  assert.equal(report.source.mode, "github");
  assert.equal(report.contributors[0].id, "github:1");
  for (const period of ["30d", "all"]) {
    const result = await loader(requestArgs(snapshot, `?period=${period}`, "GET", () => { reads += 1; }));
    assert.equal((await result.json() as ContributorReport).period, period);
  }
  const head = await loader(requestArgs(snapshot, "?period=all", "HEAD", () => { reads += 1; }));
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("Cache-Control"), "no-store");
  assert.equal(head.headers.get("Content-Type"), response.headers.get("Content-Type"));
  assert.equal(await head.text(), "");
  assert.equal(reads, 4);
  assert.equal(upstream, 0);
});

test("unprimed snapshots return an honest empty report with a stable absent window", async () => {
  const snapshot = fixture();
  snapshot.source = { mode: "github", status: "unavailable", fetchedAt: null, message: "No snapshot captured yet.", retryAt: null };
  snapshot.people = [];
  snapshot.repositories = [];
  snapshot.work = [];
  snapshot.code = [];
  snapshot.catalogComplete = false;
  const first = await loader(requestArgs(snapshot));
  const second = await loader(requestArgs(snapshot));
  assert.equal(first.status, 200);
  const report = await first.json() as ContributorReport;
  assert.deepEqual(report, await second.json());
  assert.equal(report.source.status, "unavailable");
  assert.deepEqual([report.from, report.to], [null, null]);
  assert.deepEqual(report.contributors, []);
  assert.equal(report.coverage.repositoryCount, 0);
  assert.equal(report.coverage.code.status, "unavailable");
});

test("preview snapshots and reader failures never expose fixture reports or exception details", async () => {
  const preview = fixture();
  preview.source.mode = "preview";
  const response = await loader(requestArgs(preview));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "GitHub snapshot is unavailable." });
  const args = requestArgs(fixture());
  args.context = createSnapshotContext(async () => { throw new Error("secret must not escape"); });
  const failed = await loader(args);
  assert.equal(failed.status, 500);
  assert.equal(failed.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await failed.json(), { error: "Leaderboard could not be loaded." });
});
