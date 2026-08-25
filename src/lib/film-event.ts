import {
  clubDatePartsToKey,
  getClubDateParts,
} from "./club-time.ts";
import { parseEventDate } from "./events.ts";

export const FILM_EVENT_DATE_KEY = "2026-08-29";

export const FILM_EVENT_DETAILS = {
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
} as const;

export const FILM_EVENT_RETURN_DETAILS = {
  title: "Camera return details",
  buttonLabel: "See return details*",
  buttonHint: "Click or tap to open the return schedule",
  knowledgeLabUrl: "https://lib.purdue.edu/knowledgelab/",
  knowledgeLabLocation: "WALC 3007",
  returnWindows: [
    "Tuesday, Sept. 1–Friday, Sept. 4: return your camera while the Knowledge Lab is open.",
    "Saturday, Sept. 5: return it to the Knowledge Lab by 1 PM.",
    "After 1 PM on Saturday, Sept. 5: drop-off moves to the darkroom until 5 PM.",
  ],
  knowledgeLabHours: [
    "Monday, Thursday, Friday: 9 AM-8 PM",
    "Tuesday, Wednesday: 9 AM-5 PM",
    "Saturday: 9 AM-2 PM (camera drop-off ends at 1 PM)",
  ],
  darkroomNote: "After 1 PM on Saturday, Sept. 5, camera drop-off continues in the darkroom until 5 PM.",
} as const;

export const FILM_EVENT_RETURN_WINDOWS = [
  { date: "Tue, Sept. 1", location: "Knowledge Lab", hours: "9 AM–5 PM" },
  { date: "Wed, Sept. 2", location: "Knowledge Lab", hours: "9 AM–5 PM" },
  { date: "Thu, Sept. 3", location: "Knowledge Lab", hours: "9 AM–8 PM" },
  { date: "Fri, Sept. 4", location: "Knowledge Lab", hours: "9 AM–8 PM" },
  { date: "Sat, Sept. 5", location: "Knowledge Lab", hours: "9 AM–1 PM" },
  { date: "Sat, Sept. 5", location: "Darkroom", hours: "1–5 PM" },
] as const;

export const FILM_EVENT_KNOWLEDGE_LAB_HOURS = [
  { days: "Mon · Thu · Fri", hours: "9 AM–8 PM" },
  { days: "Tue · Wed", hours: "9 AM–5 PM" },
  { days: "Sat", hours: "9 AM–2 PM" },
] as const;

export const FILM_EVENT_STEPS = [
  {
    number: 1,
    title: "Pick up a camera",
    schedule: "Saturday, Aug. 29 · 1–4 PM",
    dateTime: "2026-08-29T13:00:00-04:00",
    details: ["Outside WALC", "While supplies last"],
    note: null,
    numberAsset: "/film-event/one.png",
  },
  {
    number: 2,
    title: "Shoot the roll",
    schedule: "Aug. 29–Sept. 5",
    dateTime: "2026-08-29",
    details: [
      "Each participant gets a point-and-shoot film camera.",
      "Use the full roll of film.",
    ],
    note: null,
    numberAsset: "/film-event/two.png",
  },
  {
    number: 3,
    title: "Return the camera",
    schedule: "Sept. 1–5",
    dateTime: "2026-09-01T09:00:00-04:00",
    details: [
      "Return it while the Knowledge Lab is open from Tuesday, Sept. 1 through Friday, Sept. 4.",
      "On Saturday, Sept. 5, use the Knowledge Lab until 1 PM or the darkroom from 1–5 PM.",
    ],
    note: null,
    numberAsset: "/film-event/three.png",
  },
  {
    number: 4,
    title: "Development + scans",
    schedule: "Sunday, Sept. 6 · 10 AM–8 PM",
    dateTime: "2026-09-06T10:00:00-04:00",
    details: [
      "Development takes place the following day.",
      "Free development and scans.",
      "Participants are encouraged to be present while the negatives come to life.",
      "You will be notified when your film is next in the queue.",
      "Attendance is optional.",
    ],
    note: null,
    numberAsset: "/film-event/four.png",
  },
] as const;

interface FilmEventCandidate {
  date: string;
  title: string;
}

export function findFilmEvent<T extends FilmEventCandidate>(events: readonly T[]) {
  return events.find((event) => {
    const date = parseEventDate(event.date);
    if (!date) return false;

    const normalizedTitle = event.title.toLocaleLowerCase("en-US");
    const isFilmEventTitle = normalizedTitle.includes("film") &&
      normalizedTitle.includes("event");
    const eventDateKey = clubDatePartsToKey(getClubDateParts(date));

    return isFilmEventTitle && eventDateKey === FILM_EVENT_DATE_KEY;
  }) ?? null;
}
