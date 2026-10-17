import assert from "node:assert/strict";
import test from "node:test";
import { contributionDate, selectContributionHistory } from "../app/data/contribution-history.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import type { CodeCommit, OfficeSnapshot, WorkItem } from "../app/data/types.ts";

const captured = new Date("2026-10-17T12:00:00Z");
const historicalSha = "2189670e140eefffa8041e53de47655d8669059f";

function fixture(): OfficeSnapshot {
  const snapshot = createPreviewSnapshot(captured);
  const repository = snapshot.repositories.find((item) => item.name === "vroom")!;
  snapshot.repositories = [repository];
  snapshot.mainRepositoryIds = [repository.id];
  snapshot.work = snapshot.work.filter((item) => item.repositoryId === repository.id);
  snapshot.work[0].pulls = [];
  snapshot.work[0].captureComplete = true;
  snapshot.code = snapshot.code!.filter((item) => item.repositoryId === repository.id);
  snapshot.code[0].commits = [];
  snapshot.people = [{ ...snapshot.people[0], id: "github:149477150", name: "Parth", kind: "github",
    github: { id: 149477150, login: "fixture-parth", url: "https://github.com/fixture-parth" } },
    { ...snapshot.people[1], id: "github:2", kind: "github" }];
  snapshot.activity = [];
  snapshot.source.mode = "github";
  return snapshot;
}

function commit(snapshot: OfficeSnapshot, number: number, date = "2026-10-16T12:00:00Z"): CodeCommit {
  const repository = snapshot.repositories[0];
  const sha = number.toString(16).padStart(40, "0");
  return { id: `${repository.id}:commit:${sha}`, repositoryId: repository.id, sha,
    url: `${repository.url}/commit/${sha}`, authorPersonId: snapshot.people[0].id, committedAt: date,
    messageHeadline: `Captured commit ${number}`, additions: 1, deletions: 0, isBot: false };
}

function pull(snapshot: OfficeSnapshot, number: number, date = "2026-10-16T12:00:00Z"): WorkItem {
  const repository = snapshot.repositories[0];
  return { id: `${repository.id}:pr:${number}`, repositoryId: repository.id, number,
    title: `Captured pull request ${number}`, url: `${repository.url}/pull/${number}`, kind: "pull-request",
    state: "open", authorPersonId: snapshot.people[0].id, assigneePersonIds: [], requestedReviewerPersonIds: [],
    createdAt: date, updatedAt: date, mergedAt: null, closedAt: null, isBot: false };
}

function selected(snapshot: OfficeSnapshot, period: "all" | "month" | "30d" = "all") {
  const board = deriveLeaderboard(snapshot, period, captured);
  return { board, history: selectContributionHistory(snapshot, snapshot.people[0].id, snapshot.repositories[0].id, board) };
}

test("earlier linked October commit remains inspectable beyond ten recent records without changing merged rank", () => {
  const snapshot = fixture();
  const historical = { ...commit(snapshot, 999, "2026-10-02T17:54:21Z"), sha: historicalSha,
    id: `${snapshot.repositories[0].id}:commit:${historicalSha}`,
    url: `${snapshot.repositories[0].url}/commit/${historicalSha}`, additions: 744, deletions: 213 };
  snapshot.code![0].commits = [...Array.from({ length: 14 }, (_, index) => ({ ...commit(snapshot, index + 1),
    authorPersonId: snapshot.people[1].id })), historical];
  snapshot.work[0].pulls = [pull(snapshot, 73), pull(snapshot, 64),
    { ...pull(snapshot, 63), state: "closed", closedAt: "2026-10-16T15:00:00Z" }];
  for (const period of ["all", "month"] as const) {
    const { board, history } = selected(snapshot, period);
    const row = board.rows.find((item) => item.personId === snapshot.people[0].id)!;
    assert.deepEqual([row.commits, row.additions, row.deletions, row.opened, row.merged], [1, 744, 213, 3, 0]);
    assert.deepEqual(history.commits.map((item) => [item.sha, item.committedAt, item.additions, item.deletions, item.href]),
      [[historicalSha, "2026-10-02T17:54:21Z", 744, 213, `https://github.com/voss-labs/vroom/commit/${historicalSha}`]]);
    assert.deepEqual(history.pullRequests.map((item) => [item.number, item.state]).sort((a, b) => Number(a[0]) - Number(b[0])),
      [[63, "closed"], [64, "open"], [73, "open"]]);
    assert.equal(history.pullRequests.find((item) => item.number === 63)!.mergedAt, null);
  }
});

