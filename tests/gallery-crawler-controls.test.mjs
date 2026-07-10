import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the gallery is server-rendered and opts out of search and image indexing", async () => {
  const [page, layout, robots] = await Promise.all([
    readFile(new URL("../src/pages/gallery.astro", import.meta.url), "utf8"),
    readFile(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8"),
    readFile(new URL("../public/robots.txt", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export const prerender = false/);
  assert.match(page, /robots="noindex, nofollow, noimageindex, noarchive"/);
  assert.match(layout, /<meta name="robots" content=\{robots\} \/>/);
  assert.match(robots, /Disallow: \/gallery/);
  assert.match(robots, /Disallow: \/api\/gallery/);
});
