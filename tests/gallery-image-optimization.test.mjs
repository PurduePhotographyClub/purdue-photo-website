import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GALLERY_FULL_IMAGE_MAX_DIMENSION,
  GALLERY_FULL_IMAGE_MAX_BYTES,
  GALLERY_FULL_IMAGE_TARGET_BYTES,
  GALLERY_PREVIEW_IMAGE_MAX_BYTES,
  GALLERY_PREVIEW_IMAGE_TARGET_BYTES,
  GALLERY_SOURCE_IMAGE_MAX_BYTES,
  GALLERY_SOURCE_IMAGE_MAX_DIMENSION,
  GALLERY_SOURCE_IMAGE_MAX_PIXELS,
  getGalleryImageSources,
  getGalleryUploadSourceValidationError,
  getGalleryUploadValidationError,
  getGalleryUploadTargetSize,
  normalizeGalleryPage,
  prepareGalleryUploadImages,
} from "../src/lib/gallery-images.ts";
import { getGalleryLayoutClassNames } from "../src/lib/gallery-layout.ts";

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

function createJpegSourceFile({
  height = 5236,
  name = "club-photo.jpg",
  size = 1024,
  width = 4032,
} = {}) {
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
  return new File(
    [frame, new Uint8Array(Math.max(0, size - frame.byteLength))],
    name,
    { type: "image/jpeg" },
  );
}

async function withMockedBrowserEncoder(getEncodedBytes, run) {
  const originalBitmapFactory = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  let bitmapClosed = false;

  globalThis.createImageBitmap = async () => ({
    close: () => {
      bitmapClosed = true;
    },
    height: 5236,
    width: 4032,
  });
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      const canvas = {
        height: 0,
        width: 0,
        getContext(contextName) {
          assert.equal(contextName, "2d");
          return {
            drawImage() {},
            fillRect() {},
            fillStyle: "",
          };
        },
        toBlob(callback, type, quality) {
          const bytes = getEncodedBytes(canvas.width, canvas.height, type, quality);
          callback(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
        },
      };
      return canvas;
    },
  };

  try {
    await run(() => bitmapClosed);
  } finally {
    if (originalBitmapFactory === undefined) {
      delete globalThis.createImageBitmap;
    } else {
      globalThis.createImageBitmap = originalBitmapFactory;
    }
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
}

