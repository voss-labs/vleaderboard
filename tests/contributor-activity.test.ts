import assert from "node:assert/strict";
import test from "node:test";
import {
  allTimeWindow, buildContributionCalendar, collectContributorEvents, contributionStats, contributionYears, groupContributionMonths,
} from "../app/data/contributor-activity.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { buildLeaderboardExport, exportFileName, leaderboardMarkdown, leaderboardPrintDocument } from "../app/data/leaderboard-export.ts";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import type { CodeCommit, OfficeSnapshot, WorkItem } from "../app/data/types.ts";

const captured = new Date("2026-10-17T12:00:00Z");

function fixture(): OfficeSnapshot {
  const snapshot = createPreviewSnapshot(captured);
  const repository = snapshot.repositories.find((item) => item.name === "vroom")!;
  snapshot.repositories = [repository];
  snapshot.work = snapshot.work.filter((item) => item.repositoryId === repository.id);
  snapshot.work[0].pulls = [];
  snapshot.code = snapshot.code!.filter((item) => item.repositoryId === repository.id);
  snapshot.code[0].commits = [];
  snapshot.people = [{ ...snapshot.people[0], id: "github:149477150", name: "Parth | Dev", kind: "github",
    github: { id: 149477150, login: "fixture-parth", url: "https://github.com/fixture-parth" } }];
  snapshot.source.mode = "github";
  return snapshot;
}

function commit(snapshot: OfficeSnapshot, number: number, date: string): CodeCommit {
  const repository = snapshot.repositories[0];
  const sha = number.toString(16).padStart(40, "0");
  return { id: `${repository.id}:commit:${sha}`, repositoryId: repository.id, sha, url: `${repository.url}/commit/${sha}`,
    authorPersonId: snapshot.people[0].id, committedAt: date, messageHeadline: `Commit ${number}`, additions: 3, deletions: 1, isBot: false };
}

function pull(snapshot: OfficeSnapshot, number: number, createdAt: string, mergedAt: string | null): WorkItem {
  const repository = snapshot.repositories[0];
  return { id: `${repository.id}:pr:${number}`, repositoryId: repository.id, number, title: `PR ${number}`,
    url: `${repository.url}/pull/${number}`, kind: "pull-request", state: mergedAt ? "merged" : "open",
    authorPersonId: snapshot.people[0].id, assigneePersonIds: [], requestedReviewerPersonIds: [], createdAt,
    updatedAt: mergedAt ?? createdAt, mergedAt, closedAt: mergedAt, isBot: false };
}

function seeded() {
  const snapshot = fixture();
  snapshot.code![0].commits = [commit(snapshot, 1, "2026-10-16T09:00:00Z"), commit(snapshot, 2, "2026-10-16T18:00:00Z"),
    commit(snapshot, 3, "2026-10-15T10:00:00Z"), commit(snapshot, 4, "2025-03-02T10:00:00Z"), commit(snapshot, 5, "2026-10-18T10:00:00Z")];
  snapshot.work[0].pulls = [pull(snapshot, 7, "2026-10-14T08:00:00Z", "2026-10-16T20:00:00Z")];
  return snapshot;
}

test("contributor events include commits and PR milestones up to the capture, newest first", () => {
  const snapshot = seeded();
  const events = collectContributorEvents(snapshot, snapshot.people[0].id, allTimeWindow(captured.toISOString()));
  assert.deepEqual(events.map((event) => event.kind), ["merged", "commit", "commit", "commit", "opened", "commit"]);
  assert.equal(events[0].href, `${snapshot.repositories[0].url}/pull/7`);
  assert.ok(events.every((event) => Date.parse(event.at) < captured.getTime()));
  assert.deepEqual(contributionYears(events), [2026, 2025]);
});

test("recent calendar covers a year of Sunday-aligned weeks and scales levels to the busiest day", () => {
  const events = collectContributorEvents(seeded(), "github:149477150", allTimeWindow(captured.toISOString()));
  const calendar = buildContributionCalendar(events, { kind: "recent" }, captured.toISOString());
  const days = calendar.weeks.flat();
  assert.ok(calendar.weeks.every((week) => week.length === 7));
  assert.equal(new Date(`${calendar.weeks[0][0].date}T00:00:00Z`).getUTCDay(), 0);
  assert.equal(calendar.to, "2026-10-17");
  assert.equal(days.filter((day) => day.inRange).length, 365);
  assert.equal(calendar.total, 4);
  assert.deepEqual(days.filter((day) => day.count).map((day) => [day.date, day.count, day.level]),
    [["2026-10-14", 1, 2], ["2026-10-15", 1, 2], ["2026-10-16", 2, 4]]);
  assert.ok(calendar.months.length >= 12 && calendar.months.every((month, index) => index === 0 || month.week - calendar.months[index - 1].week >= 3));

  const year = buildContributionCalendar(events, { kind: "year", year: 2025 }, captured.toISOString());
  assert.equal(year.total, 1);
  assert.equal(year.from, "2025-01-01");
  assert.equal(year.to, "2025-12-31");
  assert.equal(year.months[0].label, "Jan");
});

