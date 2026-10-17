import type { Route } from "./+types/api.snapshot";
import { InvalidSnapshotRequest } from "../data/snapshot-request.server.ts";
import { snapshotReaderContext } from "../snapshot-context.server.ts";

export async function loader({ request, context }: Route.LoaderArgs) {
  const headers = { "Cache-Control": "no-store" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
  }
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "github";
  const repositoryId = params.get("repositoryId") ?? undefined;
  if (mode !== "preview" && mode !== "github") {
    return Response.json({ error: "Invalid snapshot mode." }, { status: 400, headers });
  }
  try {
    return Response.json(await context.get(snapshotReaderContext)({ mode, repositoryId }), { headers });
  } catch (error) {
    if (error instanceof InvalidSnapshotRequest) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    return Response.json({ error: "Snapshot could not be loaded." }, { status: 500, headers });
  }
}

export const action = loader;
