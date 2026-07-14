import assert from "node:assert/strict";
import test from "node:test";

import { getGalleryImageSources } from "../src/lib/gallery-images.ts";

const basePhoto = {
  imageUrl: "/api/gallery/image/photo/photo-id",
  thumbnailUrl: "/api/gallery/image/photo/photo-id?variant=thumbnail",
  title: "Night Walk",
  description: "Rain on the pavement",
  tags: "Street, Film",
  uploaderName: "Jane Doe",
};

test("named gallery photos accept only same-origin API profile links", () => {
  const source = getGalleryImageSources({
    ...basePhoto,
    profileUrl: "/profile/jane-doe",
  });
  assert.equal(source?.profileUrl, "/profile/jane-doe");
  assert.equal(getGalleryImageSources({
    ...basePhoto,
    profileUrl: "https://evil.example/profile/jane",
  })?.profileUrl, null);
});

test("profile-wide anonymous gallery data stays image-only in presentation helpers", () => {
  const source = getGalleryImageSources({
    ...basePhoto,
    metadataHidden: true,
    profileUrl: "/profile/jane-doe",
  });

  assert.equal(source?.metadataHidden, true);
  assert.equal(source?.title, null);
  assert.equal(source?.author, null);
  assert.equal(source?.description, null);
  assert.equal(source?.camera, null);
  assert.equal(source?.lens, null);
  assert.equal(source?.tags, null);
  assert.equal(source?.profileUrl, null);
  assert.equal(source?.medium, null);
});
