import type { Route } from "./+types/api.snapshot";
import { InvalidSnapshotRequest, loadSnapshot } from "../data/load-snapshot.server.ts";

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "preview";
  const repositoryId = params.get("repositoryId") ?? undefined;
  const headers = { "Cache-Control": "no-store" };
  if (mode !== "preview" && mode !== "github") {
    return Response.json({ error: "Invalid snapshot mode." }, { status: 400, headers });
  }
  try {
    return Response.json(await loadSnapshot({ mode, repositoryId }), { headers });
  } catch (error) {
    if (error instanceof InvalidSnapshotRequest) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    return Response.json({ error: "Snapshot could not be loaded." }, { status: 500, headers });
  }
}
