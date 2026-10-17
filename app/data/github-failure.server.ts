export class GithubFailure extends Error {
  retryAt: string;
  constructor(message: string, retryAt: string) {
    super(message);
    this.name = "GithubFailure";
    this.retryAt = retryAt;
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
