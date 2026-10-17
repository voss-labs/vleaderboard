import assert from "node:assert/strict";
import test from "node:test";
import { createGithubClient, GithubFailure } from "../app/data/github.server.ts";
import { createSnapshotLoader } from "../app/data/load-snapshot.server.ts";
import { createContributorReport } from "../app/data/contributor-report.ts";
import { historyCoverage } from "../app/data/history-coverage.ts";
import { assertCompletePublicSnapshot } from "../app/data/snapshot-validation.server.ts";
import { refreshStoredSnapshot } from "../app/data/stored-snapshot.server.ts";
import { createRoster } from "../app/data/roster.ts";
import { fixtureToken, historyResponse, rawCommit, sha } from "./github-fixtures.ts";

const capturedAt = "2026-10-17T12:00:00Z";
const parth = { databaseId: 149477150, login: "parth" };
const historicalSha = "2189670e140eefffa8041e53de47655d8669059f";
const roster = createRoster();

function pull(number: number) {
  return { number, title: `PR ${number}`, state: "closed", user: { id: parth.databaseId, login: parth.login },
    created_at: "2026-09-01T00:00:00Z", updated_at: "2026-10-02T00:00:00Z",
    merged_at: "2026-10-02T00:00:00Z" as string | null, closed_at: "2026-10-02T00:00:00Z" as string | null };
}

function historySource(count = 205, prCount = 205, repositoryCount = 1) {
  const commits = Array.from({ length: count }, (_, index) => rawCommit(index + 1, null));
  if (commits.length > 10) Object.assign(commits[10], { oid: historicalSha, messageHeadline: "Restore exact historical contribution",
    committedDate: "2026-10-02T17:54:21Z", additions: 744, deletions: 213, author: { user: parth } });
  const pulls = Array.from({ length: prCount }, (_, index) => pull(index + 1));
  if (pulls.length >= 3) {
    Object.assign(pulls[0], { state: "open", merged_at: null, closed_at: null });
    Object.assign(pulls[1], { merged_at: null });
    Object.assign(pulls[2], { user: { id: 600, login: "automation[bot]" } });
  }
  const requests: { url: URL; variables: Record<string, string> }[] = [];
  let active = 0;
  let maxActive = 0;
  let mutateHistory: (response: ReturnType<typeof historyResponse>, offset: number) => void = () => {};
  let mutatePulls: (nodes: ReturnType<typeof pull>[], page: number) => ReturnType<typeof pull>[] = (nodes) => nodes;
  let mutateLink: (link: string, page: number) => string = (link) => link;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const variables = init?.body ? JSON.parse(String(init.body)).variables : {};
    requests.push({ url, variables });
    active += 1; maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active -= 1;
    if (url.pathname.includes("/orgs/")) return Response.json(Array.from({ length: repositoryCount }, (_, index) => ({
      id: 1000 + index, name: `repo-${index}`, private: false, owner: { login: "voss-labs" }, archived: false, fork: false,
    })));
    if (url.pathname === "/graphql") {
      if (!commits.length) return Response.json({ data: { repository: { defaultBranchRef: null } } });
      const offset = Number(variables.cursor?.replace("offset-", "") ?? 0);
      const page = commits.slice(offset, offset + 100);
      const response = historyResponse(page, offset + page.length < commits.length, variables.name, {
        head: commits[0]?.oid, totalCount: commits.length, endCursor: `offset-${offset + page.length}`,
      });
      mutateHistory(response, offset);
      return Response.json(response);
    }
    assert.equal(url.searchParams.get("sort"), "created");
    assert.equal(url.searchParams.get("direction"), "asc");
    const page = Number(url.searchParams.get("page"));
    const nextUrl = new URL(url); nextUrl.searchParams.set("page", String(page + 1));
    const link = mutateLink(page * 100 < pulls.length ? `<${nextUrl}>; rel="next"` : "", page);
    return Response.json(mutatePulls(pulls.slice((page - 1) * 100, page * 100), page), { headers: link ? { link } : {} });
  };
  return { fetcher, token: fixtureToken, now: () => new Date(capturedAt), requests, commits, pulls,
    get maxActive() { return maxActive; },
    changeHistory(fn: typeof mutateHistory) { mutateHistory = fn; },
    changePulls(fn: typeof mutatePulls) { mutatePulls = fn; },
    changeLink(fn: typeof mutateLink) { mutateLink = fn; },
  };
}

