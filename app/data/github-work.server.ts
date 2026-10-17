import type { ActivityEvent, Person, Repository, RepositoryWork, WorkItem } from "./types.ts";
import { createPeopleRegistry, validUser } from "./github-identity.ts";
import type { GithubUser } from "./github-identity.ts";
import type { GithubRequest } from "./github-request.server.ts";
import { GithubFailure } from "./github-failure.server.ts";
import { CAPTURE_PAGE_SIZE } from "./capture-limits.ts";

export type GithubWork = {
  number: number; title: string; state: string; user: GithubUser; assignees?: GithubUser[];
  requested_reviewers?: GithubUser[]; created_at: string; updated_at: string;
  closed_at?: string | null; merged_at?: string | null; pull_request?: unknown;
};
export type WorkResult = { work: RepositoryWork; people: Person[]; activity: ActivityEvent[] };

function time(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function normalizeWork(
  repository: Repository, pulls: GithubWork[], issues: GithubWork[] | null, roster: Person[],
  fetchedAt: string, partial: boolean,
): WorkResult {
  const { people, personId } = createPeopleRegistry(roster);
  function convert(raw: GithubWork, kind: WorkItem["kind"]): WorkItem {
    if (!raw || !Number.isSafeInteger(raw.number) || raw.number < 1 || !validUser(raw.user) ||
      typeof raw.title !== "string" || raw.title.length > 20000 || !time(raw.created_at) || !time(raw.updated_at) ||
      !["open", "closed"].includes(raw.state) || raw.merged_at != null && !time(raw.merged_at) ||
      raw.closed_at != null && !time(raw.closed_at)) throw new Error("Invalid public work response.");
    const mergedAt = raw.merged_at ?? null;
    const closedAt = raw.closed_at ?? null;
    if (Date.parse(raw.updated_at) < Date.parse(raw.created_at) ||
      raw.state === "open" && (closedAt !== null || mergedAt !== null) || raw.state === "closed" && closedAt === null ||
      closedAt !== null && (Date.parse(closedAt) < Date.parse(raw.created_at) || Date.parse(closedAt) > Date.parse(raw.updated_at)) ||
      mergedAt !== null && (Date.parse(mergedAt) < Date.parse(raw.created_at) || closedAt === null || Date.parse(mergedAt) > Date.parse(closedAt))) {
      throw new Error("Invalid public work event dates.");
    }
    return {
      id: `${repository.id}:${kind === "pull-request" ? "pr" : "issue"}:${raw.number}`,
      repositoryId: repository.id, number: raw.number, title: raw.title,
      url: `${repository.url}/${kind === "pull-request" ? "pull" : "issues"}/${raw.number}`,
      kind, state: mergedAt ? "merged" : raw.state === "open" ? "open" : "closed",
      authorPersonId: personId(raw.user),
      assigneePersonIds: (raw.assignees ?? []).filter(validUser).map(personId),
      requestedReviewerPersonIds: (raw.requested_reviewers ?? []).filter(validUser).map(personId),
      createdAt: raw.created_at, updatedAt: raw.updated_at, mergedAt, closedAt,
      isBot: raw.user.type === "Bot" || raw.user.login.endsWith("[bot]"),
    };
  }
  const normalizedPulls = pulls.map((pull) => convert(pull, "pull-request"));
  const normalizedIssues = issues?.filter((issue) => !issue.pull_request).map((issue) => convert(issue, "issue")) ?? null;
  const activity: ActivityEvent[] = normalizedPulls.flatMap((pull) => {
    const entries: ActivityEvent[] = [{
      id: `${pull.id}:opened`, personId: pull.authorPersonId, repositoryId: repository.id,
      kind: "opened", text: `Opened #${pull.number}: ${pull.title}`, occurredAt: pull.createdAt,
      source: "github", url: pull.url, fresh: false,
    }];
    const occurredAt = pull.mergedAt ?? pull.closedAt;
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
      pulls: normalizedPulls, issues: normalizedIssues, captureComplete: !partial,
      message: partial ? "Partial available PR history. Issues and reviews not fetched." : "Complete available PR history captured. Issues and reviews not fetched." },
    people: [...people.values()],
    activity: activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 80),
  };
}

export function createWorkReader(request: GithubRequest, now: () => Date) {
  return async (repository: Repository, roster: Person[]): Promise<WorkResult> => {
    const pulls: GithubWork[] = [];
    const seen = new Set<number>();
    let previousCreatedAt = -Infinity;
    let previousNumber = 0;
    for (let page = 1; ; page += 1) {
      const result = await request<GithubWork[]>(`/repos/voss-labs/${encodeURIComponent(repository.name)}/pulls?state=all&sort=created&direction=asc&per_page=${CAPTURE_PAGE_SIZE}&page=${page}`, "array", `/repositories/${repository.githubId}/pulls`);
      const fail = () => new GithubFailure("Invalid or incomplete GitHub pull-request history.", new Date(now().getTime() + 30000).toISOString());
      if (result.data.length > CAPTURE_PAGE_SIZE || result.next && result.data.length !== CAPTURE_PAGE_SIZE ||
        page > 1 && result.data.length === 0) throw fail();
      for (const pull of result.data) {
        if (!pull || !time(pull.created_at) || !Number.isSafeInteger(pull.number) || pull.number <= previousNumber ||
          Date.parse(pull.created_at) < previousCreatedAt || seen.has(pull.number)) throw fail();
        seen.add(pull.number);
        previousCreatedAt = Date.parse(pull.created_at);
        previousNumber = pull.number;
        pulls.push(pull);
      }
      if (!result.next) break;
    }
    return normalizeWork(repository, pulls, null, roster, now().toISOString(), false);
  };
}