test("stats and monthly timeline describe when the contributor was active", () => {
  const events = collectContributorEvents(seeded(), "github:149477150", allTimeWindow(captured.toISOString()));
  assert.deepEqual(contributionStats(events), { total: 5, first: "2025-03-02T10:00:00Z", latest: "2026-10-16T20:00:00Z",
    activeDays: 4, longestStreak: 3, repositories: 1 });
  const months = groupContributionMonths(events);
  assert.deepEqual(months.map((month) => [month.label, month.counts]), [
    ["October 2026", { commit: 3, opened: 1, merged: 1, closed: 0 }],
    ["March 2025", { commit: 1, opened: 0, merged: 0, closed: 0 }],
  ]);
});

test("exports render escaped markdown and a dark print document with orange calendars", () => {
  const snapshot = seeded();
  const board = deriveLeaderboard(snapshot, "all", captured);
  const data = buildLeaderboardExport(snapshot, board, board.rows, "All time");
  const markdown = leaderboardMarkdown(data);
  assert.match(markdown, /^# VOSS Labs Leaderboard/);
  assert.match(markdown, /\| 1 \| \[Parth \\\| Dev\]\(https:\/\/github\.com\/fixture-parth\) \(@fixture-parth\) \| 16 \| \*\*1\*\* \| 1 \| 4 \| \+12 \| −4 \|/);
  assert.match(markdown, /\*\*Ranking:\*\* Ranked by merged PRs, highest first/);
  assert.match(markdown, /\| Parth \\\| Dev \| 4 \| 4 \| 3 days \| 2 Mar 2025 \| 16 Oct 2026 \|/);

  snapshot.people[0].name = "<script>alert(1)</script>";
  const page = leaderboardPrintDocument(buildLeaderboardExport(snapshot, board, board.rows, "All time"));
  assert.doesNotMatch(page, /<script>/);
  assert.match(page, /&lt;script&gt;/);
  assert.match(page, /print-color-adjust: exact/);
  assert.match(page, /\.calendar \.l4 \{ fill: #fb7a3c; \}/);
  assert.match(page, /class="l4"/);
  assert.equal(exportFileName("Last 30 days", board.to, "pdf"), "voss-leaderboard-last-30-days-2026-10-17.pdf");
});

test("exports leave out contributors whose measured changed lines total zero but keep unknown measurements", () => {
  const snapshot = seeded();
  snapshot.people.push({ ...snapshot.people[0], id: "github:2", name: "Zero Lines", github: { id: 2, login: "zero-lines", url: "https://github.com/zero-lines" } },
    { ...snapshot.people[0], id: "github:3", name: "Unknown Lines", github: { id: 3, login: "unknown-lines", url: "https://github.com/unknown-lines" } });
  snapshot.code![0].commits!.push({ ...commit(snapshot, 20, "2026-10-12T10:00:00Z"), authorPersonId: "github:2", additions: 0, deletions: 0 },
    { ...commit(snapshot, 21, "2026-10-12T11:00:00Z"), authorPersonId: "github:3", additions: null, deletions: null });
  snapshot.work[0].pulls!.push({ ...pull(snapshot, 8, "2026-10-11T08:00:00Z", "2026-10-12T08:00:00Z"), authorPersonId: "github:2" });
  const board = deriveLeaderboard(snapshot, "all", captured);
  assert.deepEqual(board.rows.map((row) => [row.personId, row.additions, row.deletions]),
    [["github:149477150", 12, 4], ["github:2", 0, 0], ["github:3", null, null]]);
  const data = buildLeaderboardExport(snapshot, board, board.rows, "All time");
  assert.deepEqual(data.contributors.map((entry) => entry.person.id), ["github:149477150", "github:3"]);
  assert.equal(data.excludedWithoutLines, 1);
  assert.deepEqual(data.contributors.map((entry) => entry.row.rank), [1, 3]);
  const markdown = leaderboardMarkdown(data);
  assert.doesNotMatch(markdown, /Zero Lines/);
  assert.match(markdown, /\*\*Excluded:\*\* 1 contributor with 0 changed lines excluded\. Ranks are unchanged\./);
  assert.match(markdown, /Unknown Lines.*\| — \| — \|/);
  const page = leaderboardPrintDocument(data);
  assert.doesNotMatch(page, /Zero Lines/);
  assert.match(page, /1 contributor with 0 changed lines excluded\./);
});
