import type { Route } from "./+types/api.leaderboard";
import { createContributorReport } from "../data/contributor-report.ts";
import { snapshotReaderContext } from "../snapshot-context.server.ts";

function json(request: Request, body: unknown, status = 200, extraHeaders = {}) {
  const response = Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
  return request.method === "HEAD" ? new Response(null, response) : response;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json(request, { error: "Method not allowed." }, 405, { Allow: "GET, HEAD" });
  }
  const params = new URL(request.url).searchParams;
  const period = params.get("period") ?? "all";
  if (params.getAll("period").length > 1 || (period !== "month" && period !== "30d" && period !== "all")) {
    return json(request, { error: "Invalid period. Use month, 30d or all." }, 400);
  }
  const sort = params.get("sort") ?? "merged";
  if (params.getAll("sort").length > 1 || (sort !== "merged" && sort !== "lines" && sort !== "commits")) {
    return json(request, { error: "Invalid sort. Use merged, lines or commits." }, 400);
  }
  if (params.has("mode") && params.get("mode") !== "github") {
    return json(request, { error: "Only GitHub data is available." }, 400);
  }
  try {
    const snapshot = await context.get(snapshotReaderContext)({ mode: "github" });
    if (snapshot.source.mode !== "github") {
      return json(request, { error: "GitHub snapshot is unavailable." }, 500);
    }
    return json(request, createContributorReport(snapshot, period, sort));
  } catch {
    return json(request, { error: "Leaderboard could not be loaded." }, 500);
  }
}

export const action = loader;
