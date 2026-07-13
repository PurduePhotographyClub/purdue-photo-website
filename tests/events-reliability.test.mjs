import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  findCurrentEvents,
  formatEventDateTime,
  formatEventDay,
  formatEventMonth,
  getEventDiscordActionLabel,
  getEventDiscordState,
  getEventLoadStatus,
  getEventStatus,
  normalizeEvent,
  parseEventDate,
  removeEventRow,
  splitEvents,
  upsertEventRow,
} from "../src/lib/events.ts";
import { PUBLIC_EVENTS_SWR_OPTIONS } from "../src/lib/http.ts";

const event = (overrides = {}) => ({
  id: "event-1",
  title: "Photo Walk",
  date: "2026-07-13T18:00:00.000Z",
  endsAt: "2026-07-13T20:00:00.000Z",
  description: null,
  location: "Purdue Memorial Union",
  coverImageR2Key: null,
  discordEventId: null,
  discordSynced: false,
  discordSyncError: null,
  discordSyncStatus: null,
  ...overrides,
});

test("Discord state keeps failed linked events recoverable", () => {
  const now = new Date("2026-07-13T19:00:00.000Z");
  const failedLinked = event({
    discordEventId: "123456789012345678",
    discordSynced: true,
    discordSyncError: "Discord sync failed.",
    discordSyncStatus: "failed",
  });
  const reloadedLinked = normalizeEvent({
    ...failedLinked,
    discordSyncError: undefined,
    discordSyncStatus: undefined,
  });

  assert.equal(getEventDiscordState(failedLinked, now), "needs_attention");
  assert.equal(getEventDiscordActionLabel(failedLinked, now), "Retry Discord sync");
  assert.equal(getEventDiscordState(reloadedLinked, now), "linked");
  assert.equal(getEventDiscordActionLabel(reloadedLinked, now), "Resync Discord");
  assert.equal(
    getEventDiscordActionLabel(
      event({ discordSyncStatus: "not_applicable" }),
      now,
    ),
    null,
  );
  assert.equal(
    getEventDiscordActionLabel(
      event({
        date: "2026-07-13T15:00:00.000Z",
        discordEventId: "123456789012345678",
        discordSynced: true,
        endsAt: "2026-07-13T17:00:00.000Z",
      }),
      now,
    ),
    "Remove from Discord",
  );
});

test("event status changes at inclusive start and end boundaries", () => {
  const item = event();

  assert.equal(getEventStatus(item, new Date("2026-07-13T17:59:59.999Z")), "upcoming");
  assert.equal(getEventStatus(item, new Date("2026-07-13T18:00:00.000Z")), "live");
  assert.equal(getEventStatus(item, new Date("2026-07-13T20:00:00.000Z")), "live");
  assert.equal(getEventStatus(item, new Date("2026-07-13T20:00:00.001Z")), "past");
});

test("public and staff event rows normalize into one display contract", () => {
  const publicRow = normalizeEvent({
    date: "2026-07-13T18:00:00.000Z",
    discordSynced: true,
    endDate: "ignored",
    ends_at: "2026-07-13T20:00:00.000Z",
    id: "public-event",
    title: "Public event",
  });
  const staffRow = normalizeEvent({
    date: "2026-07-13T18:00:00.000Z",
    discordEventId: "123456789012345678",
    discordSyncStatus: "failed",
    id: "staff-event",
    title: "Staff event",
  });

  assert.equal(publicRow.discordSynced, true);
  assert.equal(publicRow.endsAt, "2026-07-13T20:00:00.000Z");
  assert.equal(staffRow.discordSynced, true);
  assert.equal(staffRow.discordSyncStatus, "failed");
});

