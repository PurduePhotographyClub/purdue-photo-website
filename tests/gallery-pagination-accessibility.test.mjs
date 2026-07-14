import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicGallerySource = await readFile(
  new URL("../src/components/Gallery.tsx", import.meta.url),
  "utf8",
);
const memberGallerySource = await readFile(
  new URL("../src/components/dashboard/GalleryManager.tsx", import.meta.url),
  "utf8",
);
const adminGallerySource = await readFile(
  new URL("../src/components/dashboard/admin/AdminGallery.tsx", import.meta.url),
  "utf8",
);
const memberPreviewSource = await readFile(
  new URL("../src/components/dashboard/gallery/GalleryPhotoPreviewModal.tsx", import.meta.url),
  "utf8",
);

test("member gallery pagination has reachable state and controls", () => {
  assert.match(memberGallerySource, /const GALLERY_MANAGER_PAGE_SIZE = 15;/);
  assert.doesNotMatch(
    memberGallerySource,
    /\/api\/gallery\?mine=true&page=1&per_page=/,
    "member gallery must not be permanently pinned to its first page",
  );
  assert.match(
    memberGallerySource,
    /\/api\/gallery\?mine=true&page=\$\{page\}&per_page=\$\{GALLERY_MANAGER_PAGE_SIZE\}/,
  );
  assert.match(memberGallerySource, /aria-label="Member gallery pagination"/);
  assert.match(memberGallerySource, />\s*Previous\s*</);
  assert.match(memberGallerySource, />\s*Next\s*</);
  assert.match(memberGallerySource, /aria-current=\{[^}]*["']page["']/);
  assert.match(memberGallerySource, /setPage\(/);
  assert.match(memberGallerySource, /role="status"/);
  assert.match(memberGallerySource, /aria-live="polite"/);
  assert.match(
    memberGallerySource,
    /Page \{meta\.page\} of \{meta\.totalPages\}/,
  );
});

test("admin gallery pagination has reachable state and controls", () => {
  assert.doesNotMatch(
    adminGallerySource,
    /\/api\/gallery\?page=1&per_page=/,
    "admin gallery must not be permanently pinned to its first page",
  );
  assert.match(
    adminGallerySource,
    /\/api\/gallery\?page=\$\{page\}&per_page=\$\{ADMIN_GALLERY_PAGE_SIZE\}/,
  );
  assert.match(adminGallerySource, /aria-label="Admin gallery pagination"/);
  assert.match(adminGallerySource, />\s*Previous\s*</);
  assert.match(adminGallerySource, />\s*Next\s*</);
  assert.match(adminGallerySource, /aria-current=\{[^}]*["']page["']/);
  assert.match(adminGallerySource, /setPage\(/);
});

test("member gallery card actions are visible on touch layouts and keyboard focus", () => {
  assert.match(
    memberGallerySource,
    /className="[^"]*opacity-100[^"]*sm:opacity-0[^"]*"/,
    "touch-sized layouts need visible View and Delete actions without hover",
  );
  assert.match(
    memberGallerySource,
    /sm:group-focus-within:opacity-100/,
    "tabbing to View or Delete must reveal the action overlay",
  );
  const cardActions = memberGallerySource.slice(
    memberGallerySource.indexOf('onClick={() => onExpand(photo.id)}'),
    memberGallerySource.indexOf('</div>', memberGallerySource.indexOf('onClick={() => onDelete(photo.id)}')),
  );
  assert.match(cardActions, /min-h-11/);
  assert.match(cardActions, /min-w-11/);
  assert.match(memberGallerySource, /absolute inset-x-0 bottom-0 grid grid-cols-3/);
  assert.doesNotMatch(cardActions, /sm:flex-col/);
  assert.doesNotMatch(cardActions, /sm:static/);
});

test("public gallery exposes every supported tag as a server-backed filter", () => {
  assert.match(
    publicGallerySource,
    /const galleryCategories = \["All", \.\.\.GALLERY_TAGS\]/,
  );
  assert.match(
    publicGallerySource,
    /tag=\$\{encodeURIComponent\(filter\)\}/,
  );
  assert.doesNotMatch(
    publicGallerySource,
    /const galleryCategories = \["All", "Digital", "Film"\]/,
  );
});

test("gallery cards show only the primary tag", () => {
  const publicCards = publicGallerySource.slice(
    publicGallerySource.indexOf("visibleImages.map"),
    publicGallerySource.indexOf('aria-label="Gallery pagination"'),
  );
  const memberGrid = memberGallerySource.slice(
    memberGallerySource.indexOf("function GalleryPhotoGrid"),
    memberGallerySource.indexOf("function DeletePhotoModal"),
  );
  const adminGrid = adminGallerySource.slice(
    adminGallerySource.indexOf("function AdminGalleryGrid"),
    adminGallerySource.indexOf("function DeleteConfirmModal"),
  );

  assert.match(publicCards, /img\.primaryTag/);
  assert.doesNotMatch(publicCards, /img\.tags/);
  assert.doesNotMatch(publicCards, /img\.medium === "Film"/);
  assert.match(memberGrid, /getPrimaryGalleryTag\(photo\.tags\)/);
  assert.doesNotMatch(memberGrid, /\{photo\.tags\}/);
  assert.match(adminGrid, /getPrimaryGalleryTag\(photo\.tags\)/);
  assert.doesNotMatch(adminGrid, /photo\.tags\.split\(","\)/);
});

test("public and member previews render all ordered tags", () => {
  const publicPreview = publicGallerySource.slice(
    publicGallerySource.indexOf('aria-label="Gallery photo preview"'),
  );

  assert.match(publicPreview, /\.tags\.map\(/);
  assert.match(memberPreviewSource, /parseGalleryTags\(photo\.tags\)/);
  assert.match(memberPreviewSource, /tags\.map\(/);
  assert.match(adminGallerySource, /parseGalleryTags\(photo\.tags\)/);
  assert.match(adminGallerySource, /aria-label="Photo tags"/);
});

test("public gallery filters stay available after a request error and expose selection state", () => {
  assert.doesNotMatch(
    publicGallerySource,
    /\{status\s*!==\s*["']loaded["'][\s\S]{0,500}galleryCategories\.map/,
    "request errors must not remove the controls visitors need to change filters",
  );
  assert.match(publicGallerySource, /galleryCategories\.map/);
  assert.match(publicGallerySource, /aria-pressed=\{filter === cat\}/);
});

test("public gallery page changes focus and scroll the announced results region", () => {
  const resultsRefMatch = publicGallerySource.match(/const (\w*ResultsRef) = useRef/);
  assert.ok(resultsRefMatch, "gallery results need a stable focus target");
  const resultsRef = resultsRefMatch[1];

  assert.match(publicGallerySource, new RegExp(`ref=\\{${resultsRef}\\}`));
  assert.match(publicGallerySource, /tabIndex=\{-1\}/);
  assert.match(publicGallerySource, new RegExp(`${resultsRef}\\.current\\?\\.focus\\(`));
  assert.match(publicGallerySource, new RegExp(`${resultsRef}\\.current\\?\\.scrollIntoView\\(`));
  assert.match(publicGallerySource, /role="status"/);
  assert.match(publicGallerySource, /aria-live="polite"/);
  assert.match(
    publicGallerySource,
    /(?:Gallery )?[Pp]age \{meta\.page\} (?:of|\/) \{meta\.totalPages\}/,
    "screen readers need the selected gallery page and total page count",
  );
});

test("admin edit-photo modal can scroll within short viewports", () => {
  const editModalSource = adminGallerySource.slice(
    adminGallerySource.indexOf("function EditPhotoModal"),
    adminGallerySource.indexOf("export default function AdminGallery"),
  );

  assert.match(editModalSource, /max-h-\[(?:calc\()?100dvh[^"]*\]/);
  assert.match(editModalSource, /overflow-y-auto/);
});

test("admin photo preview is contained by the mobile dynamic viewport", () => {
  const preview = adminGallerySource.slice(
    adminGallerySource.indexOf("function PhotoPreviewModal"),
    adminGallerySource.indexOf("interface DeletePhotoModalProps"),
  );

  assert.match(preview, /100dvh/);
  assert.match(preview, /min-h-0/);
  assert.match(preview, /overflow-y-auto/);
  assert.match(preview, /object-contain/);
  assert.match(preview, /aria-label="Gallery photo details"/);
  assert.match(preview, /tabIndex=\{0\}/);
  assert.match(preview, /whitespace-pre-wrap/);
  assert.match(preview, /break-words/);
  assert.doesNotMatch(preview, /max-h-\[90vh\]/);
  assert.doesNotMatch(preview, /max-h-\[75vh\]/);
});

test("member photo preview keeps details and actions reachable in short viewports", () => {
  assert.match(memberPreviewSource, /max-h-\[calc\(100dvh-/);
  assert.match(memberPreviewSource, /overflow-y-auto/);
  assert.match(memberPreviewSource, /min-h-0/);
  assert.match(memberPreviewSource, /object-contain/);
  assert.match(memberPreviewSource, /aria-label="Close photo preview"/);
  assert.match(memberPreviewSource, /min-h-11/);
  assert.match(memberPreviewSource, />\s*Edit(?: Photo)?\s*</);
  assert.match(memberPreviewSource, />\s*Delete(?: Photo)?\s*</);
});

test("public gallery details scroll region is keyboard reachable", () => {
  assert.match(publicGallerySource, /aria-label="Gallery photo details"/);
  assert.match(publicGallerySource, /tabIndex=\{0\}/);
});
