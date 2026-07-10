import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GALLERY_FULL_IMAGE_MAX_BYTES,
  GALLERY_PREVIEW_IMAGE_MAX_BYTES,
  getGalleryImageSources,
  getGalleryUploadTargetSize,
  normalizeGalleryPage,
} from "../src/lib/gallery-images.ts";

const gallerySource = await readFile(
  new URL("../src/components/Gallery.tsx", import.meta.url),
  "utf8",
);
const galleryManagerSource = await readFile(
  new URL("../src/components/dashboard/GalleryManager.tsx", import.meta.url),
  "utf8",
);
const galleryImagesSource = await readFile(
  new URL("../src/lib/gallery-images.ts", import.meta.url),
  "utf8",
);

test("gallery image sources use opaque API URLs for previews and titles for captions", () => {
  const sources = getGalleryImageSources({
    imageUrl: "/api/gallery/image/photo/photo-id",
    thumbnailUrl: "/api/gallery/image/photo/photo-id?variant=thumbnail",
    title: "Late Night Bus",
    tags: "Digital",
    uploaderName: "Jacob",
    width: 4032,
    height: 5236,
  });

  assert.equal(sources?.previewSrc, "/api/gallery/image/photo/photo-id?variant=thumbnail");
  assert.equal(sources?.fullSrc, "/api/gallery/image/photo/photo-id");
  assert.equal(sources?.title, "Late Night Bus");
  assert.equal(sources?.medium, "Digital");
});

test("gallery image sources require both new opaque image URLs now that legacy rows are removed", () => {
  const sources = getGalleryImageSources({
    imageUrl: "/api/gallery/image/photo/photo-id",
    thumbnailUrl: "",
    tags: "Film",
  });

  assert.equal(sources, null);
  assert.equal(getGalleryImageSources({
    r2Key: "member-id/original.jpg",
    thumbnailR2Key: "member-id/thumbnail.jpg",
  }), null);
});

test("gallery upload validation rejects one byte over the exact 3 MB limit", async () => {
  const galleryImages = await import("../src/lib/gallery-images.ts");
  const getValidationError = galleryImages.getGalleryUploadValidationError;

  assert.equal(typeof getValidationError, "function");
  assert.equal(getValidationError({
    size: GALLERY_FULL_IMAGE_MAX_BYTES,
    type: "image/jpeg",
  }), null);
  assert.match(getValidationError({
    size: GALLERY_FULL_IMAGE_MAX_BYTES + 1,
    type: "image/jpeg",
  }), /3 (?:MB|MiB)/i);
});

test("gallery page normalization supports the old array API during staggered deploys", () => {
  const photos = [{ id: "one" }, { id: "two" }];
  const page = normalizeGalleryPage(photos, { page: 2, perPage: 2 });

  assert.deepEqual(page.photos, photos);
  assert.deepEqual(page.meta, {
    hasNextPage: true,
    hasPreviousPage: true,
    page: 2,
    perPage: 2,
    total: 5,
    totalPages: 3,
  });
});

test("gallery manager blocks an oversized original before preview, optimization, or upload", () => {
  const validationIndexes = Array.from(
    galleryManagerSource.matchAll(/getGalleryUploadValidationError\(file\)/g),
    (match) => match.index,
  );
  const previewIndex = galleryManagerSource.indexOf("URL.createObjectURL(file)");
  const optimizationIndex = galleryManagerSource.indexOf("prepareGalleryUploadImages(file)");

  assert.ok(validationIndexes.length >= 2, "validate both file selection and form submission");
  assert.ok(validationIndexes.some((index) => index < previewIndex), "reject before creating a preview URL");
  assert.ok(
    validationIndexes.some((index) => index > previewIndex && index < optimizationIndex),
    "revalidate on submit before doing image work",
  );
  assert.match(galleryManagerSource, /setError\(validationError\)/);
});

test("gallery uploads reencode every full image to strip EXIF and produce lightweight previews", () => {
  assert.equal(GALLERY_FULL_IMAGE_MAX_BYTES, 3_000_000);
  assert.equal(GALLERY_PREVIEW_IMAGE_MAX_BYTES, 450 * 1024);
  assert.deepEqual(
    getGalleryUploadTargetSize({ width: 4032, height: 5236 }, 2200),
    { width: 1694, height: 2200 },
  );
  assert.deepEqual(
    getGalleryUploadTargetSize({ width: 4032, height: 5236 }, 900),
    { width: 693, height: 900 },
  );
  assert.match(
    galleryImagesSource,
    /const optimizedFile = await renderJpegWithinLimit\(/,
  );
  assert.doesNotMatch(galleryImagesSource, /:\s*file;/);
});

test("gallery card captions keep title and author left aligned", () => {
  assert.match(
    gallerySource,
    /className="group relative mb-2 break-inside-avoid cursor-pointer overflow-hidden text-left/,
  );
  assert.match(
    gallerySource,
    /<div className="min-w-0 flex-1 text-left">[\s\S]*?<p className="truncate text-xs tracking-\[0\.2em\] uppercase text-white">/,
  );
  assert.match(
    gallerySource,
    /<p className="mt-1 truncate text-xs text-neutral-400">by \{img\.author\}<\/p>/,
  );
});