test("event grouping and date labels handle archives and invalid values", () => {
  const now = new Date("2026-07-13T19:00:00.000Z");
  const { past, upcoming } = splitEvents([
    event({ id: "past", date: "2026-07-12T18:00:00.000Z", endsAt: "2026-07-12T20:00:00.000Z" }),
    event({ id: "upcoming", date: "2026-07-14T18:00:00.000Z", endsAt: "2026-07-14T20:00:00.000Z" }),
  ], now);

  assert.deepEqual(past.map((item) => item.id), ["past"]);
  assert.deepEqual(upcoming.map((item) => item.id), ["upcoming"]);
  assert.deepEqual(formatEventDay("2026-07-13T18:00:00.000Z"), { day: "13", month: "Jul" });
  assert.equal(formatEventMonth("2026-07-13T18:00:00.000Z"), "Jul 2026");
  assert.equal(parseEventDate("not-a-date"), null);
  assert.deepEqual(formatEventDay("not-a-date"), { day: "--", month: "TBD" });
});

test("current event selection is ordered and ignores future or finished events", () => {
  const current = findCurrentEvents([
    event({ id: "later", date: "2026-07-13T18:30:00.000Z", endsAt: "2026-07-13T21:00:00.000Z" }),
    event({ id: "finished", date: "2026-07-13T15:00:00.000Z", endsAt: "2026-07-13T17:00:00.000Z" }),
    event({ id: "first", date: "2026-07-13T18:00:00.000Z", endsAt: "2026-07-13T20:30:00.000Z" }),
    event({ id: "future", date: "2026-07-13T19:30:00.000Z", endsAt: "2026-07-13T21:30:00.000Z" }),
  ], new Date("2026-07-13T19:00:00.000Z"));

  assert.deepEqual(current.map((item) => item.id), ["first", "later"]);
});

test("event times are formatted in Purdue time instead of the viewer timezone", () => {
  assert.equal(
    formatEventDateTime(event()),
    "July 13, 2026, 2:00 PM - 4:00 PM EDT",
  );
});

test("admin event cache helpers update immutable lists immediately", () => {
  const original = [event({ id: "older", title: "Older" })];
  const inserted = upsertEventRow(original, event({ id: "new", title: "New" }));
  const updated = upsertEventRow(inserted, event({ id: "older", title: "Updated" }));
  const removed = removeEventRow(updated, "new");

  assert.notEqual(inserted, original);
  assert.deepEqual(inserted.map((item) => item.id), ["new", "older"]);
  assert.deepEqual(updated.map((item) => item.title), ["New", "Updated"]);
  assert.deepEqual(removed.map((item) => item.id), ["older"]);
  assert.deepEqual(original.map((item) => item.title), ["Older"]);
});

test("public event refreshes preserve cached rows and still discover new events", () => {
  assert.equal(getEventLoadStatus([], new Error("refresh failed")), "loaded");
  assert.equal(getEventLoadStatus(undefined, new Error("initial load failed")), "error");
  assert.equal(getEventLoadStatus(undefined, undefined), "loading");
  assert.equal(PUBLIC_EVENTS_SWR_OPTIONS.refreshInterval, 60_000);
});

test("event surfaces use fresh admin reads, reactive live state, recovery, and a homepage widget", async () => {
  const [admin, eventsPage, home] = await Promise.all([
    readFile(new URL("../src/components/dashboard/admin/AdminEvents.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/EventsPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/Home.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(admin, /fetchFreshJson/);
  assert.match(admin, /clubDateTimeInputToUtcIso/);
  assert.match(admin, /toClubDateTimeLocalValue/);
  assert.match(admin, /\/api\/events\/\$\{[^}]+\}\/sync/);
  const syncSection = admin.slice(admin.indexOf("const syncEvent"), admin.indexOf("if (isLoading)"));
  assert.ok(syncSection.indexOf("await mutate(") < syncSection.indexOf("if (!res.ok"));
  assert.match(admin, /Confirm event deletion/);
  assert.match(admin, /min-h-11/);
  assert.match(admin, /showCancel=\{false\}/);
  assert.doesNotMatch(admin, /Purdue time|Eastern Time/);
  assert.doesNotMatch(admin, /DiscordStatusBadge/);
  assert.match(eventsPage, /useEventClock/);
  assert.match(eventsPage, /Showing the last saved event list/);
  assert.match(eventsPage, />\s*Retry/);
  assert.doesNotMatch(eventsPage, /event\.discordSynced\s*&&/);
  assert.match(home, /LiveEventWidget/);
  assert.match(home, /top-28/);
  assert.match(home, /view=home/);
});
