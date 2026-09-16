import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const admin = await readFile(new URL("../src/components/dashboard/admin/competitions/CompetitionList.tsx", import.meta.url), "utf8");
const adminShell = await readFile(new URL("../src/components/dashboard/admin/AdminCompetitions.tsx", import.meta.url), "utf8");
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

test("ended competitions still allow result uploads", () => {
  assert.match(
    admin,
    /\(competition\.status === "judging" \|\| competition\.status === "closed"\)[\s\S]*Add Result/,
  );
});

test("ending stays available and lifecycle actions use the dashboard button hierarchy", () => {
  assert.doesNotMatch(admin, /const canEnd/);
  assert.doesNotMatch(admin, /Assign all three places/);
  assert.match(admin, /primaryActionClass/);
  assert.match(admin, /bg-white/);
  assert.match(admin, /focus-visible:outline/);
  assert.match(
    adminShell,
    /onClick=\{startCompetitionCreate\}[\s\S]*?bg-white[\s\S]*?New Competition/,
  );
  assert.match(dashboard, /bg-white[^"\n]*text-black/);
});

test("ended competitions expose a separate guarded Discord archive action", () => {
  assert.match(hook, /\/archive/);
  assert.match(hook, /Discord forum archived\./);
  assert.match(admin, /Archive Forum/);
  assert.match(
    admin,
    /competition\.status === "closed"[\s\S]*competition\.discordSyncStatus === "synced"[\s\S]*discordForumUrl/,
  );
  assert.match(
    admin,
    /disabled=\{archivingCompetitionId === competition\.id\}/,
  );
});

test("results must be connected to the original Discord entry", () => {
  assert.match(hook, /discord-entries/);
  assert.match(hook, /form\.append\("discordEntryId"/);
  assert.match(modal, /Original Discord entry/);
  assert.match(modal, /discordEntryId/);
});
