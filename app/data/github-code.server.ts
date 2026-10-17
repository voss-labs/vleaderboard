import { CAPTURE_PAGE_SIZE } from "./capture-limits.ts";
import { GithubFailure } from "./github-failure.server.ts";
import { createPeopleRegistry, validUser, type GithubUser } from "./github-identity.ts";
import type { GraphqlRequest } from "./github-request.server.ts";
import type { CodeCommit, Person, Repository, RepositoryCode } from "./types.ts";

export type CodeResult = { code: RepositoryCode; people: Person[] };

const historyQuery = `query DefaultBranchHistory($name: String!, $cursor: String) {
  repository(owner: "voss-labs", name: $name) {
    defaultBranchRef {
      target {
        __typename
        ... on Commit {
          oid
          history(first: ${CAPTURE_PAGE_SIZE}, after: $cursor) {
            totalCount
            nodes {
              oid url messageHeadline committedDate additions deletions
              parents { totalCount }
              author { user { databaseId login } }
              associatedPullRequests(first: 5) {
                nodes { merged baseRepository { nameWithOwner } author { __typename ... on User { databaseId login } } }
              }
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

/** GitHub cannot link a commit whose author email is unverified; the merged PR that landed it still has a linked author. */
function mergedPullRequestAuthor(raw: Record<string, unknown>, repository: Repository): GithubUser | null {
  const nodes = record(raw.associatedPullRequests)?.nodes;
  if (!Array.isArray(nodes)) return null;
  const authors = new Map<number, GithubUser>();
  for (const node of nodes) {
    const pull = record(node);
    const base = record(pull?.baseRepository)?.nameWithOwner;
    if (pull?.merged !== true || typeof base !== "string" || base.toLowerCase() !== repository.fullName.toLowerCase()) continue;
    const author = record(pull.author);
    const user = { id: author?.databaseId as number, login: author?.login as string };
    if (author?.__typename !== "User" || !validUser(user)) return null;
    authors.set(user.id, user);
  }
  return authors.size === 1 ? [...authors.values()][0] : null;
}

export function createCodeReader(request: GraphqlRequest, now: () => Date) {
  return async function code(repository: Repository, roster: Person[]): Promise<CodeResult> {
    const fail = () => new GithubFailure("Invalid or incomplete GitHub default-branch history.", new Date(now().getTime() + 30000).toISOString());
    const { people, personId } = createPeopleRegistry(roster);
    const commits = new Map<string, CodeCommit>();
    const seen = new Set<string>();
    const cursors = new Set<string>();
    let cursor: string | undefined;
    let head: string | undefined;
    let expected: number | undefined;
    let missingStats = 0;
    while (true) {
      const response = await request<unknown>(historyQuery, { name: repository.name, ...(cursor ? { cursor } : {}) });
      const rawRepository = record(record(response)?.repository);
      if (!rawRepository) throw fail();
      const branch = rawRepository.defaultBranchRef;
      if (branch === null) {
        if (cursor) throw fail();
        break;
      }
      const target = record(record(branch)?.target);
      const history = record(target?.history);
      const pageInfo = record(history?.pageInfo);
      const total = measured(history?.totalCount);
      if (target?.__typename !== "Commit" || typeof target.oid !== "string" || !/^[a-f0-9]{40}$/.test(target.oid) ||
        (head !== undefined && target.oid !== head) || !history || !Array.isArray(history.nodes) ||
        history.nodes.length > CAPTURE_PAGE_SIZE || total === null || total < 1 ||
        expected !== undefined && total !== expected || typeof pageInfo?.hasNextPage !== "boolean" ||
        typeof pageInfo.endCursor !== "string" || !pageInfo.endCursor || cursors.has(pageInfo.endCursor) ||
        !history.nodes.length || pageInfo.hasNextPage && history.nodes.length !== CAPTURE_PAGE_SIZE) throw fail();
      head = target.oid;
      expected = total;
      if (!cursor && record(history.nodes[0])?.oid !== head) throw fail();
      for (const node of history.nodes) {
        const raw = record(node);
        const parentCount = measured(record(raw?.parents)?.totalCount);
        if (!raw || typeof raw.oid !== "string" || !/^[a-f0-9]{40}$/.test(raw.oid) || seen.has(raw.oid) ||
          typeof raw.messageHeadline !== "string" || raw.messageHeadline.length > 20000 ||
          typeof raw.committedDate !== "string" || !Number.isFinite(Date.parse(raw.committedDate)) ||
          typeof raw.url !== "string" || raw.url !== `${repository.url}/commit/${raw.oid}` || parentCount === null) throw fail();
        seen.add(raw.oid);
        if (parentCount > 1) continue;
        const linked = record(record(raw.author)?.user);
        const committer = { id: linked?.databaseId as number, login: linked?.login as string };
        const pullAuthor = validUser(committer) ? null : mergedPullRequestAuthor(raw, repository);
        const author = pullAuthor ?? committer;
        const additions = measured(raw.additions);
        const deletions = measured(raw.deletions);
        if (raw.additions != null && additions === null || raw.deletions != null && deletions === null) throw fail();
        if (additions === null || deletions === null) missingStats += 1;
        commits.set(raw.oid, {
          id: `${repository.id}:commit:${raw.oid}`, repositoryId: repository.id, sha: raw.oid, url: raw.url,
          messageHeadline: raw.messageHeadline, authorPersonId: validUser(author) ? personId(author) : null,
          committedAt: raw.committedDate, additions, deletions,
          isBot: validUser(author) && author.login.endsWith("[bot]"),
          ...(pullAuthor ? { attributedBy: "pull-request" as const } : {}),
        });
      }
      if (seen.size > total || pageInfo.hasNextPage && seen.size >= total) throw fail();
      cursors.add(pageInfo.endCursor);
      if (!pageInfo.hasNextPage) {
        if (seen.size !== total) throw fail();
        break;
      }
      cursor = pageInfo.endCursor;
    }
    return {
      code: {
        repositoryId: repository.id, status: missingStats ? "partial" : "ready",
        fetchedAt: now().toISOString(), detailReadLimit: null,
        commits: [...commits.values()].sort((a, b) => b.committedAt.localeCompare(a.committedAt) || a.sha.localeCompare(b.sha)),
        captureComplete: true, retryAt: null,
        message: `Complete available default-branch non-merge commit history captured. ${missingStats
          ? `${missingStats} commits have unknown changed-line totals.` : "Changed lines measured by GitHub commit history."}`,
      },
      people: [...people.values()],
    };
  };
}