test("all raw records remain reachable above one hundred independently of the recent activity feed", () => {
  const snapshot = fixture();
  snapshot.code![0].commits = Array.from({ length: 137 }, (_, index) => commit(snapshot, index + 1));
  snapshot.work[0].pulls = Array.from({ length: 141 }, (_, index) => pull(snapshot, index + 1));
  snapshot.activity = [{ id: "feed-only", personId: snapshot.people[0].id, repositoryId: snapshot.repositories[0].id,
    kind: "committed", text: "Not a commit record", occurredAt: "2026-10-16T12:00:00Z", source: "github", url: null, fresh: false }];
  const before = structuredClone(snapshot);
  const { board, history } = selected(snapshot);
  assert.equal(history.commits.length, 137);
  assert.equal(history.pullRequests.length, 141);
  assert.equal(new Set(history.commits.map((item) => item.sha)).size, 137);
  assert.equal(new Set(history.pullRequests.map((item) => item.number)).size, 141);
  assert.ok(history.commits.some((item) => item.sha === commit(snapshot, 137).sha));
  assert.ok(history.pullRequests.some((item) => item.number === 1));
  assert.equal(board.rows[0].commits, history.commits.length);
  assert.equal(board.rows[0].opened, history.pullRequests.length);
  assert.deepEqual(snapshot, before);
});

test("details agree with inclusive UTC start and exclusive capture for commits and PR events", () => {
  const snapshot = fixture();
  snapshot.code![0].commits = [commit(snapshot, 1, "2026-10-01T00:00:00Z"),
    commit(snapshot, 2, "2026-09-30T23:59:59.999Z"), commit(snapshot, 3, captured.toISOString())];
  snapshot.work[0].pulls = [pull(snapshot, 1, "2026-10-01T00:00:00Z"),
    { ...pull(snapshot, 2, "2026-09-01T00:00:00Z"), state: "merged", mergedAt: "2026-10-01T00:00:00Z", closedAt: "2026-10-01T00:00:00Z" },
    { ...pull(snapshot, 3, "2026-09-01T00:00:00Z"), state: "closed", closedAt: "2026-10-02T00:00:00Z" },
    { ...pull(snapshot, 4, "2026-09-01T00:00:00Z"), updatedAt: "2026-10-02T00:00:00Z" },
    { ...pull(snapshot, 5, "2026-09-01T00:00:00Z"), state: "closed", closedAt: captured.toISOString() },
    pull(snapshot, 6, captured.toISOString())];
  const { board, history } = selected(snapshot, "month");
  assert.deepEqual(history.commits.map((item) => item.sha), [commit(snapshot, 1).sha]);
  assert.deepEqual(history.pullRequests.map((item) => item.number).sort(), [1, 2, 3]);
  assert.deepEqual([board.rows[0].commits, board.rows[0].opened, board.rows[0].merged], [1, 1, 1]);
  assert.equal(history.pullRequests.find((item) => item.number === 3)!.mergedAt, null);
  snapshot.code![0].commits = [commit(snapshot, 7, "2026-09-17T12:00:00Z"), commit(snapshot, 8, "2026-09-17T11:59:59.999Z")];
  assert.deepEqual(selected(snapshot, "30d").history.commits.map((item) => item.sha), [commit(snapshot, 7).sha]);
});