test("all commit and PR pages remain available and restore Parth beyond record ten", async () => {
  const source = historySource();
  source.commits[2].parents.totalCount = 2;
  const snapshot = await createSnapshotLoader(source)({ mode: "github" });
  assertCompletePublicSnapshot(snapshot);
  assert.deepEqual(historyCoverage(snapshot), { pullRequests: true, commits: true, complete: true });
  assert.equal(source.requests.length, 7);
  assert.equal(snapshot.code![0].commits!.length, 204);
  assert.equal(snapshot.work[0].pulls!.length, 205);
  assert.deepEqual(source.requests.filter((entry) => entry.url.pathname === "/graphql").map((entry) => entry.variables.cursor),
    [undefined, "offset-100", "offset-200"]);
  const commit = snapshot.code![0].commits!.find((entry) => entry.sha === historicalSha)!;
  assert.equal(snapshot.people.find((person) => person.id === commit.authorPersonId)?.github?.id, 149477150);
  assert.deepEqual([commit.messageHeadline, commit.committedAt, commit.additions, commit.deletions],
    ["Restore exact historical contribution", "2026-10-02T17:54:21Z", 744, 213]);
  assert.equal(commit.url, `https://github.com/voss-labs/repo-0/commit/${historicalSha}`);
  for (const period of ["month", "all"] as const) {
    const report = createContributorReport(snapshot, period);
    const row = report.contributors.find((person) => person.id === commit.authorPersonId)!;
    assert.deepEqual([row.capturedCommits, row.additions, row.deletions, row.merged], [1, 744, 213, 202]);
    assert.equal(row.opened, period === "month" ? 0 : 204);
    assert.equal(report.coverage.history.complete, true);
  }
  assert.deepEqual(snapshot.work[0].pulls!.slice(0, 3).map((entry) => [entry.state, entry.closedAt, entry.mergedAt]),
    [["open", null, null], ["closed", "2026-10-02T00:00:00Z", null], ["merged", "2026-10-02T00:00:00Z", "2026-10-02T00:00:00Z"]]);
});

test("history rejects changed heads, cursor cycles, duplicate pages, gaps and contradictory exhaustion", async () => {
  const mutations = [
    (response: ReturnType<typeof historyResponse>, offset: number) => { if (offset) response.data.repository.defaultBranchRef.target.oid = sha(999); },
    (response: ReturnType<typeof historyResponse>, offset: number) => { if (offset) response.data.repository.defaultBranchRef.target.history.pageInfo.endCursor = "offset-100"; },
    (response: ReturnType<typeof historyResponse>, offset: number) => { if (offset) response.data.repository.defaultBranchRef.target.history.nodes[0] = historyResponse([rawCommit(1, null)]).data.repository.defaultBranchRef.target.history.nodes[0]; },
    (response: ReturnType<typeof historyResponse>) => { response.data.repository.defaultBranchRef.target.history.totalCount = 206; },
    (response: ReturnType<typeof historyResponse>) => { response.data.repository.defaultBranchRef.target.history.pageInfo.hasNextPage = false; },
    (response: ReturnType<typeof historyResponse>) => { response.data.repository.defaultBranchRef.target.history.nodes.pop(); },
    (response: ReturnType<typeof historyResponse>) => { response.data.repository.defaultBranchRef.target.history.pageInfo.endCursor = null; },
    (response: ReturnType<typeof historyResponse>, offset: number) => { if (offset) response.data.repository.defaultBranchRef.target.history.totalCount += 1; },
  ];
  for (const mutation of mutations) {
    const source = historySource(); source.changeHistory(mutation);
    const client = createGithubClient(source);
    const repository = (await client.catalog()).repositories[0];
    await assert.rejects(client.code(repository, roster), GithubFailure);
  }
});

test("PR traversal rejects repeated pages, ordering gaps, short next pages and unsafe or skipped next links", async () => {
  for (const change of [
    (source: ReturnType<typeof historySource>) => source.changePulls((nodes, page) => page === 2 ? source.pulls.slice(0, 100) : nodes),
    (source: ReturnType<typeof historySource>) => source.changePulls((nodes, page) => page === 2 ? nodes.map((entry) => ({ ...entry, created_at: "2026-08-01T00:00:00Z" })) : nodes),
    (source: ReturnType<typeof historySource>) => source.changePulls((nodes, page) => page === 1 ? nodes.slice(1) : nodes),
    (source: ReturnType<typeof historySource>) => source.changePulls((nodes, page) => page === 3 ? [] : nodes),
    (source: ReturnType<typeof historySource>) => source.changeLink((link) => link.replace("page=2", "page=3")),
    (source: ReturnType<typeof historySource>) => source.changeLink((link) => link.replace("api.github.com", "example.org")),
    (source: ReturnType<typeof historySource>) => source.changeLink((link) => link.replace("/repos/voss-labs/repo-0", "/repositories/999")),
    (source: ReturnType<typeof historySource>) => source.changeLink((link) => link.replace('rel="next"', 'rel="last"')),
  ]) {
    const source = historySource(); change(source);
    const client = createGithubClient(source);
    const repository = (await client.catalog()).repositories[0];
    await assert.rejects(client.work(repository, roster));
  }
});

