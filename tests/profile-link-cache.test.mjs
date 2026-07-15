import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_LINK_CACHE_TTL_MS,
  clearProfileLinkCache,
  getProfileLinkStorage,
  readProfileLinkCache,
  updateProfileLinkCache,
  writeProfileLinkCache,
} from "../src/lib/profile-link-cache.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("profile links are cached per account for a short reload-safe window", () => {
  const storage = createStorage();
  writeProfileLinkCache(storage, "member-1", "/profile/jane-doe", 1_000);

  assert.deepEqual(readProfileLinkCache(storage, "member-1", 1_001), {
    hit: true,
    href: "/profile/jane-doe",
  });
  assert.deepEqual(readProfileLinkCache(storage, "member-2", 1_001), {
    hit: false,
    href: null,
  });
  assert.deepEqual(
    readProfileLinkCache(storage, "member-1", 1_000 + PROFILE_LINK_CACHE_TTL_MS + 1),
    { hit: false, href: null },
  );
});

test("profile link caching degrades to memory when browser storage is unavailable", () => {
  const lockedBrowser = {
    get sessionStorage() {
      throw new Error("storage denied");
    },
  };

  assert.equal(getProfileLinkStorage(lockedBrowser), null);
  assert.equal(
    updateProfileLinkCache(null, "member-1", "/profile/jane-doe", 1_000),
    "/profile/jane-doe",
  );
  assert.equal(
    updateProfileLinkCache(null, "member-1", "https://evil.example/profile/jane", 1_000),
    null,
  );
});

test("cached profile links accept only local public profile paths and cache disabled profiles", () => {
  const storage = createStorage();
  writeProfileLinkCache(storage, "member-1", "https://evil.example/profile/jane", 1_000);
  assert.deepEqual(readProfileLinkCache(storage, "member-1", 1_001), {
    hit: false,
    href: null,
  });

  writeProfileLinkCache(storage, "member-1", null, 2_000);
  assert.deepEqual(readProfileLinkCache(storage, "member-1", 2_001), {
    hit: true,
    href: null,
  });
  clearProfileLinkCache(storage, "member-1");
  assert.deepEqual(readProfileLinkCache(storage, "member-1", 2_002), {
    hit: false,
    href: null,
  });
});
