import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/components/Competitions.tsx", import.meta.url), "utf8");

test("public competitions use one paginated aggregate request", () => {
  assert.match(source, /\/api\/competitions\?page=\$\{page\}&per_page=\$\{COMPETITIONS_PAGE_SIZE\}&format=page&include=results/);
  assert.match(source, /aria-label="Competition archive pagination"/);
  assert.match(source, /aria-current=\{pageNumber ===/);
});

test("public competition cards use thumbnails and reserve originals for the lightbox", () => {
  assert.match(source, /thumbnailUrl/);
  assert.match(source, /imageUrl/);
  assert.match(source, /loading=\{.*"eager".*"lazy"/);
  assert.match(source, /decoding="async"/);
  assert.match(source, /sizes="\(min-width: 768px\) 33vw, 100vw"/);
  assert.doesNotMatch(source, /winner\.medium === "Film" \? "grayscale"/);
  assert.match(source, /thumbnailUrl: result\.thumbnailUrl \?\? result\.imageUrl/);
  assert.doesNotMatch(source, /thumbnailUrl: `\/api\/competitions\/image\/photo\/\$\{result\.entryId\}\?variant=thumbnail`/);
});

test("public competition preview uses the shared accessible modal", () => {
  assert.match(source, /import ModalDialog/);
  assert.match(source, /<ModalDialog ariaLabel="Competition photo preview"/);
});
