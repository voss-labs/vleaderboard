import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { unstable_dev } from "wrangler";

test("GitHub transport uses a redirect policy accepted by workerd and rejects redirect responses", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vleaderboard-workerd-"));
  const entry = join(directory, "worker.ts");
  const config = join(directory, "wrangler.json");
  await writeFile(config, JSON.stringify({ name: "capture-runtime-test", compatibility_date: "2026-10-17" }));
  await writeFile(entry, `
    import { createGithubTransport } from ${JSON.stringify(resolve("app/data/github-request.server.ts"))};
    export default {
      async fetch(request) {
        let requests = 0;
        const redirect = new URL(request.url).pathname === "/redirect";
        const transport = createGithubTransport({ token: "runtime-fixture-token", fetcher: async (url, init) => {
          const outgoing = new Request(url, init);
          requests += 1;
          if (outgoing.redirect !== "manual") throw new Error("Redirect policy must be manual");
          return redirect ? new Response(null, {status: 302, headers: {location: "https://example.org/private"}}) : Response.json([]);
        }});
        try {
          await transport.request("/orgs/voss-labs/repos");
          return Response.json({ready: true, requests});
        } catch {
          return Response.json({ready: false, requests});
        }
      }
    };
  `);
  let worker: Awaited<ReturnType<typeof unstable_dev>> | undefined;
  try {
    worker = await unstable_dev(entry, { config, local: true, persist: false, logLevel: "none",
      experimental: { disableExperimentalWarning: true, disableDevRegistry: true, watch: false } });
    assert.deepEqual(await (await worker.fetch("http://local/")).json(), { ready: true, requests: 1 });
    assert.deepEqual(await (await worker.fetch("http://local/redirect")).json(), { ready: false, requests: 1 });
  } finally {
    await worker?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
