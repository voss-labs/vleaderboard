import { GithubFailure, retryTime } from "./github-failure.server.ts";

export type GithubOptions = {
  fetcher?: typeof fetch;
  now?: () => Date;
  token?: string;
  requestLimit?: number;
  deadlineMs?: number;
  requestTimeoutMs?: number;
};
export type GithubRequest = <T>(path: string, shape?: "array" | "object") => Promise<{ data: T; next: boolean }>;
export type GraphqlRequest = <T>(query: string, variables: Record<string, string>) => Promise<T>;

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid GitHub capture allowance.");
  return value;
}

export function createGithubTransport(options: GithubOptions) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const requestLimit = positive(options.requestLimit, 44);
  const requestTimeoutMs = positive(options.requestTimeoutMs, 8000);
  const deadline = now().getTime() + positive(options.deadlineMs, 45000);
  let requests = 0;
  let blockedUntil = 0;
  let active = 0;
  const waiting: (() => void)[] = [];

  function deadlineRemaining() {
    const remaining = deadline - now().getTime();
    if (remaining <= 0) throw new GithubFailure("GitHub capture deadline reached. The previous snapshot is retained.", new Date(now().getTime() + 900000).toISOString());
    return remaining;
  }

  function limited(headers: Headers) {
    blockedUntil = retryTime(headers, now().getTime());
    return new GithubFailure("GitHub limited this snapshot. Retry is scheduled.", new Date(blockedUntil).toISOString());
  }

  async function read(path: string, payload?: { query: string; variables: Record<string, string> }) {
    const clock = now().getTime();
    const remaining = deadlineRemaining();
    if (clock < blockedUntil) throw new GithubFailure("GitHub retry is scheduled.", new Date(blockedUntil).toISOString());
    if (requests >= requestLimit) throw new GithubFailure("GitHub capture request allowance reached. The previous snapshot is retained.", new Date(clock + 900000).toISOString());
    requests += 1;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json", "User-Agent": "vleaderboard-public-snapshot",
      "X-GitHub-Api-Version": "2026-03-10",
    };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (payload) headers["Content-Type"] = "application/json";
    try {
      const response = await fetcher(`https://api.github.com${path}`, {
        method: payload ? "POST" : "GET", headers,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(Math.min(requestTimeoutMs, remaining)), redirect: "error",
      });
      deadlineRemaining();
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 403 || response.status === 429) throw limited(response.headers);
        throw new Error("Public GitHub request failed");
      }
      if (response.headers.get("x-ratelimit-remaining") === "0") blockedUntil = retryTime(response.headers, now().getTime());
      const data: unknown = await response.json();
      deadlineRemaining();
      if (payload && data && typeof data === "object" && "errors" in data) {
        const errors = (data as { errors: unknown }).errors;
        if (!Array.isArray(errors) || errors.length) {
          if (Array.isArray(errors) && errors.some((error) => error?.type === "RATE_LIMITED" || error?.extensions?.code === "RATE_LIMITED")) throw limited(response.headers);
          throw new GithubFailure("GitHub returned GraphQL errors. The previous snapshot is retained.", new Date(clock + 30000).toISOString());
        }
      }
      return { data, next: /rel="next"/.test(response.headers.get("link") ?? "") };
    } catch (error) {
      if (error instanceof GithubFailure) throw error;
      throw new GithubFailure("Public GitHub data is temporarily unavailable.", new Date(clock + 30000).toISOString());
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

  const request: GithubRequest = <T>(path: string, shape: "array" | "object" = "array") => acquire(async () => {
    const result = await read(path);
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
