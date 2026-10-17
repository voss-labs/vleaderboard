import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshotContext } from "../app/snapshot-context.server.ts";
import { InvalidSnapshotRequest } from "../app/data/snapshot-request.server.ts";
import { createStoredSnapshotReader, refreshStoredSnapshot, SNAPSHOT_FRESHNESS_MS, SNAPSHOT_KEY } from "../app/data/stored-snapshot.server.ts";
import { assertPublicSnapshot } from "../app/data/snapshot-validation.server.ts";
import type { OfficeSnapshot } from "../app/data/types.ts";
import { loader as apiLoader } from "../app/routes/api.snapshot.ts";
import type { Route } from "../app/routes/+types/api.snapshot";

function storage() {
  let value: string | null = null;
  let reads = 0;
  let writes = 0;
  return {
    async get(key: string) { assert.equal(key, SNAPSHOT_KEY); reads += 1; return value; },
    async put(key: string, json: string) { assert.equal(key, SNAPSHOT_KEY); writes += 1; value = json; },
    replace(json: string | null) { value = json; },
    get value() { return value; }, get reads() { return reads; }, get writes() { return writes; },
  };
}

function source() {
  let clock = Date.parse("2026-10-17T10:00:00.000Z");
  let failure: "network" | "auth" | "graphql" | "catalog" | "stats" | null = null;
  let requests = 0;
  const tokens: (string | null)[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests += 1;
    tokens.push(new Headers(init?.headers).get("authorization"));
    if (failure === "network") throw new Error("Upstream failed with sensitive diagnostics");
    if (failure === "auth") return new Response("", { status: 401 });
    if (String(input).includes("/orgs/")) return Response.json([{ id: 123, name: "project", private: false,
      owner: { login: "voss-labs" }, archived: false, fork: false }], {
      headers: failure === "catalog" ? { Link: '<https://api.github.com/next>; rel="next"' } : {},
    });
    if (String(input).endsWith("/graphql")) {
      if (failure === "graphql") return Response.json({ errors: [{ type: "FORBIDDEN", message: "Sensitive upstream message runtime-secret" }] });
      return Response.json({ data: { repository: { defaultBranchRef: { target: { __typename: "Commit", history: {
        nodes: [{ oid: "a".repeat(40), url: `https://github.com/voss-labs/project/commit/${"a".repeat(40)}`,
          committedDate: "2026-10-16T10:00:00Z", additions: failure === "stats" ? null : 2, deletions: 0,
          parents: { totalCount: 1 }, author: { user: { databaseId: 86048671, login: "harshalmore31" } } }],
        pageInfo: { hasNextPage: true, endCursor: "older" },
      } } } } } });
    }
    return Response.json([{ number: 1, title: "Public PR", state: "closed",
      user: { id: 86048671, login: "harshalmore31" }, created_at: "2026-10-15T10:00:00Z",
      updated_at: "2026-10-16T10:00:00Z", merged_at: "2026-10-16T10:00:00Z" }]);
  };
  return {
    fetcher, tokens, now: () => new Date(clock),
    advance(ms: number) { clock += ms; }, fail(next: typeof failure) { failure = next; },
    get requests() { return requests; },
  };
}

function args(url: string, store: ReturnType<typeof storage>, method = "GET"): Route.LoaderArgs {
  return {
    request: new Request(url, { method }), url: new URL(url), params: {}, pattern: "/api/snapshot",
    context: createSnapshotContext(createStoredSnapshotReader(store)),
  };
}

async function captured() {
  const store = storage();
  const github = source();
  const result = await refreshStoredSnapshot({ SNAPSHOTS: store, GITHUB_TOKEN: "runtime-secret-one" }, github);
  assert.equal(result.published, true);
  return { store, github };
}

