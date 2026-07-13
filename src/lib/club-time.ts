export const CLUB_TIME_ZONE = "America/Indiana/Indianapolis";

export interface ClubDateParts {
  day: number;
  month: number;
  year: number;
}

interface ClubDateTimeParts extends ClubDateParts {
  hour: number;
  minute: number;
  second: number;
}

const clubDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
});
const clubWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIME_ZONE,
  weekday: "short",
});

export function addClubCalendarDays(
  parts: ClubDateParts,
  days: number,
): ClubDateParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

export function clubDatePartsToKey(parts: ClubDateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function clubDateKeyToParts(key: string): ClubDateParts {
  const [year, month, day] = key
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  return { day: day || 1, month: month || 1, year: year || 1970 };
}

export function getClubDateParts(date: Date): ClubDateParts {
  const parts = getClubDateTimeParts(date);
  return { day: parts.day, month: parts.month, year: parts.year };
}

export function startOfClubSunday(date: Date): ClubDateParts {
  const parts = getClubDateParts(date);
  const weekday = clubWeekdayFormatter.format(date);
  const weekdayIndex = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ].indexOf(weekday);
  return addClubCalendarDays(parts, -Math.max(0, weekdayIndex));
}

export function clubDateTimeToUtcIso(
  parts: ClubDateParts,
  hour: number,
  minute = 0,
) {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    0,
    0,
  );
  let utcMs = targetAsUtc;

  for (let index = 0; index < 3; index += 1) {
    const actual = getClubDateTimeParts(new Date(utcMs));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      0,
    );
    utcMs -= actualAsUtc - targetAsUtc;
  }

  return new Date(utcMs).toISOString();
}

export function clubDateTimeInputToUtcIso(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const expected = {
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    month: Number(month),
    second: 0,
    year: Number(year),
  };
  const iso = clubDateTimeToUtcIso(expected, expected.hour, expected.minute);
  const actual = getClubDateTimeParts(new Date(iso));

  return actual.day === expected.day &&
    actual.hour === expected.hour &&
    actual.minute === expected.minute &&
    actual.month === expected.month &&
    actual.year === expected.year
    ? iso
    : null;
}

export function toClubDateTimeLocalValue(date: Date) {
  const parts = getClubDateTimeParts(date);
  return `${clubDatePartsToKey(parts)}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function getClubDateTimeParts(date: Date): ClubDateTimeParts {
  const parts = clubDateTimeFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    month: read("month"),
    second: read("second"),
    year: read("year"),
  };
}
