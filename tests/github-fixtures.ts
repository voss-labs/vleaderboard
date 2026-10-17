export const fixtureToken = "server-only-test-token";
export const sha = (number: number) => number.toString(16).padStart(40, "0");
export const rawCommit = (
  number: number, user: unknown = { databaseId: 86048671, login: "harshalmore31" }, parents = 1,
) => ({
  oid: sha(number), committedDate: "2026-10-02T12:00:00Z", additions: 25, deletions: 4,
  parents: { totalCount: parents }, author: { user },
});

export function historyResponse(nodes: unknown[] = [], next = false, name = "repo-0") {
  return { data: { repository: { defaultBranchRef: { target: { __typename: "Commit", history: {
    nodes: nodes.map((node) => node && typeof node === "object" ? {
      ...node, url: `https://github.com/voss-labs/${name}/commit/${"oid" in node ? node.oid : ""}`,
    } : node),
    pageInfo: { hasNextPage: next, endCursor: nodes.length ? "history-cursor" : null },
  } } } } } };
}

export function fakeGithub(repositoryCount = 1) {
  let clock = Date.parse("2026-10-09T08:00:00Z");
  let failure: "history" | "stats" | "object" | "rate" | "errors" | "graphql-rate" | "empty" | "missing" | null = null;
  let next = false;
  let remaining: string | null = null;
  let commits: unknown[] = [rawCommit(1)];
  let active = 0;
  let maxActive = 0;
  const urls: string[] = [];
  const requests: RequestInit[] = [];
  const catalog = Array.from({ length: repositoryCount }, (_, i) => ({ id: i + 1000, name: `repo-${i}`,
    full_name: `voss-labs/repo-${i}`, private: false, owner: { login: "voss-labs" }, archived: false, fork: false,
    pushed_at: "2026-10-08T00:00:00Z" }));
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    urls.push(url); requests.push(init ?? {});
    assertRequest(init);
    active += 1; maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active -= 1;
    const history = url.endsWith("/graphql");
    if (history && failure === "history") throw new Error("Code network failure");
    if (history && failure === "rate") return new Response("", { status: 429, headers: { "retry-after": "600" } });
    const headers: Record<string, string> = {};
    if (remaining !== null) {
      headers["x-ratelimit-remaining"] = remaining;
      headers["x-ratelimit-reset"] = String((clock + 3600000) / 1000);
    }
    if (url.includes("/orgs/")) return Response.json(catalog, { headers });
    if (history) {
      const body = JSON.parse(String(init?.body));
      const nodes = failure === "stats" ? commits.map((node) => ({ ...(node as object), additions: null, deletions: -1 })) : commits;
      let response: unknown = historyResponse(nodes, next, body.variables.name);
      if (failure === "object") response = [];
      if (failure === "errors" || failure === "graphql-rate") response = { ...response as object,
        errors: [{ type: failure === "graphql-rate" ? "RATE_LIMITED" : "FORBIDDEN", message: "Private upstream error" }] };
      if (failure === "empty") response = { data: { repository: { defaultBranchRef: null } } };
      if (failure === "missing") response = { data: { repository: null } };
      return Response.json(response, { headers });
    }
    if (url.includes("/pulls?")) return Response.json([{
      number: 1, title: "Public PR", state: "closed", user: { id: 86048671, login: "harshalmore31" },
      created_at: "2026-10-02T00:00:00Z", updated_at: "2026-10-08T00:00:00Z", merged_at: "2026-10-08T00:00:00Z",
    }], { headers });
    throw new Error("Unexpected upstream endpoint");
  };
  return { fetcher, now: () => new Date(clock), token: fixtureToken, deadlineMs: 86400000, urls, requests,
    get maxActive() { return maxActive; },
    advance(milliseconds: number) { clock += milliseconds; },
    fail(value: typeof failure) { failure = value; },
    setCommits(value: unknown[]) { commits = value; },
    paginate() { next = true; },
    remaining(value: string) { remaining = value; },
  };
}

function assertRequest(init: RequestInit | undefined) {
  if (init?.redirect !== "manual") throw new Error("Upstream redirects must be returned without following");
}
