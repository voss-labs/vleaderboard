import type { ActivityEvent, Person, Repository, RepositoryWork, WorkItem } from "./types.ts";

export type GithubUser = { id: number; login: string; type?: string };
type GithubRepository = {
  id: number; name: string; full_name: string; private: boolean; owner: { login: string };
  description: string | null; language: string | null; archived: boolean; fork: boolean; pushed_at: string | null;
};
type GithubWork = {
  number: number; title: string; state: string; user: GithubUser; assignees?: GithubUser[];
  requested_reviewers?: GithubUser[]; created_at: string; updated_at: string;
  closed_at?: string | null; merged_at?: string | null; pull_request?: unknown;
};
export type CatalogResult = { repositories: Repository[]; complete: boolean };
export type WorkResult = { work: RepositoryWork; people: Person[]; activity: ActivityEvent[] };
export type GithubOptions = { fetcher?: typeof fetch; now?: () => Date; token?: string };

export class GithubFailure extends Error {
  retryAt: string;
  constructor(message: string, retryAt: string) {
    super(message);
    this.name = "GithubFailure";
    this.retryAt = retryAt;
  }
}

function retryTime(headers: Headers, now: number): number {
  const retry = headers.get("retry-after");
  const seconds = retry !== null ? Number(retry) : NaN;
  const date = retry !== null ? Date.parse(retry) : NaN;
  const reset = Number(headers.get("x-ratelimit-reset")) * 1000;
  const declared = Number.isFinite(seconds) ? now + seconds * 1000
    : Number.isFinite(date) ? date : reset;
  return Math.max(now + 60000, Number.isFinite(declared) ? declared : 0);
}

function validUser(user: GithubUser | undefined): user is GithubUser {
  return !!user && Number.isSafeInteger(user.id) && user.id > 0 &&
    typeof user.login === "string" && /^[A-Za-z0-9-]+(?:\[bot\])?$/.test(user.login);
}

export function normalizeWork(
  repository: Repository, pulls: GithubWork[], issues: GithubWork[], roster: Person[],
  fetchedAt: string, partial: boolean,
): WorkResult {
  const people = new Map<number, Person>();
  const known = new Map(roster.filter((person) => person.github).map((person) => [person.github!.id, person]));
  function personId(user: GithubUser): string {
    const confirmed = known.get(user.id);
    if (confirmed) return confirmed.id;
    if (!people.has(user.id)) people.set(user.id, {
      id: `github:${user.id}`, name: user.login, role: "Public contributor", kind: "github",
      github: { id: user.id, login: user.login, url: `https://github.com/${user.login}` },
      homeRoomId: "commons", table: null, repositoryIds: [], assignment: "unknown", palette: user.id % 24,
    });
    return `github:${user.id}`;
  }
  function convert(raw: GithubWork, kind: WorkItem["kind"]): WorkItem {
    if (!Number.isSafeInteger(raw.number) || raw.number < 1 || !validUser(raw.user) ||
      typeof raw.title !== "string" || !Number.isFinite(Date.parse(raw.created_at)) ||
      !Number.isFinite(Date.parse(raw.updated_at))) {
      throw new Error("Invalid public work response");
    }
    const mergedAt = raw.merged_at && Number.isFinite(Date.parse(raw.merged_at)) ? raw.merged_at : null;
    return {
      id: `${repository.id}:${kind === "pull-request" ? "pr" : "issue"}:${raw.number}`,
      repositoryId: repository.id, number: raw.number, title: raw.title,
      url: `${repository.url}/${kind === "pull-request" ? "pull" : "issues"}/${raw.number}`,
      kind, state: mergedAt ? "merged" : raw.state === "open" ? "open" : "closed",
      authorPersonId: personId(raw.user),
      assigneePersonIds: (raw.assignees ?? []).filter(validUser).map(personId),
      requestedReviewerPersonIds: (raw.requested_reviewers ?? []).filter(validUser).map(personId),
      createdAt: raw.created_at, updatedAt: raw.updated_at, mergedAt,
      isBot: raw.user.type === "Bot" || raw.user.login.endsWith("[bot]"),
    };
  }
  const normalizedPulls = pulls.map((pull) => convert(pull, "pull-request"));
  const normalizedIssues = issues.filter((issue) => !issue.pull_request).map((issue) => convert(issue, "issue"));
  const rawByNumber = new Map(pulls.map((pull) => [pull.number, pull]));
  const activity: ActivityEvent[] = normalizedPulls.flatMap((pull) => {
    const entries: ActivityEvent[] = [{
      id: `${pull.id}:opened`, personId: pull.authorPersonId, repositoryId: repository.id,
      kind: "opened", text: `Opened #${pull.number}: ${pull.title}`, occurredAt: pull.createdAt,
      source: "github", url: pull.url, fresh: false,
    }];
    const closedAt = rawByNumber.get(pull.number)?.closed_at;
    const occurredAt = pull.mergedAt ?? (closedAt && Number.isFinite(Date.parse(closedAt)) ? closedAt : null);
    if (pull.state !== "open" && occurredAt) entries.push({
      id: `${pull.id}:${pull.state}`, personId: pull.authorPersonId, repositoryId: repository.id,
      kind: pull.state === "merged" ? "merged" : "closed",
      text: `${pull.state === "merged" ? "Merged" : "Closed"} #${pull.number}: ${pull.title}`,
      occurredAt, source: "github", url: pull.url, fresh: false,
    });
    return entries;
  });
  return {
    work: { repositoryId: repository.id, status: partial ? "partial" : "ready", fetchedAt,
      pulls: normalizedPulls, issues: normalizedIssues,
      message: partial ? "Partial history · first 100 PRs and open issues." : "Available PR history and open issues captured. Reviews not fetched." },
    people: [...people.values()],
    activity: activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 80),
  };
}

