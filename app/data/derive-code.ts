import { isAgentAccount } from "./agents.ts";
import { historyCoverage } from "./history-coverage.ts";
import type { CodeCoverage, LeaderboardRow, OfficeSnapshot, Person } from "./types.ts";

export function emptyLeaderboardRow(personId: string): LeaderboardRow {
  return { personId, rank: 0, merged: 0, opened: 0, reviews: null,
    commits: null, additions: null, deletions: null, codeStatus: "unavailable" };
}

export function addCodeMetrics(
  snapshot: OfficeSnapshot, counts: Map<string, LeaderboardRow>, people: Map<string, Person>,
  inside: (value: string | null) => boolean,
): CodeCoverage {
  const code = snapshot.code ?? [];
  const available = code.filter((repository) => repository.commits !== null);
  const detailLimits = code.map((repository) => repository.detailReadLimit).filter((limit): limit is number => limit !== null);
  const detailReadLimit = detailLimits.length ? Math.max(...detailLimits) : null;
  const complete = historyCoverage(snapshot).commits;
  const status = available.length === 0 ? "unavailable" : available.some((repository) => repository.status === "stale")
    ? "stale" : complete && available.every((repository) => repository.status === "ready") ? "ready" : "partial";
  const coverage: CodeCoverage = {
    status, repositoryIds: [...new Set(available.map((repository) => repository.repositoryId))], complete,
    fetchedAt: available.map((repository) => repository.fetchedAt).filter((time): time is string => !!time).sort().at(-1) ?? null,
    capturedCommits: 0, missingStats: 0, unattributedCommits: 0,
    detailReadLimit,
    message: snapshot.source.mode === "preview" ? "Simulated default-branch non-merge commits and changed lines."
      : `Captured default-branch non-merge commits by committed date. ${complete ? "Complete available history at capture time." : "Partial saved history; earlier records may be unavailable."}${detailReadLimit === null ? " Changed lines arrive in the same history query." : ` Up to ${detailReadLimit} new SHA details per process per hour.`}`,
    retryAt: code.map((repository) => repository.retryAt).filter((time): time is string => !!time).sort().at(-1) ?? null,
  };
  for (const row of counts.values()) {
    row.codeStatus = status;
    if (available.length) row.commits = row.additions = row.deletions = 0;
  }
  const seen = new Set<string>();
  const missing = new Set<string>();
  for (const repository of available) {
    for (const commit of repository.commits ?? []) {
      const key = `${repository.repositoryId}:${commit.sha}`;
      if (commit.isBot || seen.has(key)) continue;
      seen.add(key);
      const person = commit.authorPersonId ? people.get(commit.authorPersonId) : undefined;
      if (isAgentAccount(person)) continue;
      if (snapshot.source.mode === "github" && person?.kind === "preview") continue;
      const row = person ? counts.get(person.id) ?? { ...emptyLeaderboardRow(person.id),
        commits: 0, additions: 0, deletions: 0, codeStatus: status } : null;
      if (row && person) counts.set(person.id, row);
      if (!inside(commit.committedAt)) continue;
      coverage.capturedCommits += 1;
      if (!row) coverage.unattributedCommits += 1;
      const measured = Number.isSafeInteger(commit.additions) && commit.additions! >= 0 &&
        Number.isSafeInteger(commit.deletions) && commit.deletions! >= 0;
      if (!measured) coverage.missingStats += 1;
      if (!row) continue;
      row.commits = (row.commits ?? 0) + 1;
      if (!measured) {
        missing.add(row.personId);
        row.additions = row.deletions = null;
        if (row.codeStatus === "ready") row.codeStatus = "partial";
      } else if (!missing.has(row.personId)) {
        row.additions = (row.additions ?? 0) + commit.additions!;
        row.deletions = (row.deletions ?? 0) + commit.deletions!;
      }
    }
  }
  return coverage;
}
