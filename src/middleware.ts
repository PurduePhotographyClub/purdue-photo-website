import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

type SessionPayload = {
  user?: App.Locals["user"];
  session?: App.Locals["session"];
};

const DASHBOARD_VERIFY_PATH = "/dashboard/verify";
const SESSION_AWARE_PATHS = new Set([
  "/activate",
  "/login",
  "/membership",
  "/register",
]);

const SECURITY_HEADERS = new Map([
  ["Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ")],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith("/_astro/") || pathname.startsWith("/favicon")) {
    return withSecurityHeaders(await next());
  }

  const { user, session } = shouldResolveSession(pathname)
    ? await resolveSession(context.request, context.url)
    : { user: null, session: null };
  context.locals.user = user;
  context.locals.session = session;

  if (user?.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    if (pathname.startsWith("/dashboard") || pathname === "/activate" || pathname === "/login") {
      return withSecurityHeaders(context.redirect("/403"));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user || !session) {
      return withSecurityHeaders(context.redirect("/login"));
    }

    if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) < new Date()) {
      context.locals.user = { ...user, tier: null, membershipExpiresAt: null };
    }

    const currentUser = context.locals.user;
    if (!currentUser) {
      return withSecurityHeaders(context.redirect("/login"));
    }

    const isVerified = isAccountVerified(currentUser);
    if (!isVerified && pathname !== DASHBOARD_VERIFY_PATH) {
      return withSecurityHeaders(context.redirect(DASHBOARD_VERIFY_PATH));
    }

    if (isVerified && pathname === DASHBOARD_VERIFY_PATH) {
      return withSecurityHeaders(context.redirect("/dashboard"));
    }

    if (pathname.startsWith("/dashboard/admin")) {
      const role = context.locals.user?.role;
      if (role !== "admin" && role !== "officer") {
        return withSecurityHeaders(context.redirect("/403"));
      }

      if (pathname === "/dashboard/admin" || pathname === "/dashboard/admin/") {
        return withSecurityHeaders(context.redirect("/dashboard/admin/members"));
      }
    }

    const isPrivileged = currentUser.role === "admin" || currentUser.role === "officer";
    const isActivated = !!currentUser.activatedAt || !!currentUser.tier || isPrivileged;
    const memberOnlyRoutes = [
      "/dashboard/competitions",
    ];

    if (!isActivated && memberOnlyRoutes.some((route) => pathname.startsWith(route))) {
      return withSecurityHeaders(context.redirect("/403"));
    }
  }

  if (pathname === "/activate" && user && session && !isAccountVerified(user)) {
    return withSecurityHeaders(context.redirect(DASHBOARD_VERIFY_PATH));
  }

  return withSecurityHeaders(await next());
});

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of SECURITY_HEADERS) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function shouldResolveSession(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return (
    normalizedPathname === "/dashboard" ||
    normalizedPathname.startsWith("/dashboard/") ||
    SESSION_AWARE_PATHS.has(normalizedPathname)
  );
}

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function isAccountVerified(user: App.Locals["user"]) {
  return !!user?.discordId;
}

async function resolveSession(request: Request, currentUrl: URL): Promise<Required<SessionPayload>> {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return { user: null, session: null };
  }

  try {
    const response = await fetchApi(new URL("/api/auth/get-session", currentUrl.origin), {
      headers: {
        Accept: "application/json",
        Cookie: cookie,
        "x-forwarded-host": currentUrl.host,
        "x-forwarded-proto": currentUrl.protocol.replace(":", ""),
      },
    });

    if (!response.ok) {
      return { user: null, session: null };
    }

    const payload = (await response.json().catch(() => null)) as SessionPayload | null;
    return {
      user: payload?.user ?? null,
      session: payload?.session ?? null,
    };
  } catch {
    return { user: null, session: null };
  }
}

async function fetchApi(url: URL, init: RequestInit) {
  if (!env.API_WORKER) {
    return Response.json({ error: "API Worker binding is not configured." }, { status: 503 });
  }

  return env.API_WORKER.fetch(createApiWorkerRequest(url, init));
}

function createApiWorkerRequest(url: URL, init: RequestInit) {
  return new Request(new URL(`${url.pathname}${url.search}`, "https://api.internal"), withInternalToken(init));
}

function withInternalToken(init: RequestInit) {
  const token = env.INTERNAL_TOKEN?.trim();
  if (!token) {
    return init;
  }

  const headers = new Headers(init.headers);
  headers.set("x-internal-token", token);

  return {
    ...init,
    headers,
  };
}
