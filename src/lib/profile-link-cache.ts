export const PROFILE_LINK_CACHE_TTL_MS = 10 * 60 * 1_000;
export const PROFILE_LINK_CACHE_UPDATED_EVENT = "ppc:profile-link-updated";

interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface StorageOwner {
  readonly sessionStorage: StorageLike;
}

interface CacheEntry {
  expiresAt: number;
  href: string | null;
}

const PROFILE_PATH_PREFIX = "/profile/";
const NAMED_PROFILE_IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANONYMOUS_PROFILE_IDENTIFIER = /^p_[a-f0-9]{32}$/;

function cacheKey(userId: string) {
  return `ppc:profile-link:v1:${userId}`;
}

function isSafeProfileHref(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith(PROFILE_PATH_PREFIX)) return false;
  const identifier = value.slice(PROFILE_PATH_PREFIX.length);
  return ANONYMOUS_PROFILE_IDENTIFIER.test(identifier) || (
    identifier.length >= 3 &&
    identifier.length <= 30 &&
    NAMED_PROFILE_IDENTIFIER.test(identifier)
  );
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.expiresAt === "number" && Number.isFinite(entry.expiresAt) &&
    (entry.href === null || isSafeProfileHref(entry.href));
}

function removeCacheEntry(storage: StorageLike, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

export function getProfileLinkStorage(owner: StorageOwner | null | undefined): StorageLike | null {
  try {
    return owner?.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function readProfileLinkCache(
  storage: StorageLike,
  userId: string,
  now = Date.now(),
): { hit: boolean; href: string | null } {
  if (!userId) return { hit: false, href: null };
  const key = cacheKey(userId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return { hit: false, href: null };
    const parsed: unknown = JSON.parse(raw);
    if (!isCacheEntry(parsed) || parsed.expiresAt <= now) {
      removeCacheEntry(storage, key);
      return { hit: false, href: null };
    }
    return { hit: true, href: parsed.href };
  } catch {
    removeCacheEntry(storage, key);
    return { hit: false, href: null };
  }
}

export function writeProfileLinkCache(
  storage: StorageLike,
  userId: string,
  href: string | null,
  now = Date.now(),
) {
  if (!userId) return;
  const key = cacheKey(userId);
  if (href !== null && !isSafeProfileHref(href)) {
    removeCacheEntry(storage, key);
    return;
  }
  const entry: CacheEntry = { expiresAt: now + PROFILE_LINK_CACHE_TTL_MS, href };
  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // The menu can still use its in-memory value when storage is unavailable.
  }
}

export function clearProfileLinkCache(storage: StorageLike, userId: string) {
  if (userId) removeCacheEntry(storage, cacheKey(userId));
}

export function updateProfileLinkCache(
  storage: StorageLike | null,
  userId: string,
  value: unknown,
  now = Date.now(),
) {
  if (value !== null && !isSafeProfileHref(value)) {
    if (storage) clearProfileLinkCache(storage, userId);
    return null;
  }
  const href = value as string | null;
  if (!storage) return href;
  writeProfileLinkCache(storage, userId, href, now);
  const cached = readProfileLinkCache(storage, userId, now);
  return cached.hit ? cached.href : href;
}

export function announceProfileLinkUpdate(href: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_LINK_CACHE_UPDATED_EVENT, {
    detail: { href: href !== null && isSafeProfileHref(href) ? href : null },
  }));
}
