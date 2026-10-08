import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COMPETITION_FULL_IMAGE_MAX_BYTES,
  COMPETITION_FULL_IMAGE_MAX_DIMENSION,
  COMPETITION_FULL_IMAGE_TARGET_BYTES,
  COMPETITION_PREVIEW_IMAGE_MAX_BYTES,
  COMPETITION_PREVIEW_IMAGE_MAX_DIMENSION,
  COMPETITION_PREVIEW_IMAGE_TARGET_BYTES,
  prepareCompetitionUploadImages,
} from "../src/lib/gallery-images.ts";

const source = (await Promise.all([
  "../src/components/dashboard/admin/AdminCompetitions.tsx",
  "../src/components/dashboard/admin/competitions/ResultUploadModal.tsx",
  "../src/components/dashboard/admin/competitions/useAdminCompetitions.ts",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");

function createJpegSourceFile({ height = 5236, name = "club-photo.jpg", size = 1024, width = 4032 } = {}) {
  const frame = Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
  ]);
  return new File([frame, new Uint8Array(Math.max(0, size - frame.byteLength))], name, { type: "image/jpeg" });
}

async function withMockedBrowserEncoder(getEncodedBytes, run) {
  const originalBitmapFactory = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  const encodes = [];

  globalThis.createImageBitmap = async () => ({
    close() {},
    height: 5236,
    width: 4032,
  });
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      const canvas = {
        height: 0,
        width: 0,
        getContext() {
          return { drawImage() {}, fillRect() {}, fillStyle: "" };
        },
        toBlob(callback, type, quality) {
          encodes.push({ height: canvas.height, quality, type, width: canvas.width });
          callback(new Blob([new Uint8Array(getEncodedBytes(canvas.width, canvas.height))], { type: "image/jpeg" }));
        },
      };
      return canvas;
    },
  };

  try {
    await run(encodes);
  } finally {
    if (originalBitmapFactory === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalBitmapFactory;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test("competition result uploads share gallery JPEG validation and use the competition optimizer", () => {
  assert.match(source, /getGalleryUploadSourceValidationError/);
  assert.match(source, /prepareCompetitionUploadImages/);
  assert.match(source, /accept="image\/jpeg(?:,\.jpg,\.jpeg)?"/);

  const sourceValidation = source.indexOf("getGalleryUploadSourceValidationError(file)");
  const optimization = source.indexOf("prepareCompetitionUploadImages(file)");
  assert.ok(sourceValidation >= 0, "the source file must be validated before optimization");
  assert.ok(optimization > sourceValidation, "the source must be validated before it is re-encoded");
});

test("competition result uploads send an optimized JPEG full image and preview", () => {
  assert.match(source, /form\.append\("file", images\.file, images\.file\.name\)/);
  assert.match(source, /form\.append\("thumbnail", images\.thumbnail, images\.thumbnail\.name\)/);
  assert.doesNotMatch(source, /form\.append\("file", file\)/);
});

test("competition optimizer keeps a larger high-quality full image and preview profile", async () => {
  await withMockedBrowserEncoder(
    (width, height) => Math.round(width * height * 0.2),
    async (encodes) => {
      const prepared = await prepareCompetitionUploadImages(createJpegSourceFile({ size: 4_000_000 }));

      assert.equal(COMPETITION_FULL_IMAGE_MAX_DIMENSION, 3600);
      assert.equal(COMPETITION_FULL_IMAGE_TARGET_BYTES, 3 * 1024 * 1024);
      assert.equal(COMPETITION_FULL_IMAGE_MAX_BYTES, 5 * 1024 * 1024);
      assert.equal(COMPETITION_PREVIEW_IMAGE_MAX_DIMENSION, 1200);
      assert.equal(COMPETITION_PREVIEW_IMAGE_TARGET_BYTES, 400 * 1024);
      assert.equal(COMPETITION_PREVIEW_IMAGE_MAX_BYTES, 700 * 1024);
      assert.deepEqual({ width: prepared.width, height: prepared.height }, { width: 2772, height: 3600 });
      assert.ok(prepared.file.size <= COMPETITION_FULL_IMAGE_TARGET_BYTES);
      assert.ok(prepared.thumbnail.size <= COMPETITION_PREVIEW_IMAGE_TARGET_BYTES);
      assert.ok(encodes.some(({ quality }) => quality === 0.90));
      assert.ok(encodes.some(({ quality }) => quality === 0.82));
      assert.ok(encodes.some(({ width, height }) => width === 924 && height === 1200));
    },
  );
});
