import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  if (request.method === "HEAD") return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: AbortSignal.timeout(streamTimeout + 1000),
      onError() {
        responseStatusCode = 500;
        console.error(JSON.stringify({ event: "ssr-render-failed" }));
      },
    },
  );
  if (isbot(request.headers.get("user-agent") ?? "") || routerContext.isSpaMode) await body.allReady;
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
