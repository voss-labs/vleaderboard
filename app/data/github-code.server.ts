import { GithubFailure } from "./github-failure.server.ts";
import { createPeopleRegistry, validUser } from "./github-identity.ts";
import type { GraphqlRequest } from "./github-request.server.ts";
import type { CodeCommit, Person, Repository, RepositoryCode } from "./types.ts";

export type CodeResult = { code: RepositoryCode; people: Person[] };

const historyQuery = `query DefaultBranchHistory($name: String!) {
  repository(owner: "voss-labs", name: $name) {
    defaultBranchRef {
      target {
        __typename
        ... on Commit {
          history(first: 10) {
            nodes {
              oid url committedDate additions deletions
              parents { totalCount }
              author { user { databaseId login } }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }
  }
}`;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function measured(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function createCodeReader(request: GraphqlRequest, now: () => Date) {
  return async function code(repository: Repository, roster: Person[]): Promise<CodeResult> {
    const response = await request<unknown>(historyQuery, { name: repository.name });
    const rawRepository = record(record(response)?.repository);
    const fail = () => new GithubFailure("Invalid GitHub default-branch history.", new Date(now().getTime() + 30000).toISOString());
    if (!rawRepository) throw fail();
    const { people, personId } = createPeopleRegistry(roster);
    const branch = rawRepository.defaultBranchRef;
    let nodes: unknown[] = [];
    let hasNextPage = false;
    if (branch !== null) {
      const target = record(record(branch)?.target);
      const history = record(target?.history);
      const pageInfo = record(history?.pageInfo);
      if (target?.__typename !== "Commit" || !history || !Array.isArray(history.nodes) ||
        typeof pageInfo?.hasNextPage !== "boolean" ||
        (pageInfo.endCursor !== null && typeof pageInfo.endCursor !== "string") ||
        (pageInfo.hasNextPage && !pageInfo.endCursor)) throw fail();
      nodes = history.nodes;
      hasNextPage = pageInfo.hasNextPage;
    }
    const commits = new Map<string, CodeCommit>();
    let invalid = nodes.length > 10;
    let missingStats = 0;
    for (const node of nodes.slice(0, 10)) {
      const raw = record(node);
      const parentCount = measured(record(raw?.parents)?.totalCount);
      if (!raw || typeof raw.oid !== "string" || !/^[a-f0-9]{40}$/i.test(raw.oid) ||
        typeof raw.committedDate !== "string" || !Number.isFinite(Date.parse(raw.committedDate)) ||
        typeof raw.url !== "string" || raw.url !== `${repository.url}/commit/${raw.oid}` || parentCount === null) {
        invalid = true;
        continue;
      }
      if (parentCount > 1) continue;
      const sha = raw.oid.toLowerCase();
      if (commits.has(sha)) continue;
      const linked = record(record(raw.author)?.user);
      const author = { id: linked?.databaseId as number, login: linked?.login as string };
      const additions = measured(raw.additions);
      const deletions = measured(raw.deletions);
      if (additions === null || deletions === null) missingStats += 1;
      commits.set(sha, {
        id: `${repository.id}:commit:${sha}`, repositoryId: repository.id, sha, url: raw.url,
        authorPersonId: validUser(author) ? personId(author) : null,
        committedAt: raw.committedDate, additions, deletions,
        isBot: validUser(author) && author.login.endsWith("[bot]"),
      });
    }
    const captureComplete = !hasNextPage && !invalid;
    return {
      code: {
        repositoryId: repository.id, status: captureComplete && !missingStats ? "ready" : "partial",
        fetchedAt: now().toISOString(), detailReadLimit: null,
        commits: [...commits.values()].sort((a, b) => b.committedAt.localeCompare(a.committedAt) || a.sha.localeCompare(b.sha)),
        captureComplete, retryAt: invalid || missingStats ? new Date(now().getTime() + 900000).toISOString() : null,
        message: [captureComplete ? "Captured default-branch non-merge commits." : "Partial capture · latest 10 default-branch records; merge commits excluded.",
          missingStats ? `${missingStats} commits have unknown changed-line totals.` : "Changed lines measured by GitHub commit history.",
          invalid ? "Malformed history records were excluded." : ""].filter(Boolean).join(" "),
      },
      people: [...people.values()],
    };
  };
}
