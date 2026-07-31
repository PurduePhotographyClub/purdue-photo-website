import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGalleryExploreUrl,
  createGalleryExploreViewToken,
  readGalleryExploreUrlState,
} from "../src/lib/gallery-explore.ts";

const NOW = "2026-07-31T12:00:00.000Z";

test("gallery explore view tokens contain a version, random seed, and snapshot", () => {
  const view = createGalleryExploreViewToken({
    now: new Date(NOW),
    randomBytes: Uint8Array.from({ length: 32 }, (_, index) => index),
  });

  assert.match(view, /^v1\.[a-f0-9]{64}\.[0-9a-z]+$/);
  assert.equal(
    view,
    createGalleryExploreViewToken({
      now: new Date(NOW),
      randomBytes: Uint8Array.from({ length: 32 }, (_, index) => index),
    }),
  );
});

test("gallery URL state restores a valid view, page, and supported tag", () => {
  const view = createGalleryExploreViewToken({
    now: new Date(NOW),
    randomBytes: new Uint8Array(32).fill(7),
  });

  assert.deepEqual(
    readGalleryExploreUrlState(`?view=${view}&page=3&tag=Travel`, ["Travel", "Street"]),
    { filter: "Travel", page: 3, view },
  );
  assert.deepEqual(
    readGalleryExploreUrlState("?view=invalid&page=-4&tag=Unknown", ["Travel", "Street"]),
    { filter: "All", page: 1, view: null },
  );
});

test("gallery explore URLs preserve view and include page and active tag", () => {
  const view = createGalleryExploreViewToken({
    now: new Date(NOW),
    randomBytes: new Uint8Array(32).fill(12),
  });

  assert.equal(
    buildGalleryExploreUrl({ filter: "Street", page: 2, view }),
    `/gallery?view=${encodeURIComponent(view)}&page=2&tag=Street`,
  );
  assert.equal(
    buildGalleryExploreUrl({ filter: "All", page: 1, view }),
    `/gallery?view=${encodeURIComponent(view)}&page=1`,
  );
});