test("every pagination request shares the allowance and maximum three concurrent reads", async () => {
  const source = historySource(205, 205, 3);
  const snapshot = await createSnapshotLoader(source)({ mode: "github" });
  assertCompletePublicSnapshot(snapshot);
  assert.equal(source.requests.length, 19);
  assert.equal(source.maxActive, 3);
  const limited = historySource();
  const partial = await createSnapshotLoader({ ...limited, requestLimit: 4 })({ mode: "github" });
  assert.equal(limited.requests.length, 4);
  assert.equal(historyCoverage(partial).complete, false);
  assert.throws(() => assertCompletePublicSnapshot(partial));
});

test("a later page failure or budget exhaustion preserves the exact last good publication", async () => {
  const source = historySource();
  let stored: string | null = null;
  let writes = 0;
  const env = { GITHUB_TOKEN: fixtureToken, SNAPSHOTS: {
    async get() { return stored; }, async put(_key: string, value: string) { stored = value; writes += 1; },
  } };
  assert.equal((await refreshStoredSnapshot(env, source)).published, true);
  const good = stored;
  source.changeHistory((response, offset) => { if (offset) response.data.repository.defaultBranchRef.target.history.nodes.pop(); });
  assert.equal((await refreshStoredSnapshot(env, source)).published, false);
  assert.equal(stored, good);
  source.changeHistory(() => {});
  assert.equal((await refreshStoredSnapshot(env, { ...source, requestLimit: 4 })).published, false);
  assert.equal(stored, good);
  assert.equal(writes, 1);
});

test("empty histories and an exactly full terminal page are complete without an extra request", async () => {
  for (const count of [0, 100]) {
    const source = historySource(count, count);
    const snapshot = await createSnapshotLoader(source)({ mode: "github" });
    assertCompletePublicSnapshot(snapshot);
    assert.equal(source.requests.length, 3);
    assert.equal(snapshot.work[0].pulls!.length, count);
    assert.equal(snapshot.code![0].commits!.length, count);
  }
});

test("null and missing changed lines stay unknown while exhausted history retains completeness", async () => {
  for (const value of [null, undefined]) {
    const source = historySource(11, 3);
    Object.assign(source.commits[10], { additions: value, deletions: value });
    const snapshot = await createSnapshotLoader(source)({ mode: "github" });
    assertCompletePublicSnapshot(snapshot);
    const report = createContributorReport(snapshot, "all");
    const row = report.contributors.find((person) => person.login === "parth")!;
    assert.deepEqual([row.capturedCommits, row.additions, row.deletions, row.codeStatus], [1, null, null, "partial"]);
    assert.equal(report.coverage.history.complete, true);
    assert.equal(report.coverage.code.status, "partial");
  }
});

test("canonical numeric repository pagination links preserve the captured repository scope", async () => {
  const source = historySource(101, 101);
  source.changeLink((link) => link.replace("/repos/voss-labs/repo-0", "/repositories/1000"));
  const snapshot = await createSnapshotLoader(source)({ mode: "github" });
  assertCompletePublicSnapshot(snapshot);
  assert.equal(snapshot.work[0].pulls!.length, 101);
  assert.equal(source.requests.length, 5);
  assert.ok(source.requests.filter((entry) => entry.url.pathname.includes("/pulls")).every((entry) =>
    entry.url.pathname === "/repos/voss-labs/repo-0/pulls"));
});

test("malformed non-null changed-line measurements reject publication and retain last good bytes", async () => {
  const source = historySource();
  let stored: string | null = null;
  let writes = 0;
  const env = { GITHUB_TOKEN: fixtureToken, SNAPSHOTS: {
    async get() { return stored; }, async put(_key: string, value: string) { stored = value; writes += 1; },
  } };
  assert.equal((await refreshStoredSnapshot(env, source)).published, true);
  const good = stored;
  for (const field of ["additions", "deletions"]) {
    for (const value of [-1, 0.5, "12", false, {}, Number.MAX_SAFE_INTEGER + 1]) {
      source.changeHistory((response, offset) => {
        if (offset === 100) Object.assign(response.data.repository.defaultBranchRef.target.history.nodes[0]!, { [field]: value });
      });
      assert.equal((await refreshStoredSnapshot(env, source)).published, false, `${field}: ${JSON.stringify(value)}`);
      assert.equal(stored, good);
      assert.equal(writes, 1);
    }
  }
});
