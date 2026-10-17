import type { CodeCommit, OfficeSnapshot, Repository, WorkItem } from "./types.ts";

export type ContributionWindow = { from: string | null; to: string };
export type HistoryCommit = CodeCommit & { href: string | null; headline: string | null };
export type HistoryPullRequest = WorkItem & { href: string | null };
export type ContributionHistory = { commits: HistoryCommit[]; pullRequests: HistoryPullRequest[] };

export function inContributionWindow(value: string | null | undefined, window: ContributionWindow): boolean {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) && time < Date.parse(window.to) &&
    (window.from === null || time >= Date.parse(window.from));
}

function publicRecordUrl(value: string, repository: Repository, kind: "commit" | "pull", id: string): string | null {
  try {
    const url = new URL(value);
    return url.origin === "https://github.com" && !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === `/${repository.fullName}/${kind}/${id}` ? url.href : null;
  } catch {
    return null;
  }
}

function pullEvents(pull: WorkItem): (string | null | undefined)[] {
  return [pull.createdAt, pull.state === "merged" ? pull.mergedAt : null,
    pull.state !== "open" ? pull.closedAt : null];
}

function latestPullEvent(pull: WorkItem, window: ContributionWindow): number {
  return Math.max(...pullEvents(pull).filter((value) => inContributionWindow(value, window)).map((value) => Date.parse(value!)));
}

export function selectContributionHistory(
  snapshot: OfficeSnapshot, personId: string, repositoryId: string, window: ContributionWindow,
): ContributionHistory {
  const result: ContributionHistory = { commits: [], pullRequests: [] };
  const person = snapshot.people.find((entry) => entry.id === personId);
  const repository = snapshot.repositories.find((entry) => entry.id === repositoryId);
  if (!repository || !person || snapshot.source.mode === "github" && person.kind === "preview") return result;
  const seenCommits = new Set<string>();
  for (const code of snapshot.code ?? []) {
    if (code.repositoryId !== repositoryId) continue;
    for (const commit of code.commits ?? []) {
      if (commit.repositoryId !== repositoryId || commit.authorPersonId !== personId || commit.isBot ||
        seenCommits.has(commit.sha) || !inContributionWindow(commit.committedAt, window)) continue;
      seenCommits.add(commit.sha);
      result.commits.push({ ...commit, headline: commit.messageHeadline?.trim() || null,
        href: publicRecordUrl(commit.url, repository, "commit", commit.sha) });
    }
  }
  const seenPulls = new Set<string>();
  for (const work of snapshot.work) {
    if (work.repositoryId !== repositoryId) continue;
    for (const pull of work.pulls ?? []) {
      if (pull.repositoryId !== repositoryId || pull.kind !== "pull-request" || pull.authorPersonId !== personId ||
        pull.isBot || seenPulls.has(pull.id) || !pullEvents(pull).some((date) => inContributionWindow(date, window))) continue;
      seenPulls.add(pull.id);
      result.pullRequests.push({ ...pull, href: publicRecordUrl(pull.url, repository, "pull", String(pull.number)) });
    }
  }
  result.commits.sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt) || a.sha.localeCompare(b.sha, "en"));
  result.pullRequests.sort((a, b) => latestPullEvent(b, window) - latestPullEvent(a, window) || b.number - a.number);
  return result;
}

export function contributionDate(value: string | null | undefined): string {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? new Date(time).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC")
    : "Date unavailable";
}
