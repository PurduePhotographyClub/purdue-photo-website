import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getApiProxyForwardHeaders } from "@/lib/api-proxy-headers";

export const prerender = false;

export const ALL: APIRoute = async ({ request, url }) => {
  if (!env.API_WORKER) {
    return new Response(JSON.stringify({ error: "API Worker binding is not configured." }), {
      headers: { "Content-Type": "application/json" },
      status: 503,
    });
  }

  const targetPath = `${url.pathname}${url.search}`;
  const headers = getApiProxyForwardHeaders(request, url, env.INTERNAL_TOKEN);
  const targetUrl = new URL(targetPath, "https://api.internal");

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  return env.API_WORKER.fetch(proxyRequest);
};
