import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const admin = await readFile(new URL("../src/components/dashboard/admin/competitions/CompetitionList.tsx", import.meta.url), "utf8");
const hook = await readFile(new URL("../src/components/dashboard/admin/competitions/useAdminCompetitions.ts", import.meta.url), "utf8");
const modal = await readFile(new URL("../src/components/dashboard/admin/competitions/ResultUploadModal.tsx", import.meta.url), "utf8");
const publicPage = await readFile(new URL("../src/components/Competitions.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../src/components/dashboard/CompetitionsDashboard.tsx", import.meta.url), "utf8");
const discordUi = await readFile(new URL("../src/lib/competition-discord.ts", import.meta.url), "utf8");

test("competition pages link each competition to its own Discord forum", () => {
  for (const source of [admin, publicPage, dashboard]) {
    assert.match(source, /discordForum/);
    assert.doesNotMatch(source, /1338662150054608897/);
  }
});

test("admin lifecycle presents judging as voting and closed as ended", () => {
  assert.match(discordUi, /Start Voting/);
  assert.match(discordUi, /End Competition/);
  assert.match(admin, /STATUS_LABELS/);
  assert.match(admin, /Retry Discord Sync/);
  assert.match(hook, /\/sync/);
});

test("results must be connected to the original Discord entry", () => {
  assert.match(hook, /discord-entries/);
  assert.match(hook, /form\.append\("discordEntryId"/);
  assert.match(modal, /Original Discord entry/);
  assert.match(modal, /discordEntryId/);
});
