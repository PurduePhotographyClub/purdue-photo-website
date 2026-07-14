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

test("profile-wide anonymous gallery data keeps photo copy and an opaque PPC Member link", () => {
  const source = getGalleryImageSources({
    ...basePhoto,
    metadataHidden: true,
    profileUrl: "/profile/p_11111111111111111111111111111111",
    uploaderName: "PPC Member",
  });

  assert.equal(source?.metadataHidden, true);
  assert.equal(source?.title, "Night Walk");
  assert.equal(source?.author, "PPC Member");
  assert.equal(source?.description, "Rain on the pavement");
  assert.equal(source?.camera, null);
  assert.equal(source?.lens, null);
  assert.equal(source?.tags, "Street, Film");
  assert.equal(source?.profileUrl, "/profile/p_11111111111111111111111111111111");
  assert.equal(source?.medium, "Film");
});
