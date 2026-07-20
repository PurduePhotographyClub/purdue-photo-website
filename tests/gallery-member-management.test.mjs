import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GALLERY_TAGS,
  getPrimaryGalleryTag,
  makeGalleryTagPrimary,
  parseGalleryTags,
  serializeGalleryTags,
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
  assert.deepEqual(
    parseGalleryTags(" Street, Film, STREET, Custom Tag "),
    ["Street", "Film"],
  );
});

test("the first selected gallery tag is primary and can be promoted", () => {
  const tags = parseGalleryTags("Nature, Film, PPC");

  assert.equal(getPrimaryGalleryTag(tags), "Nature");
  assert.deepEqual(makeGalleryTagPrimary(tags, "PPC"), [
    "PPC",
    "Nature",
    "Film",
  ]);
  assert.equal(
    serializeGalleryTags(makeGalleryTagPrimary(tags, "PPC")),
    "PPC, Nature, Film",
  );
  assert.deepEqual(makeGalleryTagPrimary(tags, "Missing"), tags);
});

test("member gallery upload labels description as optional", () => {
  const descriptionInput = galleryManagerSource.slice(
    galleryManagerSource.indexOf('aria-label="Description"'),
    galleryManagerSource.indexOf('aria-label="Camera"'),
  );

  assert.match(descriptionInput, /Description \(optional\)/);
  assert.doesNotMatch(descriptionInput, /\brequired\b/);
  assert.match(galleryManagerSource, /GALLERY_TAGS\.map/);
  assert.match(galleryManagerSource, /aria-pressed=\{active\}/);
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
  assert.doesNotMatch(editModalSource, /legacyTags|custom tags|Remove legacy tag/i);
  assert.match(galleryManagerSource, /editError/);
  assert.match(editModalSource, /Make .* the main tag/);
  assert.match(editModalSource, /Main tag/);
  assert.match(editModalSource, /makeGalleryTagPrimary/);
});

test("profile pin helpers enforce three pins and build the owner route", async () => {
  const {
    PROFILE_PIN_LIMIT,
    getGalleryProfilePinRequest,
    getProfilePinState,
  } = await import("../src/lib/gallery-profile-pins.ts");

  assert.equal(PROFILE_PIN_LIMIT, 3);
  assert.deepEqual(getProfilePinState(2), {
    atLimit: false,
    pinnedCount: 2,
  });
  assert.deepEqual(getProfilePinState(3), {
    atLimit: true,
    pinnedCount: 3,
  });
  assert.deepEqual(getProfilePinState(99), {
    atLimit: true,
    pinnedCount: 3,
  });
  assert.deepEqual(getProfilePinState(-1), {
    atLimit: false,
    pinnedCount: 0,
  });
  assert.deepEqual(getGalleryProfilePinRequest("photo/unsafe", false), {
    method: "PUT",
    url: "/api/gallery/photo%2Funsafe/profile-pin",
  });
  assert.deepEqual(getGalleryProfilePinRequest("photo-1", true), {
    method: "DELETE",
    url: "/api/gallery/photo-1/profile-pin",
  });
});

test("member gallery exposes accessible pin controls and clear max-three feedback", () => {
  assert.match(galleryManagerSource, /getGalleryProfilePinRequest/);
  assert.match(galleryManagerSource, /getProfilePinState/);
  assert.match(galleryManagerSource, /profilePinPosition/);
  assert.match(galleryManagerSource, /meta\.profilePinnedCount/);
  assert.match(galleryManagerSource, /aria-pressed=\{isPinned\}/);
  assert.match(galleryManagerSource, /\{isPinned \? "Unpin" : "Pin"\}/);
  assert.match(galleryManagerSource, /of \{PROFILE_PIN_LIMIT\} pinned/);
  assert.match(galleryManagerSource, /You can pin up to \{PROFILE_PIN_LIMIT\} photos\./);
  assert.match(galleryManagerSource, /Active membership is required to pin new photos\./);
  assert.match(galleryManagerSource, /canPin=\{canUpload\}/);
  assert.match(galleryManagerSource, /!canPin\s*&&\s*!isPinned/);
  assert.match(galleryManagerSource, /pinState\.atLimit\s*&&\s*!isPinned/);
  assert.match(galleryManagerSource, /getGalleryProfilePinRequest\(photo\.id, isPinned\)/);
  assert.match(galleryManagerSource, /fetchApi\(request\.url,[\s\S]*method:\s*request\.method/);
  assert.match(galleryManagerSource, /await mutatePhotos\(\)/);
  assert.doesNotMatch(
    galleryManagerSource,
    /profilePinPosition:\s*isPinned\s*\?\s*null\s*:\s*1/,
    "pin mutations must revalidate the server-owned position instead of inventing slot 1",
  );
  assert.doesNotMatch(
    galleryManagerSource,
    /pinState\.pinnedCount\s*[+-]\s*1/,
    "pin mutations must not drift the global count after an idempotent or raced request",
  );
});

test("upload tag selection exposes an accessible primary-tag control", () => {
  assert.match(galleryManagerSource, /Make .* the main tag/);
  assert.match(galleryManagerSource, /Main tag/);
  assert.match(galleryManagerSource, /makeGalleryTagPrimary/);
  assert.match(galleryManagerSource, /aria-pressed=\{index === 0\}/);
  assert.match(editModalSource, /aria-pressed=\{index === 0\}/);
  assert.match(adminGallerySource, /aria-pressed=\{index === 0\}/);
  assert.match(galleryManagerSource, /disabled=\{index === 0\}/);
  assert.match(editModalSource, /disabled=\{index === 0\}/);
  assert.match(adminGallerySource, /disabled=\{index === 0\}/);
});

test("editing a photo never writes into upload success feedback", () => {
  const saveEdit = galleryManagerSource.slice(
    galleryManagerSource.indexOf("const saveEdit"),
    galleryManagerSource.indexOf("const expandedPhoto"),
  );

  assert.doesNotMatch(saveEdit, /setSuccess\(/);
  assert.doesNotMatch(galleryManagerSource, /Photo updated\./);
  assert.match(saveEdit, /setEditTarget\(null\)/);
});

test("admin and member editors reject whitespace-only titles before PATCH", () => {
  assert.match(editModalSource, /if \(!normalizedTitle\)/);
  assert.match(editModalSource, /setTitleError/);
  assert.match(adminGallerySource, /editTitle\.trim\(\)/);
  assert.match(adminGallerySource, /Title cannot be blank/);
  assert.match(adminGallerySource, /AdminGallery-title[^>]*required/);
});

test("admin tag edits use only fixed tags and preserve primary ordering", () => {
  const mutations = adminGallerySource.slice(
    adminGallerySource.indexOf("const editTagSet"),
    adminGallerySource.indexOf("const handlePageChange"),
  );

  assert.match(mutations, /parseGalleryTags\(editTags\)/);
  assert.match(mutations, /serializeGalleryTags/);
  assert.match(mutations, /makeGalleryTagPrimary/);
  assert.doesNotMatch(mutations, /editTags\s*\.split\(","\)/);
  assert.doesNotMatch(adminGallerySource, /newTagInput|Add custom tag/);
});
