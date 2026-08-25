import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import test from "node:test";

test("film event content preserves the schedule and participation rules", async () => {
  const {
    FILM_EVENT_DETAILS,
    FILM_EVENT_KNOWLEDGE_LAB_HOURS,
    FILM_EVENT_RETURN_DETAILS,
    FILM_EVENT_RETURN_WINDOWS,
    FILM_EVENT_STEPS,
  } = await import(
    "../src/lib/film-event.ts"
  );

  assert.deepEqual(FILM_EVENT_DETAILS, {
    title: "Purdue Photo Club Film Event",
    pickupDate: "Saturday, August 29, 2026",
    pickupTime: "1–4 PM",
    pickupLocation: "Outside WALC",
    availability: "While supplies last",
    returnDeadline: "Saturday, September 5, 2026 at 5 PM",
    cameraPolicy: "Cameras must be returned; participants cannot keep them.",
    developmentDate: "Sunday, September 6, 2026",
    developmentTime: "10 AM–8 PM",
    developmentPrice: "Free development and scans",
  });

  assert.deepEqual(
    FILM_EVENT_STEPS.map(({ number, title }) => ({ number, title })),
    [
      { number: 1, title: "Pick up a camera" },
      { number: 2, title: "Shoot the roll" },
      { number: 3, title: "Return the camera" },
      { number: 4, title: "Development + scans" },
    ],
  );

  const copy = JSON.stringify(FILM_EVENT_STEPS);
  assert.match(copy, /point-and-shoot film camera/i);
  assert.match(copy, /Use the full roll of film/i);
  assert.match(copy, /encouraged to be present/i);
  assert.match(copy, /notified when your film is next in the queue/i);
  assert.match(copy, /Attendance is optional/i);

  assert.deepEqual(FILM_EVENT_RETURN_DETAILS.returnWindows, [
    "Tuesday, Sept. 1–Friday, Sept. 4: return your camera while the Knowledge Lab is open.",
    "Saturday, Sept. 5: return it to the Knowledge Lab by 1 PM.",
    "After 1 PM on Saturday, Sept. 5: drop-off moves to the darkroom until 5 PM.",
  ]);
  assert.deepEqual(FILM_EVENT_RETURN_DETAILS.knowledgeLabHours, [
    "Monday, Thursday, Friday: 9 AM-8 PM",
    "Tuesday, Wednesday: 9 AM-5 PM",
    "Saturday: 9 AM-2 PM (camera drop-off ends at 1 PM)",
  ]);
  assert.equal(FILM_EVENT_RETURN_DETAILS.buttonLabel, "See return details*");
  assert.equal(
    FILM_EVENT_RETURN_DETAILS.buttonHint,
    "Click or tap to open the return schedule",
  );
  assert.equal(
    FILM_EVENT_RETURN_DETAILS.knowledgeLabUrl,
    "https://lib.purdue.edu/knowledgelab/",
  );
  assert.equal(FILM_EVENT_RETURN_DETAILS.knowledgeLabLocation, "WALC 3007");

  const returnStep = FILM_EVENT_STEPS.find(({ number }) => number === 3);
  assert.equal(returnStep?.note, null);
  assert.deepEqual(FILM_EVENT_RETURN_WINDOWS, [
    { date: "Tue, Sept. 1", location: "Knowledge Lab", hours: "9 AM–5 PM" },
    { date: "Wed, Sept. 2", location: "Knowledge Lab", hours: "9 AM–5 PM" },
    { date: "Thu, Sept. 3", location: "Knowledge Lab", hours: "9 AM–8 PM" },
    { date: "Fri, Sept. 4", location: "Knowledge Lab", hours: "9 AM–8 PM" },
    { date: "Sat, Sept. 5", location: "Knowledge Lab", hours: "9 AM–1 PM" },
    { date: "Sat, Sept. 5", location: "Darkroom", hours: "1–5 PM" },
  ]);
  assert.deepEqual(FILM_EVENT_KNOWLEDGE_LAB_HOURS, [
    { days: "Mon · Thu · Fri", hours: "9 AM–8 PM" },
    { days: "Tue · Wed", hours: "9 AM–5 PM" },
    { days: "Sat", hours: "9 AM–2 PM" },
  ]);
});

test("the special gallery selects only the matching 2026 film event", async () => {
  const { findFilmEvent } = await import("../src/lib/film-event.ts");
  const rows = [
    {
      id: "wrong-year",
      title: "Purdue Photo Club Film Event",
      date: "2025-08-29T17:00:00.000Z",
    },
    {
      id: "wrong-title",
      title: "Campus photo walk",
      date: "2026-08-29T17:00:00.000Z",
    },
    {
      id: "film-2026",
      title: "Purdue Photo Club Film Event",
      date: "2026-08-29T17:00:00.000Z",
    },
  ];

  assert.equal(findFilmEvent(rows)?.id, "film-2026");
  assert.equal(findFilmEvent([]), null);
});
