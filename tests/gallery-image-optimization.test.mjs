import assert from "node:assert/strict";
import test from "node:test";

import {
  GALLERY_FULL_IMAGE_MAX_BYTES,
  GALLERY_PREVIEW_IMAGE_MAX_BYTES,
  getGalleryImageSources,
  getGalleryUploadTargetSize,
  shouldReencodeGalleryImage,
} from "../src/lib/gallery-images.ts";

test("gallery image sources prefer thumbnails for previews and titles for captions", () => {
  const sources = getGalleryImageSources({
    r2Key: "member/original.jpg",
    thumbnailR2Key: "member/thumb.jpg",
    title: "Late Night Bus",
    tags: "Digital",
    uploaderName: "Jacob",
    width: 4032,
    height: 5236,
  });

  assert.equal(sources?.previewSrc, "/api/gallery/image/member/thumb.jpg");
  assert.equal(sources?.fullSrc, "/api/gallery/image/member/original.jpg");
  assert.equal(sources?.title, "Late Night Bus");
  assert.equal(sources?.medium, "Digital");
});

test("gallery image sources fall back without showing tags as titles", () => {
  const sources = getGalleryImageSources({
    r2_key: "member/original.jpg",
    thumbnail_r2_key: "",
    tags: "Film",
  });

  assert.equal(sources?.previewSrc, "/api/gallery/image/member/original.jpg");
  assert.equal(sources?.title, "Untitled");
  assert.equal(sources?.medium, "Film");
});

test("gallery uploads resize large originals and lightweight previews", () => {
  assert.equal(GALLERY_FULL_IMAGE_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(GALLERY_PREVIEW_IMAGE_MAX_BYTES, 450 * 1024);
  assert.deepEqual(
    getGalleryUploadTargetSize({ width: 4032, height: 5236 }, 2200),
    { width: 1694, height: 2200 },
  );
  assert.deepEqual(
    getGalleryUploadTargetSize({ width: 4032, height: 5236 }, 900),
    { width: 693, height: 900 },
  );
  assert.equal(
    shouldReencodeGalleryImage({ width: 4032, height: 5236, size: 7_792_100 }),
    true,
  );
  assert.equal(
    shouldReencodeGalleryImage({ width: 1200, height: 800, size: 600_000 }),
    false,
  );
});
