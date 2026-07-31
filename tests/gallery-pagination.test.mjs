import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gallerySource = await readFile(
  new URL("../src/components/Gallery.tsx", import.meta.url),
  "utf8",
);
const homeSource = await readFile(
  new URL("../src/components/Home.tsx", import.meta.url),
  "utf8",
);

test("public gallery requests 15 Discover photos in addition to the recent lane", () => {
  assert.match(gallerySource, /const GALLERY_DISCOVERY_PAGE_SIZE = 15;/);
  assert.match(
    gallerySource,
    /\/api\/gallery\?page=\$\{[^}]+\}&per_page=\$\{GALLERY_DISCOVERY_PAGE_SIZE\}/,
  );
  assert.doesNotMatch(
    gallerySource,
    /useSWR<[^>]+>\("\/api\/gallery",/,
    "the public gallery must not retain the unpaginated request",
  );
  assert.match(gallerySource, /photos:\s*[^;\n]+\[\]/);
  assert.match(gallerySource, /meta:\s*\{/);
});

test("public gallery exposes accessible numbered page controls", () => {
  assert.match(gallerySource, /aria-label="Gallery pagination"/);
  assert.match(gallerySource, />\s*Previous\s*</);
  assert.match(gallerySource, />\s*Next\s*</);
  assert.match(gallerySource, /aria-current=\{[^}]*["']page["']/);
  assert.match(gallerySource, /\{pageNumber\}/);
  assert.match(gallerySource, /totalPages/);
  assert.match(gallerySource, /hasPreviousPage/);
  assert.match(gallerySource, /hasNextPage/);
});

test("changing the gallery filter returns visitors to the first page", () => {
  assert.match(
    gallerySource,
    /setFilter\([^)]*\)[\s\S]{0,160}setPage\(1\)/,
  );
});

test("homepage gallery preview requests only the first six photos from the paginated API", () => {
  assert.match(homeSource, /\/api\/gallery\?page=1&per_page=6/);
  assert.doesNotMatch(homeSource, /\/api\/gallery\?limit=6/);
  assert.match(homeSource, /galleryPage[^\n]*\.photos|galleryPage\.photos/);
});
