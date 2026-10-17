export type GithubFailureCategory = "network" | "timeout" | "deadline" | "request-limit" | "http" | "rate-limit" | "graphql" | "invalid-response" | "missing-token";
export type GithubGraphqlCode = "RATE_LIMITED" | "FORBIDDEN" | "NOT_FOUND" | "UNAUTHORIZED" | "INTERNAL";
export type GithubDiagnostic = {
  endpoint: "catalog" | "pulls" | "graphql";
  requests: number;
  category?: GithubFailureCategory;
  httpStatus?: number;
  graphqlCode?: GithubGraphqlCode;
};

export class GithubFailure extends Error {
  retryAt: string;
  category: GithubFailureCategory;
  constructor(message: string, retryAt: string, category: GithubFailureCategory = "invalid-response") {
    super(message);
    this.name = "GithubFailure";
    this.retryAt = retryAt;
    this.category = category;
  }
}

export function retryTime(headers: Headers, now: number): number {
  const retry = headers.get("retry-after");
  const seconds = retry !== null ? Number(retry) : NaN;
  const date = retry !== null ? Date.parse(retry) : NaN;
  const reset = Number(headers.get("x-ratelimit-reset")) * 1000;
  const declared = Number.isFinite(seconds) ? now + seconds * 1000
    : Number.isFinite(date) ? date : reset;
  return Math.max(now + 60000, Number.isFinite(declared) ? declared : 0);
}
