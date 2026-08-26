import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/dashboard/DarkroomManager.tsx", import.meta.url),
  "utf8",
);

test("darkroom logs use the authenticated user id for owner actions", () => {
  assert.match(source, /userId: string;/);
  assert.match(source, /currentUserId: string;/);
  assert.match(source, /log\.userId === currentUserId/);
  assert.doesNotMatch(source, /log\.userId === ["']self["']/);
});

test("darkroom owners can edit their log while staff can manage every log", () => {
  assert.match(source, /method: isEditing \? "PATCH"/);
  assert.match(source, /\/api\/darkroom\/\$\{editingLogId\}/);
  assert.match(source, /onEditLog/);
  assert.match(source, /Edit/);
  assert.match(source, /userRole === "admin" \|\| userRole === "officer" \|\| log\.userId === currentUserId/);
});

test("darkroom staff can edit and delete film stocks through dedicated controls", () => {
  assert.match(source, /method: isEditing \? "PATCH"/);
  assert.match(source, /\/api\/darkroom\/film-stocks\/\$\{editingFilmStock\?\.id\}/);
  assert.match(source, /\/api\/darkroom\/film-stocks\/\$\{deleteFilmStockId\}/);
  assert.match(source, /canManageFilmStocks/);
  assert.match(source, /Edit film stock/);
  assert.match(source, /Delete film stock/);
});

test("historical logs render a fallback when their film stock was deleted", () => {
  assert.match(source, /log\.filmStockName \|\| "No assigned"/);
});
