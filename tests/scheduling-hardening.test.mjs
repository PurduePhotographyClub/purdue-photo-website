import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addClubCalendarDays,
  clubDatePartsToKey,
  clubDateTimeInputToUtcIso,
  clubDateTimeToUtcIso,
  startOfClubSunday,
} from "../src/lib/club-time.ts";

const darkroomCalendarPath = new URL(
  "../src/components/dashboard/DarkroomScheduleCalendar.tsx",
  import.meta.url,
);
const adminDarkroomPath = new URL(
  "../src/components/dashboard/admin/AdminDarkroomSchedule.tsx",
  import.meta.url,
);
const studioManagerPath = new URL(
  "../src/components/dashboard/StudioManager.tsx",
  import.meta.url,
);
const clubTimePath = new URL("../src/lib/club-time.ts", import.meta.url);

test("club time rejects DST gaps and preserves fall-back and year-boundary times", () => {
  assert.equal(clubDateTimeInputToUtcIso("2026-03-08T02:30"), null);
  assert.equal(
    clubDateTimeInputToUtcIso("2026-11-01T01:30"),
    "2026-11-01T05:30:00.000Z",
  );
  assert.equal(
    clubDateTimeInputToUtcIso("2026-12-31T23:45"),
    "2027-01-01T04:45:00.000Z",
  );
});

test("club weeks roll over on Indianapolis Sunday with an exclusive seven-day end", () => {
  assert.equal(
    clubDatePartsToKey(startOfClubSunday(new Date("2026-03-08T04:30:00.000Z"))),
    "2026-03-01",
  );
  const sunday = startOfClubSunday(new Date("2026-03-08T05:30:00.000Z"));
  assert.equal(clubDatePartsToKey(sunday), "2026-03-08");
  assert.equal(
    clubDateTimeToUtcIso(addClubCalendarDays(sunday, 7), 0),
    "2026-03-15T04:00:00.000Z",
  );
});

test("darkroom and studio calendars use one seven-day club-time window", async () => {
  const [darkroomCalendar, adminDarkroom, studioManager, clubTime] =
    await Promise.all([
      readFile(darkroomCalendarPath, "utf8"),
      readFile(adminDarkroomPath, "utf8"),
      readFile(studioManagerPath, "utf8"),
      readFile(clubTimePath, "utf8"),
    ]);

  assert.match(clubTime, /America\/Indiana\/Indianapolis/);
  assert.match(darkroomCalendar, /Array\.from\(\{ length: 7 \}/);
  assert.match(studioManager, /Array\.from\(\{ length: 7 \}/);
  assert.doesNotMatch(darkroomCalendar, /startOfLocalSunday/);
  assert.doesNotMatch(adminDarkroom, /startOfUtcSunday|startOfLocalSunday/);
  assert.doesNotMatch(
    adminDarkroom,
    /new Date\(form\.(?:startsAt|endsAt)\)\.toISOString\(\)/,
  );
});

test("the member studio booking surface is a labelled scroll-safe dialog", async () => {
  const studioManager = await readFile(studioManagerPath, "utf8");

  assert.match(
    studioManager,
    /<dialog[\s\S]*aria-labelledby="studio-booking-dialog-title"/,
  );
  assert.match(
    studioManager,
    /max-h-\[calc\(100dvh-2rem\)\][\s\S]*overflow-y-auto/,
  );
  assert.match(studioManager, /<form[\s\S]*onSubmit=/);
  assert.match(
    studioManager,
    /disabled=\{busy\}[\s\S]*aria-label="Close studio booking dialog"/,
  );
});

test("schedule synchronization warnings have warning semantics instead of success styling", async () => {
  const [darkroomCalendar, adminDarkroom] = await Promise.all([
    readFile(darkroomCalendarPath, "utf8"),
    readFile(adminDarkroomPath, "utf8"),
  ]);

  assert.match(darkroomCalendar, /syncWarning/);
  assert.match(darkroomCalendar, /role="status"/);
  assert.match(adminDarkroom, /syncWarning/);
  assert.match(adminDarkroom, /text-amber-/);
});