test("scheduled capture validates and publishes a bounded public snapshot with the runtime secret", async () => {
  const { store, github } = await captured();
  assert.equal(github.requests, 3);
  assert.deepEqual(github.tokens, Array(3).fill("Bearer runtime-secret-one"));
  assert.equal(store.writes, 1);
  assert.equal(store.reads, 0);
  const document = JSON.parse(store.value!);
  assert.equal(document.version, 1);
  assert.equal(document.capturedAt, github.now().toISOString());
  assertPublicSnapshot(document.snapshot);
  assert.equal(document.snapshot.source.status, "partial");
  assert.equal(document.snapshot.code[0].captureComplete, false);
  assert.ok(!store.value!.includes("runtime-secret"));
  await refreshStoredSnapshot({ SNAPSHOTS: store, GITHUB_TOKEN: "runtime-secret-two" }, github);
  assert.deepEqual(github.tokens.slice(3), Array(3).fill("Bearer runtime-secret-two"));
  assert.equal(store.writes, 2);
});

test("failed authentication, GraphQL, incomplete catalog and failed measurements retain last good KV", async () => {
  const { store, github } = await captured();
  const good = store.value;
  for (const failure of ["network", "auth", "graphql", "catalog", "stats"] as const) {
    github.fail(failure);
    const result = await refreshStoredSnapshot({ SNAPSHOTS: store, GITHUB_TOKEN: "runtime-secret" }, github);
    assert.equal(result.published, false, failure);
    assert.equal(store.value, good, failure);
    assert.equal(store.writes, 1, failure);
  }
});

test("missing token and exhausted invocation budget never replace the previous document", async () => {
  const { store, github } = await captured();
  const good = store.value;
  const count = github.requests;
  assert.deepEqual(await refreshStoredSnapshot({ SNAPSHOTS: store, GITHUB_TOKEN: "" }, github), { published: false, reason: "missing-token" });
  assert.equal(github.requests, count);
  const result = await refreshStoredSnapshot({ SNAPSHOTS: store, GITHUB_TOKEN: "runtime-secret" }, { ...github, requestLimit: 1 });
  assert.equal(result.published, false);
  assert.equal(store.value, good);
  assert.equal(store.writes, 1);
});

test("capture diagnostics retain safe failure categories through the cache without upstream text or secrets", async () => {
  const { store, github } = await captured();
  const good = store.value;
  for (const [failure, category, endpoint, httpStatus, graphqlCode] of [
    ["network", "network", "catalog", undefined, undefined],
    ["auth", "http", "catalog", 401, undefined],
    ["graphql", "graphql", "graphql", 200, "FORBIDDEN"],
    ["stats", "validation", undefined, undefined, undefined],
  ] as const) {
    github.fail(failure);
    const result = await refreshStoredSnapshot({ SNAPSHOTS: store, GITHUB_TOKEN: "runtime-secret" }, github);
    assert.equal(result.published, false);
    if (result.published || !result.diagnostics) throw new Error("Expected diagnostics");
    assert.equal(result.diagnostics.category, category);
    assert.equal("endpoint" in result.diagnostics ? result.diagnostics.endpoint : undefined, endpoint);
    assert.equal("httpStatus" in result.diagnostics ? result.diagnostics.httpStatus : undefined, httpStatus);
    assert.equal("graphqlCode" in result.diagnostics ? result.diagnostics.graphqlCode : undefined, graphqlCode);
    assert.equal(result.diagnostics.stage, "validate");
    assert.equal(result.diagnostics.requests, failure === "network" || failure === "auth" ? 1 : 3);
    assert.equal(store.value, good);
    assert.doesNotMatch(JSON.stringify(result), /Sensitive|sensitive|runtime-secret|Permission|headers|Authorization|query/);
  }
});

test("storage failure is distinct from upstream failure and preserves the exact previous document", async () => {
  const { store, github } = await captured();
  const good = store.value;
  const result = await refreshStoredSnapshot({ GITHUB_TOKEN: "runtime-secret", SNAPSHOTS: {
    get: store.get, async put() { throw new Error("Private KV details runtime-secret"); },
  } }, github);
  assert.equal(result.published, false);
  if (result.published || !result.diagnostics) throw new Error("Expected diagnostics");
  assert.equal(result.diagnostics.stage, "store");
  assert.equal(result.diagnostics.category, "storage");
  assert.equal(result.diagnostics.requests, 3);
  assert.equal(result.diagnostics.repositories, 1);
  assert.equal(store.value, good);
  assert.doesNotMatch(JSON.stringify(result), /Private|runtime-secret/);
});

