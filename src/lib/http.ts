import type { SWRConfiguration } from "swr";

export interface ApiErrorResponse {
  code?: string;
  details?: unknown;
  error?: string;
  message?: string;
  success?: boolean;
}

const API_PREFIX = "/api";
const API_V1_PREFIX = "/api/v1";
const AUTH_API_ROOT = "/api/auth";
const AUTH_API_PREFIX = "/api/auth/";

export const PUBLIC_API_SWR_OPTIONS = {
  dedupingInterval: 60_000,
  errorRetryCount: 1,
  focusThrottleInterval: 60_000,
  keepPreviousData: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} satisfies SWRConfiguration;

export const SCHEDULE_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
} satisfies SWRConfiguration;

export const LIVE_SCHEDULE_SWR_OPTIONS = {
  ...SCHEDULE_SWR_OPTIONS,
  refreshInterval: 60_000,
} satisfies SWRConfiguration;

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function readJsonOrNull<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const data = await readJsonOrNull<ApiErrorResponse>(response);
  return data?.error || data?.message || fallback;
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(toVersionedApiUrl(url), {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load data."));
  }
  return readJson<T>(response);
}

export function fetchPublicJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  return fetchJson<T>(url, {
    ...init,
    credentials: "omit",
  });
}

export function fetchApi(url: string, init?: RequestInit): Promise<Response> {
  return fetch(toVersionedApiUrl(url), init);
}

function toVersionedApiUrl(url: string) {
  if (
    !url.startsWith(`${API_PREFIX}/`) ||
    url === API_V1_PREFIX ||
    url.startsWith(`${API_V1_PREFIX}/`) ||
    url === AUTH_API_ROOT ||
    url.startsWith(AUTH_API_PREFIX)
  ) {
    return url;
  }

  return `${API_V1_PREFIX}${url.slice(API_PREFIX.length)}`;
}
