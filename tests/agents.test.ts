import assert from "node:assert/strict";
import test from "node:test";
import { excludedAgentAccounts, isAgentAccount } from "../app/data/agents.ts";
import { deriveLeaderboard } from "../app/data/derive.ts";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import type { OfficeSnapshot, Person } from "../app/data/types.ts";

const captured = new Date("2026-10-17T12:00:00Z");

function account(id: number, login: string, base: Person): Person {
  return { ...base, id: `github:${id}`, name: login, kind: "github", github: { id, login, url: `https://github.com/${login}` } };
}

function fixture(): OfficeSnapshot {
  const snapshot = createPreviewSnapshot(captured);
  const repository = snapshot.repositories[0];
  const base = snapshot.people[0];
  snapshot.source.mode = "github";
  snapshot.repositories = [repository];
  snapshot.people = [account(1, "human", base), account(199161495, "cursoragent", base), account(198982749, "Copilot", base),
    account(81847, "claude", base), account(2, "release[bot]", base), account(3, "claude-fan", base)];
  snapshot.work = [{ repositoryId: repository.id, status: "ready", fetchedAt: captured.toISOString(), captureComplete: true, message: "", issues: null,
    pulls: snapshot.people.map((person, index) => ({ id: `${repository.id}:pr:${index + 1}`, repositoryId: repository.id, number: index + 1,
      title: "Change", url: `${repository.url}/pull/${index + 1}`, kind: "pull-request" as const, state: "merged" as const,
      authorPersonId: person.id, assigneePersonIds: [], requestedReviewerPersonIds: [], createdAt: "2026-10-10T00:00:00Z",
      updatedAt: "2026-10-11T00:00:00Z", mergedAt: "2026-10-11T00:00:00Z", closedAt: "2026-10-11T00:00:00Z", isBot: false })) }];
  snapshot.code = [{ repositoryId: repository.id, status: "ready", fetchedAt: captured.toISOString(), captureComplete: true, message: "",
    retryAt: null, detailReadLimit: null, commits: snapshot.people.map((person, index) => {
      const sha = (index + 1).toString(16).padStart(40, "0");
      return { id: `${repository.id}:commit:${sha}`, repositoryId: repository.id, sha, url: `${repository.url}/commit/${sha}`,
        authorPersonId: person.id, committedAt: "2026-10-12T00:00:00Z", additions: 1000, deletions: 10, isBot: false };
    }) }];
  return snapshot;
}

test("AI agent and bot accounts are excluded from rankings, PR counts and changed lines", () => {
  const board = deriveLeaderboard(fixture(), "all", captured);
  assert.deepEqual(board.rows.map((row) => row.personId).sort(), ["github:1", "github:3"]);
  assert.ok(board.rows.every((row) => row.merged === 1 && row.additions === 1000));
  assert.equal(board.codeCoverage.unattributedCommits, 0);
});

test("agent matching uses numeric IDs, so look-alike logins are kept", () => {
  const base = createPreviewSnapshot(captured).people[0];
  assert.ok(isAgentAccount(account(199161495, "renamed-cursor", base)));
  assert.ok(!isAgentAccount(account(999, "cursoragent-fan", base)));
  assert.ok(isAgentAccount(account(5, "Codex-Connector[BOT]", base)));
  assert.ok(!isAgentAccount(undefined));
  assert.equal(new Set(excludedAgentAccounts.map((entry) => entry.id)).size, excludedAgentAccounts.length);
});
