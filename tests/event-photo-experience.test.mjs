import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const safePhotoRow = (overrides = {}) => ({
  id: "photo-1",
  caption: "Members at the photo walk",
  sortOrder: 0,
  width: 1600,
  height: 1067,
  imageUrl: "/api/events/image/photo/photo-1",
  thumbnailUrl: "/api/events/image/photo/photo-1?variant=thumbnail",
  ...overrides,
});

const eventRow = (overrides = {}) => ({
  id: "event-1",
  title: "Campus photo walk",
  date: "2026-08-20T22:00:00.000Z",
  endsAt: "2026-08-21T00:00:00.000Z",
  description: "A walk around campus.",
  location: "Purdue Bell Tower",
  discordSynced: true,
  photoCount: 1,
  coverPhoto: safePhotoRow(),
  photos: [safePhotoRow()],
  ...overrides,
});

test("event photo normalization accepts only opaque same-origin event image routes", async () => {
  const eventsModule = await import("../src/lib/events.ts");

  assert.equal(typeof eventsModule.normalizeEventPhoto, "function");
  const normalizeEventPhoto = eventsModule.normalizeEventPhoto;

  assert.deepEqual(normalizeEventPhoto(safePhotoRow()), safePhotoRow());
  assert.equal(normalizeEventPhoto(safePhotoRow({
    imageUrl: "https://images.example.test/events/event-1/photo.jpg",
  })), null);
  assert.equal(normalizeEventPhoto(safePhotoRow({
    imageUrl: "events/event-1/private-r2-key.jpg",
  })), null);
  assert.deepEqual(normalizeEventPhoto(safePhotoRow({
    thumbnailUrl: "https://images.example.test/preview.jpg",
  })), safePhotoRow({ thumbnailUrl: null }));
});

test("event normalization carries a bounded photo summary and safe detail photos", async () => {
  const { normalizeEvent } = await import("../src/lib/events.ts");
  const normalized = normalizeEvent(eventRow({
    photoCount: 3,
    photos: [
      safePhotoRow(),
      safePhotoRow({ id: "unsafe", imageUrl: "events/event-1/raw-key.jpg" }),
    ],
  }));

  assert.equal(normalized.photoCount, 3);
  assert.deepEqual(normalized.coverPhoto, safePhotoRow());
  assert.deepEqual(normalized.photos, [safePhotoRow()]);

  const withoutPhotos = normalizeEvent(eventRow({
    coverPhoto: null,
    photoCount: -1,
    photos: undefined,
  }));
  assert.equal(withoutPhotos.photoCount, 0);
  assert.equal(withoutPhotos.coverPhoto, null);
  assert.deepEqual(withoutPhotos.photos, []);
});

test("the public archive requests photo summaries and opens event photos lazily", async () => {
  const [eventsPage, galleryDialog] = await Promise.all([
    read("src/components/EventsPage.tsx"),
    read("src/components/events/EventPhotoGalleryDialog.tsx"),
  ]);

  assert.match(eventsPage, /\/api\/events\?limit=100&include=photo-summary/);
  assert.match(eventsPage, /photoCount/);
  assert.match(eventsPage, /coverPhoto/);
  assert.match(eventsPage, /thumbnailUrl/);
  assert.match(eventsPage, /EventPhotoGalleryDialog/);
  assert.doesNotMatch(eventsPage, /Promise\.all\([^)]*\/api\/events\/\$\{/s);

  assert.match(galleryDialog, /useSWR/);
  assert.match(galleryDialog, /eventId\s*\?\s*`\/api\/events\/\$\{eventId\}`\s*:\s*null/);
  assert.match(galleryDialog, /fetchPublicJson/);
  assert.match(galleryDialog, /ModalDialog/);
  assert.match(galleryDialog, /thumbnailUrl\s*\?\?\s*[^\n]*imageUrl/);
  assert.match(galleryDialog, /selectedPhoto\.imageUrl/);
  assert.match(galleryDialog, /aria-label=["'{`]Previous photo/);
  assert.match(galleryDialog, /aria-label=["'{`]Next photo/);
  assert.match(galleryDialog, /safe-area-inset-bottom/);
});

test("event photo management is exposed only to admins and stays in focused modules", async () => {
  const [adminPage, adminEvents, managerDialog, managerHook] = await Promise.all([
    read("src/pages/dashboard/admin/events.astro"),
    read("src/components/dashboard/admin/AdminEvents.tsx"),
    read("src/components/dashboard/admin/admin-events/EventPhotoManagerDialog.tsx"),
    read("src/components/dashboard/admin/admin-events/useEventPhotos.ts"),
  ]);

  assert.match(adminPage, /canManagePhotos=\{Astro\.locals\.user\?\.role === ['"]admin['"]\}/);
  assert.match(adminEvents, /canManagePhotos/);
  assert.match(adminEvents, /Manage photos for \$\{event\.title\}/);
  assert.match(adminEvents, /EventPhotoManagerDialog/);
  assert.ok(adminEvents.split("\n").length < 430, "photo management should not turn AdminEvents into another large component");

  assert.match(managerHook, /eventId\s*\?\s*`\/api\/events\/\$\{eventId\}`\s*:\s*null/);
  assert.match(managerHook, /fetchFreshJson/);
  assert.match(managerHook, /prepareGalleryUploadImages/);
  assert.match(managerHook, /formData\.append\(["']file["'],\s*preparedImages\.file/);
  assert.match(managerHook, /formData\.append\(["']thumbnail["'],\s*preparedImages\.thumbnail/);
  assert.match(managerHook, /formData\.append\(["']caption["']/);
  assert.match(managerHook, /method:\s*["']POST["']/);
  assert.match(managerHook, /method:\s*["']PATCH["']/);
  assert.match(managerHook, /method:\s*["']DELETE["']/);
  assert.match(managerHook, /\/api\/events\/\$\{eventId\}\/photos/);
  assert.match(managerHook, /setFileInputKey\(\(current\) => current \+ 1\)/);

  assert.match(managerDialog, /ModalDialog/);
  assert.match(managerDialog, /type=["']file["']/);
  assert.match(managerDialog, /key=\{controller\.fileInputKey\}/);
  assert.match(managerDialog, /accept=["']image\/jpeg["']/);
  assert.match(managerDialog, /safe-area-inset-bottom/);
  assert.match(managerDialog, /aria-label=["'{`]Delete/);
});
