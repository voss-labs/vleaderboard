import assert from "node:assert/strict";
import test from "node:test";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import type { CodeCommit, OfficeSnapshot } from "../app/data/types.ts";

const now = new Date("2026-10-09T08:00:00Z");

function fixture(): OfficeSnapshot {
  const snapshot = createPreviewSnapshot(now);
  snapshot.repositories = snapshot.repositories.slice(0, 1);
  snapshot.work = snapshot.work.slice(0, 1);
  snapshot.work[0].pulls = [];
  snapshot.code = snapshot.code!.slice(0, 1);
  snapshot.code[0].commits = [];
  snapshot.people = snapshot.people.slice(0, 3);
  return snapshot;
}

function commit(snapshot: OfficeSnapshot, number: number, author: number | null, committedAt: string): CodeCommit {
  const repositoryId = snapshot.repositories[0].id;
  const sha = number.toString(16).padStart(40, "0");
  return { id: `${repositoryId}:commit:${sha}`, repositoryId, sha, url: "",
    authorPersonId: author === null ? null : snapshot.people[author].id,
    committedAt, additions: 10, deletions: 2, isBot: false };
}

test("commit periods use inclusive UTC starts and exclusive capture, by committed date", () => {
  const snapshot = fixture();
  snapshot.code![0].commits = [
    commit(snapshot, 1, 0, "2026-10-01T00:00:00Z"),
    commit(snapshot, 2, 0, "2026-09-30T23:59:59.999Z"),
    commit(snapshot, 3, 0, "2026-09-09T08:00:00Z"),
    commit(snapshot, 4, 0, "2026-09-09T07:59:59.999Z"),
    commit(snapshot, 5, 0, now.toISOString()),
  ];
  const counts = (["month", "30d", "all"] as const).map((period) => deriveLeaderboard(snapshot, period, now).rows[0]);
  assert.deepEqual(counts.map((row) => [row.commits, row.additions, row.deletions]), [[1, 10, 2], [3, 30, 6], [4, 40, 8]]);
  assert.ok(counts.every((row) => row.merged === 0 && row.opened === 0));
});

test("SHA dedup, bots and unknown authors cannot distort contributor ranks", () => {
  const snapshot = fixture();
  const first = commit(snapshot, 1, 0, "2026-10-02T00:00:00Z");
  snapshot.code![0].commits = [first, { ...first, id: "alternate-id" },
    commit(snapshot, 2, 1, first.committedAt), { ...commit(snapshot, 3, 2, first.committedAt), isBot: true },
    commit(snapshot, 4, null, first.committedAt)];
  const before = structuredClone(snapshot);
  const board = deriveLeaderboard(snapshot, "month", now);
  assert.deepEqual(board.rows.map((row) => [row.rank, row.commits]), [[1, 1], [1, 1]]);
  assert.equal(board.codeCoverage.capturedCommits, 3);
  assert.equal(board.codeCoverage.unattributedCommits, 1);
  assert.deepEqual(snapshot, before);
});

test("missing details remain unknown, measured empty commits remain zero", () => {
  const snapshot = fixture();
  const first = commit(snapshot, 1, 0, "2026-10-02T00:00:00Z");
  snapshot.code![0].status = "partial";
  snapshot.code![0].commits = [first, { ...commit(snapshot, 2, 0, first.committedAt), additions: null, deletions: null },
    { ...commit(snapshot, 3, 1, first.committedAt), additions: 0, deletions: 0 }];
  const board = deriveLeaderboard(snapshot, "month", now);
  const unknown = board.rows.find((row) => row.personId === snapshot.people[0].id)!;
  const empty = board.rows.find((row) => row.personId === snapshot.people[1].id)!;
  assert.deepEqual([unknown.commits, unknown.additions, unknown.deletions, unknown.codeStatus], [2, null, null, "partial"]);
  assert.deepEqual([empty.commits, empty.additions, empty.deletions], [1, 0, 0]);
  assert.equal(board.codeCoverage.missingStats, 1);
  assert.equal(board.codeCoverage.complete, false);
});

test("uncaptured code supplies null metrics, and genuine mode excludes preview identities", () => {
  const snapshot = fixture();
  snapshot.work[0].pulls = [{ id: "pr", repositoryId: snapshot.repositories[0].id, number: 1, title: "PR", url: "",
    kind: "pull-request", state: "merged", authorPersonId: snapshot.people[0].id, assigneePersonIds: [],
    requestedReviewerPersonIds: [], createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z",
    mergedAt: "2026-10-02T00:00:00Z", isBot: false }];
  snapshot.code = [];
  const board = deriveLeaderboard(snapshot, "month", now);
  assert.equal(board.rows[0].commits, null);
  assert.equal(board.rows[0].additions, null);
  assert.equal(board.codeCoverage.status, "unavailable");
  const genuine = createPreviewSnapshot(now);
  genuine.source.mode = "github";
  genuine.code = genuine.code!.filter((repo) => genuine.mainRepositoryIds.includes(repo.repositoryId));
  genuine.work = [];
  assert.deepEqual(deriveLeaderboard(genuine, "all", now).rows, []);
});

test("preview code fixtures are fixed, labeled, link-free, and differ across periods", () => {
  const snapshot = createPreviewSnapshot(now);
  const later = createPreviewSnapshot(new Date("2026-10-10T08:00:00Z"));
  assert.deepEqual(snapshot.code?.map((repo) => repo.commits), later.code?.map((repo) => repo.commits));
  assert.ok(snapshot.code!.every((repo) => repo.message.includes("Simulated") && repo.commits!.every((entry) => entry.url === "")));
  const counts = (["month", "30d", "all"] as const).map((period) => deriveLeaderboard(snapshot, period, now).codeCoverage.capturedCommits);
  assert.ok(counts[0] < counts[1] && counts[1] < counts[2]);
});
