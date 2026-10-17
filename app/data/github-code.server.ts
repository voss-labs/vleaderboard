import { GithubFailure } from "./github-failure.server.ts";
import { createPeopleRegistry, validUser } from "./github-identity.ts";
import type { GithubUser } from "./github-identity.ts";
import type { GithubRequest } from "./github.server.ts";
import type { CodeCommit, Person, Repository, RepositoryCode } from "./types.ts";

type RawCommit = {
  sha: string;
  author?: GithubUser | null;
  parents: { sha: string }[];
  commit: { committer: { date: string } };
};
type Detail = { sha: string; stats: { additions: number; deletions: number } };
type Stats = Pick<CodeCommit, "additions" | "deletions">;
type DetailEntry = { value: Stats | null; retryAt: number; message: string; pending?: Promise<DetailEntry> };
export type CodeResult = { code: RepositoryCode; people: Person[] };
export type CodeDetailBudget = { limit: number; take: (clock: number) => number | null };

export function createCodeDetailBudget(authenticated = false): CodeDetailBudget {
  let reads: number[] = [];
  const limit = authenticated ? 600 : 20;
  return {
    limit,
    take(clock) {
      reads = reads.filter((time) => time > clock - 3600000);
      if (reads.length >= limit) return reads[0] + 3600000;
      reads.push(clock);
      return null;
    },
  };
}

const processBudget = createCodeDetailBudget();
const authenticatedProcessBudget = createCodeDetailBudget(true);

export function processCodeDetailBudget(authenticated: boolean): CodeDetailBudget {
  return authenticated ? authenticatedProcessBudget : processBudget;
}

function validCommit(raw: RawCommit): boolean {
  return !!raw && typeof raw.sha === "string" && /^[a-f0-9]{40}$/i.test(raw.sha) &&
    Array.isArray(raw.parents) && raw.parents.every((parent) => !!parent && typeof parent.sha === "string") &&
    Number.isFinite(Date.parse(raw.commit?.committer?.date));
}

export function createCodeReader(
  request: GithubRequest, now: () => Date, budget: CodeDetailBudget = processBudget,
) {
  const details = new Map<string, DetailEntry>();

  function trimDetails() {
    while (details.size > 1000) {
      const oldest = [...details.keys()].find((id) => !details.get(id)?.pending);
      if (!oldest) return;
      details.delete(oldest);
    }
  }

  async function detail(repository: Repository, sha: string): Promise<DetailEntry> {
    const key = `${repository.id}:${sha}`;
    const cached = details.get(key);
    if (cached?.pending) return cached.pending;
    if (cached && (cached.value || cached.retryAt > now().getTime())) {
      details.delete(key);
      details.set(key, cached);
      return cached;
    }
    const entry: DetailEntry = { value: null, retryAt: 0, message: "" };
    const pending = (async () => {
      const retryAt = budget.take(now().getTime());
      if (retryAt !== null) {
        entry.retryAt = retryAt;
        entry.message = `SHA detail capture reached its ${budget.limit} new reads per hour limit.`;
        return entry;
      }
      try {
        const result = await request<Detail>(`/repos/voss-labs/${encodeURIComponent(repository.name)}/commits/${sha}`, "object");
        const stats = result.data.stats;
        if (result.data.sha?.toLowerCase() !== sha || !stats ||
          !Number.isSafeInteger(stats.additions) || stats.additions < 0 ||
          !Number.isSafeInteger(stats.deletions) || stats.deletions < 0) throw new Error("Invalid SHA detail stats");
        entry.value = { additions: stats.additions, deletions: stats.deletions };
      } catch (error) {
        entry.retryAt = error instanceof GithubFailure ? Date.parse(error.retryAt) : now().getTime() + 30000;
        entry.message = error instanceof GithubFailure ? error.message : "Changed-line details are temporarily unavailable.";
      }
      return entry;
    })();
    entry.pending = pending;
    details.set(key, entry);
    trimDetails();
    try { return await pending; } finally {
      delete entry.pending;
      trimDetails();
    }
  }

  return async function code(repository: Repository, roster: Person[]): Promise<CodeResult> {
    const listed = await request<RawCommit[]>(`/repos/voss-labs/${encodeURIComponent(repository.name)}/commits?per_page=10`);
    const { people, personId } = createPeopleRegistry(roster);
    const unique = new Map<string, RawCommit>();
    let invalid = listed.data.length > 10;
    for (const raw of listed.data.slice(0, 10)) {
      if (!validCommit(raw)) { invalid = true; continue; }
      if (raw.parents.length > 1) continue;
      unique.set(raw.sha.toLowerCase(), raw);
    }
    const commits: CodeCommit[] = [];
    const failures: DetailEntry[] = [];
    const entries = [...unique.entries()];
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, entries.length) }, async () => {
      while (next < entries.length) {
        const [sha, raw] = entries[next++];
        const captured = await detail(repository, sha);
        if (!captured.value) failures.push(captured);
        commits.push({
          id: `${repository.id}:commit:${sha}`, repositoryId: repository.id, sha,
          url: `${repository.url}/commit/${sha}`, authorPersonId: validUser(raw.author) ? personId(raw.author) : null,
          committedAt: raw.commit.committer.date,
          additions: captured.value?.additions ?? null, deletions: captured.value?.deletions ?? null,
          isBot: validUser(raw.author) && (raw.author.type === "Bot" || raw.author.login.endsWith("[bot]")),
        });
      }
    }));
    const captureComplete = !listed.next && !invalid;
    const partial = !captureComplete || failures.length > 0;
    return {
      code: {
        repositoryId: repository.id, status: partial ? "partial" : "ready", fetchedAt: now().toISOString(),
        detailReadLimit: budget.limit,
        commits: commits.sort((a, b) => b.committedAt.localeCompare(a.committedAt) || a.sha.localeCompare(b.sha)),
        captureComplete, retryAt: failures.length
          ? new Date(Math.max(now().getTime() + 900000, ...failures.map((entry) => entry.retryAt))).toISOString() : null,
        message: [captureComplete ? "Captured default-branch non-merge commits." : "Partial capture · latest 10 default-branch records; merge commits excluded.",
          failures.length ? `${failures.length} commits have unknown changed-line totals. ${failures[0].message}` : "Changed lines measured from immutable SHA details."].join(" "),
      },
      people: [...people.values()],
    };
  };
}
