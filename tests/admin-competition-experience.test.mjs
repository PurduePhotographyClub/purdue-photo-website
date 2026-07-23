import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function readReactSources(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const sources = await Promise.all(entries.map(async (entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) return readReactSources(url);
    return /\.tsx?$/.test(entry.name) ? readFile(url, "utf8") : "";
  }));
  return sources.join("\n");
}

const adminSource = await readReactSources(
  new URL("../src/components/dashboard/admin/", import.meta.url),
);

test("admin competitions load one paginated competition and results payload", () => {
  assert.match(adminSource, /\/api\/competitions\?page=\$\{page\}&per_page=\$\{ADMIN_COMPETITIONS_PAGE_SIZE\}&format=page&include=results/);
  assert.doesNotMatch(adminSource, /competitions\.map\(async \(comp\)/);
  assert.match(adminSource, /aria-label="Admin competition pagination"/);
  assert.match(adminSource, /aria-current=\{pageNumber ===/);
  assert.match(adminSource, /min-h-11 min-w-11/);
});

test("member data is deferred until a result editor needs it", () => {
  assert.match(adminSource, /COMPETITION_MEMBER_SEARCH_PAGE_SIZE = 30/);
  assert.match(adminSource, /uploadingFor && memberSearch/);
  assert.match(adminSource, /fetchCompetitionMembers/);
  assert.match(adminSource, /method: "POST"/);
  assert.doesNotMatch(adminSource, /uploadingFor \? "\/api\/admin\/members" : null/);
});

test("competition creation and editing share a touch-friendly metadata editor", () => {
  assert.match(adminSource, /editingCompetitionId/);
  assert.match(adminSource, /method: editingCompetitionId \? "PATCH" : "POST"/);
  assert.match(adminSource, /status: "draft"/);
  assert.match(adminSource, /Edit Competition/);
  assert.match(adminSource, /min-h-11/);
});

test("result editing uses the gallery preview lifecycle inside the shared dialog", () => {
  assert.match(adminSource, /<ModalDialog/);
  assert.match(adminSource, /onChange=\{onFileChange\}/);
  assert.match(adminSource, /getGalleryUploadSourceValidationError/);
  assert.match(adminSource, /URL\.createObjectURL\(file\)/);
  assert.match(adminSource, /URL\.revokeObjectURL/);
  assert.match(adminSource, /resultPreview/);
  assert.match(adminSource, /role="alert"/);
  assert.match(adminSource, /pb-\[max\([^\]]*safe-area-inset-bottom/);
});

test("admin competition thumbnails reserve space and decode off the main task", () => {
  assert.match(adminSource, /thumbnailUrl/);
  assert.match(adminSource, /loading="lazy"/);
  assert.match(adminSource, /decoding="async"/);
  assert.match(adminSource, /sizes="\(min-width: 768px\) 33vw, 100vw"/);
  assert.match(adminSource, /result\.thumbnailUrl \?\? result\.imageUrl/);
});
