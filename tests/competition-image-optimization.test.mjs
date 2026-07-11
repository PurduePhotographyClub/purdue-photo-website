import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (await Promise.all([
  "../src/components/dashboard/admin/AdminCompetitions.tsx",
  "../src/components/dashboard/admin/competitions/ResultUploadModal.tsx",
  "../src/components/dashboard/admin/competitions/useAdminCompetitions.ts",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");

test("competition result uploads share gallery JPEG validation and optimization", () => {
  assert.match(source, /getGalleryUploadSourceValidationError/);
  assert.match(source, /prepareGalleryUploadImages/);
  assert.match(source, /accept="image\/jpeg(?:,\.jpg,\.jpeg)?"/);

  const sourceValidation = source.indexOf("getGalleryUploadSourceValidationError(file)");
  const optimization = source.indexOf("prepareGalleryUploadImages(file)");
  assert.ok(sourceValidation >= 0, "the source file must be validated before optimization");
  assert.ok(optimization > sourceValidation, "the source must be validated before it is re-encoded");
});

test("competition result uploads send an optimized JPEG full image and preview", () => {
  assert.match(source, /form\.append\("file", images\.file, images\.file\.name\)/);
  assert.match(source, /form\.append\("thumbnail", images\.thumbnail, images\.thumbnail\.name\)/);
  assert.doesNotMatch(source, /form\.append\("file", file\)/);
});
