import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_AVATAR_MAX_DIMENSION,
  PROFILE_AVATAR_SOURCE_MAX_BYTES,
  PROFILE_AVATAR_TARGET_BYTES,
  getProfileAvatarSourceValidationError,
  prepareProfileAvatarImage,
} from "../src/lib/profile-image.ts";

function createJpegSourceFile({ height = 2000, size = 1024, width = 3000 } = {}) {
  const frame = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ]);
  return new File(
    [frame, new Uint8Array(Math.max(0, size - frame.byteLength))],
    "portrait.jpg",
    { type: "image/jpeg" },
  );
}

async function withMockedEncoder(run) {
  const originalBitmapFactory = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  let bitmapClosed = false;
  globalThis.createImageBitmap = async () => ({
    close: () => { bitmapClosed = true; },
    height: 2000,
    width: 3000,
  });
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      const canvas = {
        height: 0,
        width: 0,
        getContext: () => ({ drawImage() {}, fillRect() {}, fillStyle: "" }),
        toBlob(callback, type, quality) {
          assert.equal(type, "image/jpeg");
          const bytes = quality >= 0.8 ? 130 * 1024 : 70 * 1024;
          callback(new Blob([new Uint8Array(bytes)], { type }));
        },
      };
      return canvas;
    },
  };

  try {
    await run(() => bitmapClosed);
  } finally {
    if (originalBitmapFactory === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalBitmapFactory;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test("profile avatars are materially smaller than gallery uploads", () => {
  assert.equal(PROFILE_AVATAR_MAX_DIMENSION, 512);
  assert.equal(PROFILE_AVATAR_TARGET_BYTES, 80 * 1024);
  assert.equal(PROFILE_AVATAR_MAX_BYTES, 200 * 1024);
  assert.equal(PROFILE_AVATAR_SOURCE_MAX_BYTES, 10_000_000);
});

test("profile avatar validation rejects unsafe source files before decoding", async () => {
  assert.equal(await getProfileAvatarSourceValidationError(createJpegSourceFile()), null);
  assert.match(
    await getProfileAvatarSourceValidationError(createJpegSourceFile({ width: 20_000 })),
    /16,384 px/i,
  );
  assert.match(
    await getProfileAvatarSourceValidationError(new File(["png"], "portrait.png", { type: "image/png" })),
    /JPG|JPEG/i,
  );
  assert.match(
    await getProfileAvatarSourceValidationError(createJpegSourceFile({ size: PROFILE_AVATAR_SOURCE_MAX_BYTES + 1 })),
    /10 MB/i,
  );
});

test("profile avatar preparation produces one bounded square-friendly JPEG and closes resources", async () => {
  await withMockedEncoder(async (wasClosed) => {
    const avatar = await prepareProfileAvatarImage(createJpegSourceFile());
    assert.equal(avatar.type, "image/jpeg");
    assert.ok(avatar.size <= PROFILE_AVATAR_TARGET_BYTES);
    assert.ok(avatar.size <= PROFILE_AVATAR_MAX_BYTES);
    assert.equal(wasClosed(), true);
  });
});