test("identity, repository, bot and duplicate rules preserve the summary's contribution scope", () => {
  const snapshot = fixture();
  const first = commit(snapshot, 1);
  const firstPull = pull(snapshot, 1);
  snapshot.code![0].commits = [first, { ...first, id: "duplicate" }, { ...commit(snapshot, 2), isBot: true },
    { ...commit(snapshot, 3), authorPersonId: null }, { ...commit(snapshot, 4), authorPersonId: snapshot.people[1].id }];
  snapshot.work[0].pulls = [firstPull, { ...firstPull }, { ...pull(snapshot, 2), isBot: true },
    { ...pull(snapshot, 3), kind: "issue" }, { ...pull(snapshot, 4), authorPersonId: snapshot.people[1].id }];
  const { board, history } = selected(snapshot);
  assert.equal(history.commits.length, 1);
  assert.equal(history.pullRequests.length, 1);
  assert.equal(board.rows.find((row) => row.personId === snapshot.people[0].id)!.commits, 1);
  assert.deepEqual(selectContributionHistory(snapshot, "missing", snapshot.repositories[0].id, board), { commits: [], pullRequests: [] });
  assert.deepEqual(selectContributionHistory(snapshot, snapshot.people[0].id, "missing", board), { commits: [], pullRequests: [] });
  snapshot.people[0].kind = "preview";
  assert.deepEqual(selected(snapshot).history, { commits: [], pullRequests: [] });
});

test("record links bind public GitHub URLs to their exact repository, SHA or PR number", () => {
  const snapshot = fixture();
  const unsafe = ["javascript:alert(1)", "https://github.com.evil.test/voss-labs/vroom/commit/SHA",
    "https://user@github.com/voss-labs/vroom/commit/SHA", "https://github.com/voss-labs/other/commit/SHA",
    "https://github.com/voss-labs/vroom/commit/SHA?next=other", "https://github.com/voss-labs/vroom/commit/SHA#other"];
  snapshot.code![0].commits = unsafe.map((url, index) => {
    const record = commit(snapshot, index + 1);
    return { ...record, url: url.replace("SHA", record.sha), messageHeadline: "<script>plain text</script>" };
  });
  snapshot.code![0].commits!.push(commit(snapshot, 7));
  snapshot.work[0].pulls = [pull(snapshot, 73), { ...pull(snapshot, 64), url: "https://github.com/voss-labs/vroom/pull/73" }];
  const { history } = selected(snapshot);
  assert.equal(history.commits.filter((item) => item.href === null).length, unsafe.length);
  assert.equal(history.commits.find((item) => item.sha === commit(snapshot, 7).sha)!.href, commit(snapshot, 7).url);
  assert.equal(history.commits[0].headline, "<script>plain text</script>");
  assert.equal(history.pullRequests.find((item) => item.number === 73)!.href, "https://github.com/voss-labs/vroom/pull/73");
  assert.equal(history.pullRequests.find((item) => item.number === 64)!.href, null);
});

test("legacy records and unknown measurements stay unavailable, and dates retain their year and UTC time", () => {
  const snapshot = fixture();
  const legacy = commit(snapshot, 1, "2025-10-02T17:54:21Z");
  delete legacy.messageHeadline;
  legacy.additions = legacy.deletions = null;
  const legacyPull = { ...pull(snapshot, 63), state: "closed" as const };
  delete legacyPull.closedAt;
  snapshot.code![0].commits = [legacy];
  snapshot.work[0].pulls = [legacyPull];
  const { history } = selected(snapshot);
  assert.equal(history.commits[0].headline, null);
  assert.deepEqual([history.commits[0].additions, history.commits[0].deletions], [null, null]);
  assert.equal(history.pullRequests[0].closedAt, undefined);
  assert.equal(history.pullRequests[0].state, "closed");
  assert.equal(contributionDate(legacy.committedAt), "2025-10-02 17:54:21 UTC");
  assert.equal(contributionDate("2026-10-17T12:15:25.262Z"), "2026-10-17 12:15:25 UTC");
  assert.equal(contributionDate("invalid"), "Date unavailable");
  assert.equal(contributionDate(null), "Date unavailable");
  snapshot.code![0].commits = null;
  snapshot.work[0].pulls = null;
  assert.deepEqual(selected(snapshot).history, { commits: [], pullRequests: [] });
});
