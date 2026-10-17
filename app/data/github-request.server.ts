import { CAPTURE_DEADLINE_MS, CAPTURE_REQUEST_LIMIT } from "./capture-limits.ts";
import { GithubFailure, retryTime } from "./github-failure.server.ts";
import type { GithubDiagnostic, GithubGraphqlCode } from "./github-failure.server.ts";

export type GithubOptions = {
  fetcher?: typeof fetch;
  now?: () => Date;
  token?: string;
  requestLimit?: number;
  deadlineMs?: number;
  requestTimeoutMs?: number;
  onDiagnostic?: (diagnostic: GithubDiagnostic) => void;
};
export type GithubRequest = <T>(path: string, shape?: "array" | "object", canonicalPath?: string) => Promise<{ data: T; next: boolean }>;
export type GraphqlRequest = <T>(query: string, variables: Record<string, string>) => Promise<T>;

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid GitHub capture allowance.");
  return value;
}

function nextPage(link: string | null, path: string, canonicalPath?: string): boolean {
  if (!link) return false;
  const current = new URL(path, "https://api.github.com");
  const page = Number(current.searchParams.get("page") ?? 1);
  current.searchParams.delete("page");
  current.searchParams.sort();
  const relations = new Map<string, number>();
  for (const part of link.split(",")) {
    const match = part.trim().match(/^<([^>]+)>;\s*rel="([a-z ]+)"$/);
    if (!match) throw new Error("Invalid GitHub pagination link.");
    const target = new URL(match[1]);
    const targetPage = target.searchParams.get("page");
    if (target.origin !== current.origin || (target.pathname !== current.pathname && target.pathname !== canonicalPath) || target.hash || target.username || target.password ||
      !targetPage || !/^[1-9]\d*$/.test(targetPage) || !Number.isSafeInteger(Number(targetPage)) || target.searchParams.getAll("page").length !== 1) {
      throw new Error("Invalid GitHub pagination progression.");
    }
    target.searchParams.delete("page"); target.searchParams.sort();
    if (target.search !== current.search) throw new Error("Invalid GitHub pagination scope.");
    for (const relation of match[2].split(" ")) {
      if (relations.has(relation)) throw new Error("Duplicate GitHub pagination relation.");
      relations.set(relation, Number(targetPage));
    }
  }
  const next = relations.get("next");
  const last = relations.get("last");
  if (next !== undefined && next !== page + 1 || last !== undefined && (last < page || next === undefined && last > page || next !== undefined && last < next)) {
    throw new Error("Incomplete GitHub pagination links.");
  }
  return next !== undefined;
}