test("HTTP readers only read KV; age marks all repository coverage stale without losing data", async () => {
  const { store, github } = await captured();
  const read = createStoredSnapshotReader(store, github);
  const first = await read({ mode: "github", repositoryId: "github:123" });
  assert.equal(first.source.status, "partial");
  github.advance(SNAPSHOT_FRESHNESS_MS);
  const stale = await read({ mode: "github" });
  assert.equal(stale.source.status, "stale");
  assert.equal(stale.work[0].status, "stale");
  assert.equal(stale.code![0].status, "stale");
  assert.deepEqual(stale.work[0].pulls, first.work[0].pulls);
  assert.deepEqual(stale.code![0].commits, first.code![0].commits);
  assert.equal(github.requests, 3);
  assert.equal(store.writes, 1);
  assert.equal(store.reads, 2);
});

test("unprimed, corrupt, wrong-source, stale-schema and broken-relationship documents stay unavailable", async () => {
  const { store, github } = await captured();
  const good = JSON.parse(store.value!);
  const variants: (string | null)[] = [null, "{", "null", "[]", JSON.stringify({ ...good, version: 2 }),
    JSON.stringify({ ...good, capturedAt: "invalid" }),
    JSON.stringify({ ...good, capturedAt: "2099-01-01T00:00:00Z" })];
  for (const change of [
    (snapshot: OfficeSnapshot) => { snapshot.source.mode = "preview"; },
    (snapshot: OfficeSnapshot) => { snapshot.work = []; },
    (snapshot: OfficeSnapshot) => { snapshot.work[0].pulls![0].authorPersonId = "unknown"; },
    (snapshot: OfficeSnapshot) => { snapshot.repositories[0].url = "https://example.org/private"; },
    (snapshot: OfficeSnapshot) => { Object.assign(snapshot, { token: "must-not-escape" }); },
  ]) {
    const document = structuredClone(good); change(document.snapshot); variants.push(JSON.stringify(document));
  }
  for (const value of variants) {
    store.replace(value);
    const snapshot = await createStoredSnapshotReader(store, github)({ mode: "github" });
    assert.equal(snapshot.source.mode, "github");
    assert.equal(snapshot.source.status, "unavailable");
    assert.equal(snapshot.source.fetchedAt, null);
    assert.deepEqual(snapshot.repositories, []);
    assert.deepEqual(snapshot.work, []);
    assert.deepEqual(snapshot.activity, []);
    assert.ok(snapshot.people.every((person) => person.kind === "named"));
  }
  assert.equal(github.requests, 3);
});

test("explicit preview policy and malformed IDs reject before storage; allowed fixtures never seed KV", async () => {
  const store = storage();
  const read = createStoredSnapshotReader(store);
  await assert.rejects(read({ mode: "preview" }), InvalidSnapshotRequest);
  await assert.rejects(read({ mode: "github", repositoryId: "bad" }), InvalidSnapshotRequest);
  await assert.rejects(read({ mode: "github", repositoryId: "" }), InvalidSnapshotRequest);
  assert.equal(store.reads, 0);
  const preview = await createStoredSnapshotReader(store, { allowPreview: true })({ mode: "preview" });
  assert.equal(preview.source.mode, "preview");
  assert.equal(store.reads, 0);
  assert.equal(store.writes, 0);
});

test("typed API contexts isolate readers and preserve no-store and validation status codes", async () => {
  const { store, github } = await captured();
  const empty = storage();
  const first = await apiLoader(args("http://local/api/snapshot", store));
  const second = await apiLoader(args("http://local/api/snapshot", empty));
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal((await first.json<OfficeSnapshot>()).repositories.length, 1);
  assert.equal((await second.json<OfficeSnapshot>()).source.status, "unavailable");
  const reads = store.reads;
  for (const query of ["mode=preview", "mode=other", "repositoryId=broken"]) {
    assert.equal((await apiLoader(args(`http://local/api/snapshot?${query}`, store))).status, 400);
  }
  assert.equal((await apiLoader(args("http://local/api/snapshot", store, "POST"))).status, 405);
  assert.equal(store.reads, reads);
  assert.equal((await apiLoader(args("http://local/api/snapshot?repositoryId=github:999", store))).status, 400);
  assert.equal(github.requests, 3);
});
