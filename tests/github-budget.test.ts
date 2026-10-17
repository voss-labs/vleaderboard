import assert from "node:assert/strict";
import test from "node:test";
import { createGithubClient, GithubFailure } from "../app/data/github.server.ts";
import { createGithubTransport } from "../app/data/github-request.server.ts";
import { createSnapshotLoader } from "../app/data/load-snapshot.server.ts";
import { createRoster } from "../app/data/roster.ts";
import { fakeGithub } from "./github-fixtures.ts";

const roster = createRoster();

test("sixteen public repositories require exactly 33 external requests", async () => {
  const fake = fakeGithub(16);
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(fake.urls.length, 33);
  assert.equal(fake.urls.filter((url) => url.endsWith("/graphql")).length, 16);
  assert.equal(fake.urls.filter((url) => url.includes("/pulls?")).length, 16);
  assert.equal(snapshot.repositories.length, 16);
  assert.ok(snapshot.code?.every((entry) => entry.commits?.length === 1 && entry.retryAt === null));
  assert.ok(fake.maxActive <= 3);
});

test("REST and GraphQL share three active requests and one invocation allowance", async () => {
  const fake = fakeGithub(6);
  const client = createGithubClient({ ...fake, requestLimit: 7 });
  const repositories = (await client.catalog()).repositories;
  const results = await Promise.allSettled(repositories.flatMap((repository) => [client.work(repository, roster), client.code(repository, roster)]));
  assert.equal(fake.urls.length, 7);
  assert.equal(fake.maxActive, 3);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 6);
  assert.ok(results.filter((result) => result.status === "rejected").every((result) => result.status === "rejected" && result.reason instanceof GithubFailure && /allowance/.test(result.reason.message)));
});

test("larger catalogs stop at the default allowance and disclose uncaptured repositories", async () => {
  const fake = fakeGithub(24);
  const snapshot = await createSnapshotLoader(fake)({ mode: "github" });
  assert.equal(fake.urls.length, 44);
  assert.equal(snapshot.repositories.length, 24);
  assert.ok(snapshot.work.some((entry) => entry.status === "unavailable"));
  assert.ok(snapshot.code?.some((entry) => entry.status === "unavailable" && entry.commits === null && entry.retryAt));
  assert.equal(snapshot.source.status, "partial");
  assert.match(JSON.stringify(snapshot), /request allowance reached/);
});

test("elapsed invocation deadline rejects late responses and queued reads without retries", async () => {
  let clock = Date.parse("2026-10-09T08:00:00Z");
  let count = 0;
  const fetcher: typeof fetch = async () => {
    count += 1; clock += 100;
    return Response.json([]);
  };
  const { request } = createGithubTransport({ fetcher, now: () => new Date(clock), deadlineMs: 150 });
  await request("/orgs/voss-labs/repos");
  await assert.rejects(request("/repos/voss-labs/repo-0/pulls"), (error: unknown) => error instanceof GithubFailure && /deadline/.test(error.message));
  await assert.rejects(request("/orgs/voss-labs/repos"), GithubFailure);
  assert.equal(count, 2);
  let queuedClock = 0;
  let queuedReads = 0;
  const queued = createGithubTransport({ now: () => new Date(queuedClock), deadlineMs: 250,
    fetcher: async () => {
      queuedClock += 100; queuedReads += 1;
      await new Promise<void>((resolve) => setImmediate(resolve));
      return Response.json([]);
    },
  });
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => queued.request("/orgs/voss-labs/repos")));
  assert.equal(queuedReads, 3);
  assert.ok(results.every((result) => result.status === "rejected" && result.reason instanceof GithubFailure));
});

test("upstream timeout and the remaining deadline abort stalled requests", async () => {
  for (const limits of [{ requestTimeoutMs: 10, deadlineMs: 1000 }, { requestTimeoutMs: 1000, deadlineMs: 60 }]) {
    let count = 0;
    let aborted = false;
    const fetcher: typeof fetch = async (_input, init) => {
      count += 1;
      return new Promise<Response>((_resolve, reject) => {
        const keepAlive = setTimeout(() => reject(new Error("Abort missing")), 500);
        init?.signal?.addEventListener("abort", () => {
          aborted = true; clearTimeout(keepAlive); reject(init.signal?.reason);
        }, { once: true });
      });
    };
    const { request } = createGithubTransport({ fetcher, ...limits });
    await assert.rejects(request("/orgs/voss-labs/repos"), GithubFailure);
    assert.equal(count, 1);
    assert.equal(aborted, true);
  }
});

test("redirect responses and malformed REST bodies fail without following or retrying", async () => {
  for (const status of [302, 200]) {
    let count = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      count += 1;
      assert.equal(init?.redirect, "error");
      return status === 302 ? new Response(null, { status, headers: { location: "https://example.org" } }) : Response.json({ repositories: [] });
    };
    await assert.rejects(createGithubClient({ fetcher }).catalog(), GithubFailure);
    assert.equal(count, 1);
  }
});