export function createGithubTransport(options: GithubOptions) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const requestLimit = positive(options.requestLimit, CAPTURE_REQUEST_LIMIT);
  const requestTimeoutMs = positive(options.requestTimeoutMs, 8000);
  const deadline = now().getTime() + positive(options.deadlineMs, CAPTURE_DEADLINE_MS);
  let requests = 0;
  let blockedUntil = 0;
  let active = 0;
  const waiting: (() => void)[] = [];

  function deadlineRemaining() {
    const remaining = deadline - now().getTime();
    if (remaining <= 0) throw new GithubFailure("GitHub capture deadline reached. The previous snapshot is retained.", new Date(now().getTime() + 900000).toISOString(), "deadline");
    return remaining;
  }

  function limited(headers: Headers) {
    blockedUntil = retryTime(headers, now().getTime());
    return new GithubFailure("GitHub limited this snapshot. Retry is scheduled.", new Date(blockedUntil).toISOString(), "rate-limit");
  }

  async function read(path: string, payload?: { query: string; variables: Record<string, string> }, canonicalPath?: string) {
    const clock = now().getTime();
    const endpoint = payload ? "graphql" : path.startsWith("/orgs/") ? "catalog" : "pulls";
    let httpStatus: number | undefined;
    let graphqlCode: GithubGraphqlCode | undefined;
    let signal: AbortSignal | undefined;
    try {
      const remaining = deadlineRemaining();
      if (clock < blockedUntil) throw new GithubFailure("GitHub retry is scheduled.", new Date(blockedUntil).toISOString(), "rate-limit");
      if (requests >= requestLimit) throw new GithubFailure("GitHub capture request allowance reached. The previous snapshot is retained.", new Date(clock + 900000).toISOString(), "request-limit");
      requests += 1;
      options.onDiagnostic?.({ endpoint, requests });
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json", "User-Agent": "vleaderboard-public-snapshot",
        "X-GitHub-Api-Version": "2026-03-10",
      };
      if (options.token) headers.Authorization = `Bearer ${options.token}`;
      if (payload) headers["Content-Type"] = "application/json";
      signal = AbortSignal.timeout(Math.min(requestTimeoutMs, remaining));
      const response = await fetcher(`https://api.github.com${path}`, {
        method: payload ? "POST" : "GET", headers,
        body: payload ? JSON.stringify(payload) : undefined,
        signal, redirect: "manual",
      });
      httpStatus = response.status;
      deadlineRemaining();
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429 || response.status === 403 &&
          (response.headers.has("retry-after") || response.headers.get("x-ratelimit-remaining") === "0")) throw limited(response.headers);
        throw new GithubFailure("Public GitHub request failed.", new Date(clock + 30000).toISOString(), "http");
      }
      if (response.headers.get("x-ratelimit-remaining") === "0") blockedUntil = retryTime(response.headers, now().getTime());
      const data: unknown = await response.json();
      deadlineRemaining();
      if (payload && data && typeof data === "object" && "errors" in data) {
        const errors = (data as { errors: unknown }).errors;
        if (!Array.isArray(errors) || errors.length) {
          const codes: GithubGraphqlCode[] = ["RATE_LIMITED", "FORBIDDEN", "NOT_FOUND", "UNAUTHORIZED", "INTERNAL"];
          graphqlCode = Array.isArray(errors) ? errors.flatMap((error) => [error?.type, error?.extensions?.code]).find((code): code is GithubGraphqlCode => codes.includes(code)) : undefined;
          if (Array.isArray(errors) && errors.some((error) => error?.type === "RATE_LIMITED" || error?.extensions?.code === "RATE_LIMITED")) throw limited(response.headers);
          throw new GithubFailure("GitHub returned GraphQL errors. The previous snapshot is retained.", new Date(clock + 30000).toISOString(), "graphql");
        }
      }
      const owner = Array.isArray(data) ? data[0]?.owner : null;
      const catalogAlias = path.startsWith("/orgs/voss-labs/repos?") && Number.isSafeInteger(owner?.id) && owner.id > 0 &&
        owner.login?.toLowerCase() === "voss-labs" ? `/organizations/${owner.id}/repos` : undefined;
      return { data, next: payload ? false : nextPage(response.headers.get("link"), path, canonicalPath ?? catalogAlias) };
    } catch (error) {
      const failure = error instanceof GithubFailure ? error : new GithubFailure("Public GitHub data is temporarily unavailable.", new Date(clock + 30000).toISOString(), signal?.aborted ? "timeout" : httpStatus === undefined ? "network" : "invalid-response");
      options.onDiagnostic?.({ endpoint, requests, category: failure.category, httpStatus, graphqlCode });
      throw failure;
    }
  }

  async function acquire<T>(load: () => Promise<T>): Promise<T> {
    if (active >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
    else active += 1;
    try { return await load(); } finally {
      const resume = waiting.shift();
      if (resume) resume();
      else active -= 1;
    }
  }

  const request: GithubRequest = <T>(path: string, shape: "array" | "object" = "array", canonicalPath?: string) => acquire(async () => {
    const result = await read(path, undefined, canonicalPath);
    if (shape === "array" ? !Array.isArray(result.data) : !result.data || typeof result.data !== "object" || Array.isArray(result.data)) {
      throw new GithubFailure("Invalid public GitHub response.", new Date(now().getTime() + 30000).toISOString());
    }
    return { data: result.data as T, next: result.next };
  });

  const graphql: GraphqlRequest = <T>(query: string, variables: Record<string, string>) => acquire(async () => {
    if (!options.token?.trim()) throw new GithubFailure("GitHub code capture requires a configured token.", new Date(now().getTime() + 900000).toISOString());
    const result = await read("/graphql", { query, variables });
    const envelope = result.data;
    if (!envelope || typeof envelope !== "object" || !("data" in envelope) || !envelope.data || typeof envelope.data !== "object" || Array.isArray(envelope.data)) {
      throw new GithubFailure("Invalid GitHub GraphQL response.", new Date(now().getTime() + 30000).toISOString());
    }
    return envelope.data as T;
  });

  return { request, graphql };
}
