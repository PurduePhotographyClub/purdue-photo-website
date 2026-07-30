import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import test from "node:test";

const { getApiProxyForwardHeaders } = await import(
  "../src/lib/api-proxy-headers.ts"
);

function createProxyRequest(pathname, method = "POST") {
  return new Request(`https://www.purduephotoclub.com${pathname}`, {
    headers: {
      "cf-connecting-ip": "203.0.113.24",
      host: "www.purduephotoclub.com",
      "x-forwarded-for": "198.51.100.9",
    },
    method,
  });
}

test("anonymous member report proxy requests strip all client IP headers", () => {
  const request = createProxyRequest("/api/v1/member-reports");
  const headers = getApiProxyForwardHeaders(
    request,
    new URL(request.url),
    "internal-token",
  );

  assert.equal(headers.get("cf-connecting-ip"), null);
  assert.equal(headers.get("x-forwarded-for"), null);
  assert.equal(headers.get("x-forwarded-host"), "www.purduephotoclub.com");
  assert.equal(headers.get("x-forwarded-proto"), "https");
  assert.equal(headers.get("x-internal-token"), "internal-token");
});

test("other proxy requests retain the trusted Cloudflare client IP forwarding", () => {
  for (const [pathname, method] of [
    ["/api/v1/photographer-requests", "POST"],
    ["/api/v1/member-reports", "GET"],
    ["/api/v1/member-reports/correction", "POST"],
  ]) {
    const request = createProxyRequest(pathname, method);
    const headers = getApiProxyForwardHeaders(request, new URL(request.url));

    assert.equal(headers.get("cf-connecting-ip"), null, `${method} ${pathname}`);
    assert.equal(
      headers.get("x-forwarded-for"),
      "203.0.113.24",
      `${method} ${pathname}`,
    );
  }
});
