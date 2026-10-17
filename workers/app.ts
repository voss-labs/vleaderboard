import { createRequestHandler } from "react-router";
import { createSnapshotContext } from "../app/snapshot-context.server.ts";
import { createStoredSnapshotReader, refreshStoredSnapshot } from "../app/data/stored-snapshot.server.ts";

const handleRequest = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return Response.json({ error: "Method not allowed." }, {
        status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
      });
    }
    const allowPreview = import.meta.env.DEV && String(env.ALLOW_PREVIEW) === "true";
    const reader = createStoredSnapshotReader(env.SNAPSHOTS, { allowPreview });
    return handleRequest(request, createSnapshotContext(reader, allowPreview));
  },
  async scheduled(_controller, env) {
    console.log(JSON.stringify({ event: "github-snapshot-capture-start", scheduledTime: _controller.scheduledTime }));
    const result = await refreshStoredSnapshot(env);
    const log = JSON.stringify({ event: "github-snapshot-capture", ...result });
    if (result.published) console.log(log);
    else console.error(log);
  },
} satisfies ExportedHandler<Env>;
