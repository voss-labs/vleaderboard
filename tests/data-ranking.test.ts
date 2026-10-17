import assert from "node:assert/strict";
import test from "node:test";
import { deriveLeaderboard, selectMainRepositories } from "../app/data/derive.ts";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import type { OfficeSnapshot, WorkItem } from "../app/data/types.ts";

const now = new Date("2026-10-09T08:00:00Z");

function rankingFixture(): OfficeSnapshot {
  const snapshot = createPreviewSnapshot(now);
  snapshot.people = snapshot.people.slice(0, 3);
  snapshot.work = snapshot.work.slice(0, 1);
  snapshot.work[0].pulls = [];
  snapshot.code = [];
  return snapshot;
}

function pull(snapshot: OfficeSnapshot, number: number, person: number, mergedAt: string): WorkItem {
  return {
    id: `${snapshot.work[0].repositoryId}:pr:${number}`, repositoryId: snapshot.work[0].repositoryId,
    number, title: "A captured pull request", url: "", kind: "pull-request", state: "merged",
    authorPersonId: snapshot.people[person].id, assigneePersonIds: [], requestedReviewerPersonIds: [],
    createdAt: mergedAt, updatedAt: mergedAt, mergedAt, isBot: false,
  };
}

test("preview has the full catalog, confirmed hierarchy and four synthetic teams", () => {
  const snapshot = createPreviewSnapshot(now);
  assert.equal(snapshot.repositories.length, 12);
  assert.deepEqual(snapshot.mainRepositoryIds.map((id) => snapshot.repositories.find((repo) => repo.id === id)?.name),
    ["vroom", "vprep", "verp", "vauth"]);
  assert.equal(snapshot.people.filter((person) => person.kind === "named").length, 12);
  assert.equal(snapshot.people.filter((person) => person.kind === "preview").length, 24);
  assert.equal(snapshot.people.find((person) => person.name === "Kanchan Chavan")?.homeRoomId, "co-maintainer");
  assert.deepEqual(snapshot.people.filter((person) => person.homeRoomId === "devrel").map((person) => person.name),
    ["Himanshu Choyal", "Parth Indulkar"]);
  assert.ok(snapshot.activity.every((event) => event.source === "preview" && !event.fresh && event.url === null));
  assert.ok(snapshot.work.every((repo) => repo.pulls?.every((item) => !item.url)));
  const later = createPreviewSnapshot(new Date("2026-10-10T08:00:00Z"));
  assert.deepEqual(snapshot.work.map((repo) => repo.pulls), later.work.map((repo) => repo.pulls));
});

test("room ordering excludes forks and archives with deterministic ties", () => {
  const repositories = createPreviewSnapshot(now).repositories.slice(0, 6);
  repositories.forEach((repository) => { repository.pushedAt = "2026-10-01T00:00:00Z"; });
  repositories[0].archived = true;
  repositories[1].fork = true;
  const original = structuredClone(repositories);
  assert.deepEqual(selectMainRepositories(repositories).map((id) => repositories.find((repo) => repo.id === id)?.name),
    ["vauth", "vboard", "vask", "vosslabs.org"].sort((a, b) => `voss-labs/${a}`.localeCompare(`voss-labs/${b}`, "en")));
  assert.deepEqual(repositories, original);
});

test("competition ranks preserve ties, exclude duplicate PRs and bots", () => {
  const snapshot = rankingFixture();
  const first = pull(snapshot, 1, 0, "2026-10-02T08:00:00Z");
  const bot = { ...pull(snapshot, 99, 2, "2026-10-02T08:00:00Z"), isBot: true };
  snapshot.work[0].pulls = [first, first, pull(snapshot, 2, 0, first.mergedAt!),
    pull(snapshot, 3, 1, first.mergedAt!), pull(snapshot, 4, 1, first.mergedAt!),
    pull(snapshot, 5, 2, first.mergedAt!), bot];
  const before = structuredClone(snapshot);
  const board = deriveLeaderboard(snapshot, "month", now);
  assert.deepEqual(board.rows.map((row) => [row.rank, row.merged, row.opened]), [[1, 2, 2], [1, 2, 2], [3, 1, 1]]);
  assert.ok(board.rows.every((row) => row.reviews === null));
  assert.deepEqual(snapshot, before);
});

test("UTC month and rolling 30 days are inclusive at start and exclusive at capture", () => {
  const snapshot = rankingFixture();
  snapshot.work[0].pulls = [
    pull(snapshot, 1, 0, "2026-10-01T00:00:00Z"),
    pull(snapshot, 2, 0, "2026-09-30T23:59:59.999Z"),
    pull(snapshot, 3, 0, "2026-09-09T08:00:00Z"),
    pull(snapshot, 4, 0, "2026-09-09T07:59:59.999Z"),
    pull(snapshot, 5, 0, now.toISOString()),
  ];
  assert.equal(deriveLeaderboard(snapshot, "month", now).rows[0].merged, 1);
  assert.equal(deriveLeaderboard(snapshot, "30d", now).rows[0].merged, 3);
  assert.equal(deriveLeaderboard(snapshot, "all", now).rows[0].merged, 4);
  assert.equal(deriveLeaderboard(snapshot, "month", now).from, "2026-10-01T00:00:00.000Z");
});

test("unknown work contributes no zero rows and genuine mode excludes preview people", () => {
  const snapshot = createPreviewSnapshot(now);
  snapshot.source.mode = "github";
  snapshot.code = snapshot.code?.filter((repo) => snapshot.mainRepositoryIds.includes(repo.repositoryId));
  snapshot.work = snapshot.work.filter((repo) => snapshot.mainRepositoryIds.includes(repo.repositoryId));
  assert.deepEqual(deriveLeaderboard(snapshot, "all", now).rows, []);
  snapshot.work.forEach((repo) => { repo.pulls = null; repo.issues = null; repo.status = "unavailable"; });
  const board = deriveLeaderboard(snapshot, "all", now);
  assert.deepEqual(board.coveredRepositoryIds, []);
  assert.equal(board.complete, false);
});

test("preview periods produce different counts and factual coverage labels", () => {
  const snapshot = createPreviewSnapshot(now);
  const sums = (["month", "30d", "all"] as const).map((period) =>
    deriveLeaderboard(snapshot, period, now).rows.reduce((sum, row) => sum + row.merged, 0));
  assert.ok(sums[0] < sums[1] && sums[1] < sums[2]);
  assert.equal(deriveLeaderboard(snapshot, "all", now).complete, true);
});
