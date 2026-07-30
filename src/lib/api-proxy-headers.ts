const ANONYMOUS_MEMBER_REPORT_PATH = "/api/v1/member-reports";

const REMOVED_PROXY_HEADERS = [
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
] as const;

export function getApiProxyForwardHeaders(
  request: Request,
  url: URL,
  internalToken?: string,
) {
  const headers = new Headers(request.headers);
  const shouldForwardClientIp =
    request.method !== "POST" || url.pathname !== ANONYMOUS_MEMBER_REPORT_PATH;
  const clientIp = shouldForwardClientIp
    ? request.headers.get("cf-connecting-ip")
    : null;

  for (const header of REMOVED_PROXY_HEADERS) {
    headers.delete(header);
  }

  headers.set("x-forwarded-host", request.headers.get("host") || url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
  }

  const token = internalToken?.trim();
  if (token) {
    headers.set("x-internal-token", token);
  }

  return headers;
}
