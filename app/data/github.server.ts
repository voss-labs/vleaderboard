import type { Repository } from "./types.ts";
import { CAPTURE_PAGE_SIZE } from "./capture-limits.ts";
import { createWorkReader } from "./github-work.server.ts";
import { GithubFailure } from "./github-failure.server.ts";
import { createGithubTransport } from "./github-request.server.ts";
import type { GithubOptions } from "./github-request.server.ts";
import { createCodeReader } from "./github-code.server.ts";

export type { GithubUser } from "./github-identity.ts";
export { GithubFailure } from "./github-failure.server.ts";
type GithubRepository = {
  id: number; name: string; full_name: string; private: boolean; owner: { login: string };
  description: string | null; language: string | null; archived: boolean; fork: boolean; pushed_at: string | null;
};
export type CatalogResult = { repositories: Repository[]; complete: boolean };
export type { WorkResult } from "./github-work.server.ts";
export { normalizeWork } from "./github-work.server.ts";
export type { GithubOptions, GithubRequest } from "./github-request.server.ts";

export function createGithubClient(options: GithubOptions = {}) {
  const now = options.now ?? (() => new Date());
  const { request, graphql } = createGithubTransport(options);

  async function catalog(): Promise<CatalogResult> {
    const repositories: Repository[] = [];
    let complete = false;
    const seen = new Set<number>();
    for (let page = 1; ; page += 1) {
      const result = await request<GithubRepository[]>(`/orgs/voss-labs/repos?type=public&per_page=${CAPTURE_PAGE_SIZE}&page=${page}`);
      if (result.data.length > CAPTURE_PAGE_SIZE || result.next && result.data.length !== CAPTURE_PAGE_SIZE ||
        page > 1 && result.data.length === 0) throw new GithubFailure("Incomplete public catalog pagination.", new Date(now().getTime() + 30000).toISOString());
      for (const raw of result.data) {
        if (!raw || typeof raw !== "object") throw new GithubFailure("Invalid public catalog response.", new Date(now().getTime() + 30000).toISOString());
        if (raw.private !== false || raw.owner?.login?.toLowerCase() !== "voss-labs") continue;
        if (!raw || seen.has(raw.id) || !Number.isSafeInteger(raw.id) || raw.id < 1 || typeof raw.name !== "string" ||
          !/^[A-Za-z0-9_.-]+$/.test(raw.name)) throw new GithubFailure("Invalid public catalog response.", new Date(now().getTime() + 30000).toISOString());
        seen.add(raw.id);
        repositories.push({
          id: `github:${raw.id}`, githubId: raw.id, name: raw.name, fullName: `voss-labs/${raw.name}`,
          description: raw.description ?? null, url: `https://github.com/voss-labs/${raw.name}`,
          language: raw.language ?? null, archived: !!raw.archived, fork: !!raw.fork,
          pushedAt: raw.pushed_at ?? null, leadPersonId: null, memberPersonIds: [], assignment: "unknown",
        });
      }
      if (!result.next) { complete = true; break; }
    }
    return { repositories, complete };
  }

  return { catalog, work: createWorkReader(request, now), code: createCodeReader(graphql, now), codeDetailLimit: null };
}
