export interface WebsiteEvent {
  id: string;
  title: string;
  date: string;
  endsAt: string | null;
  description: string | null;
  location: string | null;
  coverImageR2Key: string | null;
  discordEventId: string | null;
}

export function normalizeEvent(row: Record<string, unknown>): WebsiteEvent {
  return {
    id: readString(row.id) || crypto.randomUUID(),
    title: readString(row.title) || "Untitled Event",
    date: readString(row.date) || new Date().toISOString(),
    endsAt: readString(row.endsAt) ?? readString(row.ends_at),
    description: readString(row.description),
    location: readString(row.location),
    coverImageR2Key: readString(row.coverImageR2Key) ?? readString(row.cover_image_r2_key),
    discordEventId: readString(row.discordEventId) ?? readString(row.discord_event_id),
  };
}

export function parseEventDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function getEventStart(event: WebsiteEvent) {
  return parseEventDate(event.date) ?? new Date(0);
}

export function getEventEnd(event: WebsiteEvent) {
  return parseEventDate(event.endsAt) ?? getEventStart(event);
}

export function splitEvents(events: WebsiteEvent[], now = new Date()) {
  const upcoming = events
    .filter((event) => getEventEnd(event) >= now)
    .sort((a, b) => getEventStart(a).getTime() - getEventStart(b).getTime());

  const past = events
    .filter((event) => getEventEnd(event) < now)
    .sort((a, b) => getEventStart(b).getTime() - getEventStart(a).getTime());

  return { past, upcoming };
}

export function formatEventMonth(value: string) {
  const date = parseEventDate(value);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatEventDay(value: string) {
  const date = parseEventDate(value);
  if (!date) {
    return { day: "--", month: "TBD" };
  }

  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    month: date.toLocaleDateString("en-US", { month: "short" }),
  };
}

export function formatEventDateTime(event: WebsiteEvent) {
  const start = getEventStart(event);
  const end = parseEventDate(event.endsAt);
  const date = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) {
    return `${date} at ${startTime}`;
  }

  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${date}, ${startTime} - ${endTime}`;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