test("gallery image sources use opaque API URLs for previews and titles for captions", () => {
  const sources = getGalleryImageSources({
    description: "Rain reflected in the street lights.",
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
  assert.equal(sources?.description, "Rain reflected in the street lights.");
  assert.equal(sources?.medium, "Digital");
});

test("public gallery lightbox carries and renders optional descriptions", () => {
  assert.equal(getGalleryImageSources({
    description: "   ",
    imageUrl: "/api/gallery/image/photo/photo-id",
    thumbnailUrl: "/api/gallery/image/photo/photo-id?variant=thumbnail",
  })?.description, null);
  assert.match(gallerySource, /description:\s*source\.description/);
  assert.match(gallerySource, /visibleImages\[selected\]\?\.description/);
  assert.match(gallerySource, /whitespace-pre-wrap/);
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

test("gallery upload validation accepts large source JPEGs for client-side optimization", () => {
  assert.equal(getGalleryUploadValidationError({
    size: GALLERY_FULL_IMAGE_MAX_BYTES + 1,
    type: "image/jpeg",
  }), null);
  assert.match(getGalleryUploadValidationError({ size: 0, type: "image/jpeg" }), /non-empty/i);
  assert.match(getGalleryUploadValidationError({ size: 100, type: "image/png" }), /JPG|JPEG/i);
  assert.match(getGalleryUploadValidationError({
    size: GALLERY_SOURCE_IMAGE_MAX_BYTES + 1,
    type: "image/jpeg",
  }), /50 MB/i);
});

test("gallery source validation rejects invalid and dangerously large JPEG dimensions before decode", async () => {
  assert.equal(GALLERY_SOURCE_IMAGE_MAX_BYTES, 50_000_000);
  assert.equal(GALLERY_SOURCE_IMAGE_MAX_DIMENSION, 16_384);
  assert.equal(GALLERY_SOURCE_IMAGE_MAX_PIXELS, 70_000_000);
  assert.equal(
    await getGalleryUploadSourceValidationError(createJpegSourceFile()),
    null,
  );
  assert.match(
    await getGalleryUploadSourceValidationError(createJpegSourceFile({ width: 10_000, height: 8_000 })),
    /70 megapixels/i,
  );
  assert.match(
    await getGalleryUploadSourceValidationError(createJpegSourceFile({ width: 20_000, height: 1_000 })),
    /16,384 px/i,
  );
  assert.match(
    await getGalleryUploadSourceValidationError(
      new File([Uint8Array.from([0x00, 0x01])], "fake.jpg", { type: "image/jpeg" }),
    ),
    /valid JPG or JPEG/i,
  );
});

test("gallery upload targets a web-sized full image in hundreds of kilobytes", () => {
  assert.equal(GALLERY_FULL_IMAGE_MAX_BYTES, 1_500_000);
  assert.equal(GALLERY_FULL_IMAGE_TARGET_BYTES, 700 * 1024);
  assert.ok(
    GALLERY_FULL_IMAGE_TARGET_BYTES < 1_000_000,
    "the preferred full image should stay below one decimal megabyte",
  );
  assert.equal(GALLERY_PREVIEW_IMAGE_TARGET_BYTES, 160 * 1024);
  assert.equal(GALLERY_FULL_IMAGE_MAX_DIMENSION, 2200);
  assert.deepEqual(
    getGalleryUploadTargetSize(
      { width: 4032, height: 5236 },
      GALLERY_FULL_IMAGE_MAX_DIMENSION,
    ),
    { width: 1694, height: 2200 },
  );
  assert.deepEqual(
    getGalleryUploadTargetSize({ width: 100_000, height: 1 }, 2200),
    { width: 2200, height: 1 },
  );
});

test("gallery browser encoder prefers the storage-saving full and preview targets", async () => {
  const encodes = [];
  await withMockedBrowserEncoder(
    (width, height, type, quality) => {
      encodes.push({ type, quality });
      return Math.round(width * height * 0.2);
    },
    async (wasBitmapClosed) => {
      const source = createJpegSourceFile({ size: 4_000_000 });

      const prepared = await prepareGalleryUploadImages(source);

      assert.ok(prepared.file.size <= GALLERY_FULL_IMAGE_TARGET_BYTES);
      assert.ok(prepared.thumbnail.size <= GALLERY_PREVIEW_IMAGE_TARGET_BYTES);
      assert.ok(Math.max(prepared.width, prepared.height) <= GALLERY_FULL_IMAGE_MAX_DIMENSION);
      assert.equal(prepared.file.type, "image/jpeg");
      assert.equal(prepared.thumbnail.type, "image/jpeg");
      assert.equal(wasBitmapClosed(), true);
    },
  );
  assert.ok(encodes.every(({ type }) => type === "image/jpeg"));
  assert.ok(encodes.some(({ quality }) => quality === 0.78));
  assert.ok(encodes.some(({ quality }) => quality === 0.68));
});

test("gallery browser encoder keeps a safe hard-limit fallback when preferred targets are unreachable", async () => {
  await withMockedBrowserEncoder(
    (width, height) => {
      const longestSide = Math.max(width, height);
      if (longestSide > 2000) return 1_400_000;
      if (longestSide > 900) return 1_200_000;
      return 250_000;
    },
    async () => {
      const source = createJpegSourceFile({ name: "detailed-photo.jpg", size: 5_000_000 });

      const prepared = await prepareGalleryUploadImages(source);

      assert.equal(prepared.file.size, 1_200_000);
      assert.ok(prepared.file.size <= GALLERY_FULL_IMAGE_MAX_BYTES);
      assert.equal(prepared.thumbnail.size, 250_000);
      assert.ok(prepared.thumbnail.size <= GALLERY_PREVIEW_IMAGE_MAX_BYTES);
    },
  );
});

test("gallery browser encoder rejects an image when every full candidate exceeds the hard limit", async () => {
  await withMockedBrowserEncoder(
    () => GALLERY_FULL_IMAGE_MAX_BYTES + 1,
    async () => {
      await assert.rejects(
        () => prepareGalleryUploadImages(createJpegSourceFile()),
        /storage limit/i,
      );
    },
  );
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

test("gallery manager validates the source before preview, optimization, or upload", () => {
  const sourceValidationIndex = galleryManagerSource.indexOf(
    "getGalleryUploadSourceValidationError(file)",
  );
  const submitValidationIndex = galleryManagerSource.indexOf(
    "getGalleryUploadValidationError(file)",
  );
  const previewIndex = galleryManagerSource.indexOf("URL.createObjectURL(file)");
  const optimizationIndex = galleryManagerSource.indexOf("prepareGalleryUploadImages(file)");

  assert.ok(sourceValidationIndex >= 0, "validate JPEG dimensions during file selection");
  assert.ok(sourceValidationIndex < previewIndex, "reject before creating a preview URL");
  assert.ok(
    submitValidationIndex > previewIndex && submitValidationIndex < optimizationIndex,
    "revalidate on submit before doing image work",
  );
  assert.match(galleryManagerSource, /setError\(validationError\)/);
});

test("gallery uploads reencode every full image to strip EXIF and produce lightweight previews", () => {
  assert.equal(GALLERY_FULL_IMAGE_MAX_BYTES, 1_500_000);
  assert.equal(GALLERY_FULL_IMAGE_TARGET_BYTES, 700 * 1024);
  assert.equal(GALLERY_PREVIEW_IMAGE_MAX_BYTES, 450 * 1024);
  assert.equal(GALLERY_PREVIEW_IMAGE_TARGET_BYTES, 160 * 1024);
  assert.deepEqual(
    getGalleryUploadTargetSize(
      { width: 4032, height: 5236 },
      GALLERY_FULL_IMAGE_MAX_DIMENSION,
    ),
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
  assert.match(
    galleryImagesSource,
    /getGalleryUploadTargetSize\(source, GALLERY_FULL_IMAGE_MAX_DIMENSION\)/,
  );
  assert.match(galleryImagesSource, /GALLERY_FULL_IMAGE_TARGET_BYTES/);
  assert.match(galleryImagesSource, /fallback/);
  assert.doesNotMatch(galleryImagesSource, /:\s*file;/);
  assert.match(
    galleryManagerSource,
    /up to 1\.5 MB after optimization/i,
  );
});

test("gallery uses equal gutters and a two-column sparse layout for exactly two photos", () => {
  const single = getGalleryLayoutClassNames(1);
  const pair = getGalleryLayoutClassNames(2);
  const masonry = getGalleryLayoutClassNames(3);

  assert.match(single.container, /mx-auto/);
  assert.match(single.container, /max-w-xl/);
  assert.match(pair.container, /grid grid-cols-1 items-start gap-2 sm:grid-cols-2/);
  assert.match(pair.container, /mx-auto/);
  assert.match(masonry.container, /columns-1 gap-2 sm:columns-2 lg:columns-3/);
  assert.match(masonry.item, /block/);
  assert.match(masonry.item, /w-full/);
  assert.match(masonry.item, /mb-2/);
  assert.doesNotMatch(pair.item, /mb-2/);
  assert.match(gallerySource, /getGalleryLayoutClassNames\(visibleImages\.length\)/);
  assert.doesNotMatch(gallerySource, /space-y-2/);
});

test("gallery card captions keep title and author left aligned", () => {
  assert.match(
    gallerySource,
    /<figure[^>]*className=\{`group relative \$\{galleryLayout\.item\} overflow-hidden`\}/,
  );
  assert.match(gallerySource, /className="block w-full cursor-pointer text-left/);
  assert.match(
    gallerySource,
    /<div className="min-w-0 flex-1 text-left">[\s\S]*?<p className="truncate text-xs tracking-\[0\.2em\] uppercase text-white">/,
  );
  assert.match(
    gallerySource,
    /<p className="mt-1 truncate text-xs text-neutral-400">by \{img\.author\}<\/p>/,
  );
});