export function createGithubClient(options: GithubOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  let blockedUntil = 0;

  async function request<T>(path: string): Promise<{ data: T[]; next: boolean }> {
    const clock = now().getTime();
    if (clock < blockedUntil) throw new GithubFailure("GitHub retry is scheduled.", new Date(blockedUntil).toISOString());
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json", "User-Agent": "vleaderboard-public-snapshot",
      "X-GitHub-Api-Version": "2026-03-10",
    };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    try {
      const response = await fetcher(`https://api.github.com${path}`, {
        headers, signal: AbortSignal.timeout(8000), redirect: "error",
      });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          blockedUntil = retryTime(response.headers, clock);
          throw new GithubFailure("GitHub limited this public snapshot. Retry is scheduled.", new Date(blockedUntil).toISOString());
        }
        throw new Error("Public GitHub request failed");
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid public GitHub response");
      return { data: data as T[], next: /rel="next"/.test(response.headers.get("link") ?? "") };
    } catch (error) {
      if (error instanceof GithubFailure) throw error;
      throw new GithubFailure("Public GitHub data is temporarily unavailable.", new Date(clock + 30000).toISOString());
    }
  }

  async function catalog(): Promise<CatalogResult> {
    const repositories: Repository[] = [];
    let complete = false;
    for (let page = 1; page <= 3; page += 1) {
      const result = await request<GithubRepository>(`/orgs/voss-labs/repos?type=public&per_page=100&page=${page}`);
      for (const raw of result.data) {
        if (raw.private !== false || raw.owner?.login?.toLowerCase() !== "voss-labs") continue;
        if (!Number.isSafeInteger(raw.id) || raw.id < 1 || typeof raw.name !== "string" ||
          !/^[A-Za-z0-9_.-]+$/.test(raw.name)) throw new GithubFailure("Invalid public catalog response.", new Date(now().getTime() + 30000).toISOString());
        repositories.push({
          id: `github:${raw.id}`, githubId: raw.id, name: raw.name, fullName: `voss-labs/${raw.name}`,
          description: raw.description ?? null, url: `https://github.com/voss-labs/${raw.name}`,
          language: raw.language ?? null, archived: !!raw.archived, fork: !!raw.fork,
          pushedAt: raw.pushed_at ?? null, leadPersonId: null, memberPersonIds: [], assignment: "unknown",
        });
      }
      if (!result.next) { complete = true; break; }
    }
    return { repositories: [...new Map(repositories.map((repository) => [repository.id, repository])).values()], complete };
  }

  async function work(repository: Repository, roster: Person[]): Promise<WorkResult> {
    const base = `/repos/voss-labs/${encodeURIComponent(repository.name)}`;
    const [pulls, issues] = await Promise.all([
      request<GithubWork>(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=100`),
      request<GithubWork>(`${base}/issues?state=open&per_page=100`),
    ]);
    return normalizeWork(repository, pulls.data, issues.data, roster, now().toISOString(), pulls.next || issues.next);
  }

  return { catalog, work };
}
