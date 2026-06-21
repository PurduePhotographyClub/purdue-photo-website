import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const ALL: APIRoute = async ({ request, url }) => {
  if (!env.API_WORKER) {
    return new Response(JSON.stringify({ error: "API Worker binding is not configured." }), {
      headers: { "Content-Type": "application/json" },
      status: 503,
    });
  }

  const targetPath = `${url.pathname}${url.search}`;
  const headers = getForwardHeaders(request, url);
  const targetUrl = new URL(targetPath, "https://api.internal");

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  return env.API_WORKER.fetch(proxyRequest);
};

function getForwardHeaders(request: Request, url: URL) {
  const headers = new Headers(request.headers);
  const clientIp = request.headers.get("cf-connecting-ip");

  for (const header of [
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "connection",
    "content-length",
    "forwarded",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-internal-token",
    "x-pcc-internal-source",
  ]) {
    headers.delete(header);
  }

  headers.set("x-forwarded-host", request.headers.get("host") || url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
  }

  const token = env.INTERNAL_TOKEN?.trim();
  if (token) {
    headers.set("x-internal-token", token);
  }

  return headers;
}
