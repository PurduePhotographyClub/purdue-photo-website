import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminDarkroomSchedulePath = new URL(
  "../src/components/dashboard/admin/AdminDarkroomSchedule.tsx",
  import.meta.url,
);
const adminDarkroomEditDialogPath = new URL(
  "../src/components/dashboard/admin/AdminDarkroomEditDialog.tsx",
  import.meta.url,
);
const adminDarkroomSchedulePanelsPath = new URL(
  "../src/components/dashboard/admin/AdminDarkroomSchedulePanels.tsx",
  import.meta.url,
);

test("admin darkroom create form stays create-only while edit uses a dedicated dialog", async () => {
  const [scheduleSource, panelsSource] = await Promise.all([
    readFile(adminDarkroomSchedulePath, "utf8"),
    readFile(adminDarkroomSchedulePanelsPath, "utf8"),
  ]);

  assert.match(panelsSource, /export function AdminDarkroomCreateForm/);
  assert.match(panelsSource, />\s*Create Timeslot\s*</);
  assert.match(panelsSource, /Create a new darkroom opening without affecting existing timeslots\./);
  assert.match(panelsSource, /Create Timeslot/);
  assert.doesNotMatch(panelsSource, /Update Timeslot|Cancel Edit|editingId/);

  assert.match(scheduleSource, /AdminDarkroomCreateForm/);
  assert.match(scheduleSource, /AdminDarkroomEditDialog/);
  assert.match(scheduleSource, /const handleEditSubmit = async \(event: FormEvent<HTMLFormElement>\)/);
  assert.match(scheduleSource, /const openEditDialog = \(slot: AdminDarkroomScheduleSlot\) =>/);
});

test("admin darkroom edit requests patch the selected slot and keep edit state separate from create state", async () => {
  const source = await readFile(adminDarkroomSchedulePath, "utf8");

  assert.match(source, /method: "PATCH"/);
  assert.match(source, /\/api\/admin\/darkroom\/schedule\/\$\{editState\.slot\.id\}/);
  assert.match(source, /setState\(\{[\s\S]*editState: null,[\s\S]*success: "Timeslot updated\."/);
  assert.match(source, /editState:\s*\{[\s\S]*\.\.\.editState,[\s\S]*error:/);
  assert.doesNotMatch(source, /method: form\.editingId \? "PATCH" : "POST"/);
  assert.doesNotMatch(source, /const endpoint = form\.editingId/);
});

test("admin darkroom edit dialog uses the shared modal shell with mobile-safe layout", async () => {
  const source = await readFile(adminDarkroomEditDialogPath, "utf8");

  assert.match(source, /<ModalDialog[\s\S]*ariaLabel="Edit darkroom timeslot"/);
  assert.match(source, /preventClose=\{busy\}/);
  assert.match(source, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(source, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /aria-label="Close darkroom timeslot editor"/);
});
