import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GALLERY_TAGS,
  parseGalleryTags,
} from "../src/lib/gallery-tags.ts";

const galleryManagerSource = await readFile(
  new URL("../src/components/dashboard/GalleryManager.tsx", import.meta.url),
  "utf8",
);
const editModalSource = await readFile(
  new URL("../src/components/dashboard/gallery/GalleryPhotoEditModal.tsx", import.meta.url),
  "utf8",
);
const adminGallerySource = await readFile(
  new URL("../src/components/dashboard/admin/AdminGallery.tsx", import.meta.url),
  "utf8",
);

const EXPECTED_GALLERY_TAGS = [
  "Film",
  "Digital",
  "Street",
  "Nature",
  "Landscape",
  "Portrait",
  "Wildlife",
  "Astro",
  "Macro",
  "Automotive",
  "Sports",
  "Events",
  "Travel",
  "PPC",
];

test("member gallery exposes the complete plain-text tag set", () => {
  assert.deepEqual(GALLERY_TAGS, EXPECTED_GALLERY_TAGS);
  assert.equal(GALLERY_TAGS.some((tag) => /\p{Extended_Pictographic}/u.test(tag)), false);
  assert.deepEqual(
    parseGalleryTags(" 📸 Street, Film, STREET, Legacy Tag "),
    ["Street", "Film", "Legacy Tag"],
  );
});

test("member gallery upload labels description as optional", () => {
  const descriptionInput = galleryManagerSource.slice(
    galleryManagerSource.indexOf('aria-label="Description"'),
    galleryManagerSource.indexOf('aria-label="Camera"'),
  );

  assert.match(descriptionInput, /Description \(optional\)/);
  assert.doesNotMatch(descriptionInput, /\brequired\b/);
  assert.match(galleryManagerSource, /GALLERY_TAGS\.map/);
});

test("members can open a metadata editor and save through the owner PATCH route", () => {
  assert.match(galleryManagerSource, />\s*Edit\s*</);
  assert.match(galleryManagerSource, /GalleryPhotoEditModal/);
  assert.match(galleryManagerSource, /method:\s*["']PATCH["']/);
  assert.match(galleryManagerSource, /photos:\s*current\.photos\.map/);
  assert.match(editModalSource, /ariaLabel="Edit gallery photo"/);
  assert.match(editModalSource, /GALLERY_TAGS\.map/);
  assert.doesNotMatch(editModalSource, /Add custom tag/);
  assert.match(editModalSource, /aria-label="Edit title"[^>]*required/);
  assert.doesNotMatch(editModalSource, /title:\s*title\.trim\(\) \|\| null/);
  assert.match(editModalSource, /Title cannot be blank/);
  assert.match(editModalSource, /legacyTags\.map/);
  assert.match(editModalSource, /Remove legacy tag/);
  assert.match(galleryManagerSource, /editError/);
});

test("admin and member editors reject whitespace-only titles before PATCH", () => {
  assert.match(editModalSource, /if \(!normalizedTitle\)/);
  assert.match(editModalSource, /setTitleError/);
  assert.match(adminGallerySource, /editTitle\.trim\(\)/);
  assert.match(adminGallerySource, /Title cannot be blank/);
  assert.match(adminGallerySource, /AdminGallery-title[^>]*required/);
});
