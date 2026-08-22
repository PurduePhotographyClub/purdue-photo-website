import { CLUB_TIME_ZONE } from "./club-time.ts";

export interface WebsiteEvent {
  id: string;
  title: string;
  date: string;
  endsAt: string | null;
  description: string | null;
  location: string | null;
  coverImageR2Key: string | null;
  discordEventId: string | null;
  discordSynced: boolean;
  discordSyncError: string | null;
  discordSyncStatus: "failed" | "not_applicable" | "synced" | null;
  photoCount: number;
  coverPhoto: WebsiteEventPhoto | null;
  photos: WebsiteEventPhoto[];
}

export interface WebsiteEventPhoto {
  id: string;
  caption: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  imageUrl: string;
  thumbnailUrl: string | null;
}

export type EventStatus = "live" | "past" | "upcoming";
export type EventDiscordState = "archive" | "linked" | "needs_attention" | "synced";
export type EventLoadStatus = "error" | "loaded" | "loading";

export function getEventLoadStatus(data: unknown, error: unknown): EventLoadStatus {
  if (data !== undefined) {
    return "loaded";
  }

  return error ? "error" : "loading";
}

export function normalizeEvent(row: Record<string, unknown>): WebsiteEvent {
  const photos = Array.isArray(row.photos)
    ? row.photos.flatMap((photo) => {
        const normalized = normalizeEventPhoto(photo);
        return normalized ? [normalized] : [];
      }).toSorted((first, second) => first.sortOrder - second.sortOrder)
    : [];
  const photoSummary = isRecord(row.photoSummary) ? row.photoSummary : null;
  const coverPhoto = normalizeEventPhoto(row.coverPhoto) ??
    normalizeEventPhoto(photoSummary?.cover);
  const requestedPhotoCount = readNonNegativeInteger(row.photoCount) ??
    readNonNegativeInteger(photoSummary?.count);

  return {
    id: readString(row.id) || crypto.randomUUID(),
    title: readString(row.title) || "Untitled Event",
    date: readString(row.date) || new Date().toISOString(),
    endsAt: readString(row.endsAt) ?? readString(row.ends_at),
    description: readString(row.description),
    location: readString(row.location),
    coverImageR2Key: readString(row.coverImageR2Key) ?? readString(row.cover_image_r2_key),
    discordEventId: readString(row.discordEventId) ?? readString(row.discord_event_id),
    discordSynced: readBoolean(row.discordSynced) ?? Boolean(
      readString(row.discordEventId) ?? readString(row.discord_event_id),
    ),
    discordSyncError: readString(row.discordSyncError),
    discordSyncStatus: readDiscordSyncStatus(row.discordSyncStatus),
    photoCount: requestedPhotoCount ?? photos.length,
    coverPhoto,
    photos,
  };
}

export function normalizeEventPhoto(value: unknown): WebsiteEventPhoto | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const imageUrl = readEventPhotoUrl(value.imageUrl, id, false);
  if (!id || !imageUrl) return null;

  return {
    id,
    caption: readString(value.caption),
    sortOrder: readNonNegativeInteger(value.sortOrder) ?? 0,
    width: readPositiveInteger(value.width),
    height: readPositiveInteger(value.height),
    imageUrl,
    thumbnailUrl: readEventPhotoUrl(value.thumbnailUrl, id, true),
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

export function getEventStatus(event: WebsiteEvent, now = new Date()): EventStatus {
  if (getEventStart(event) > now) {
    return "upcoming";
  }

  return getEventEnd(event) >= now ? "live" : "past";
}

export function findCurrentEvents(events: WebsiteEvent[], now = new Date()) {
  return events
    .filter((event) => getEventStatus(event, now) === "live")
    .sort((a, b) => getEventStart(a).getTime() - getEventStart(b).getTime());
}

export function findNextUpcomingEvent(events: WebsiteEvent[], now = new Date()) {
  return events
    .filter((event) => getEventStatus(event, now) === "upcoming")
    .sort((a, b) => getEventStart(a).getTime() - getEventStart(b).getTime())[0] ?? null;
}

export function getEventDiscordState(
  event: WebsiteEvent,
  now = new Date(),
): EventDiscordState {
  if (event.discordSyncStatus === "failed") {
    return "needs_attention";
  }
  if (event.discordSyncStatus === "synced") {
    return "synced";
  }
  if (event.discordSyncStatus === "not_applicable" && !event.discordEventId) {
    return "archive";
  }
  if (event.discordEventId || event.discordSynced) {
    return "linked";
  }

  return getEventStatus(event, now) === "past" ? "archive" : "needs_attention";
}

export function getEventDiscordActionLabel(
  event: WebsiteEvent,
  now = new Date(),
) {
  const discordState = getEventDiscordState(event, now);
  if (discordState === "archive") {
    return null;
  }
  if (discordState === "needs_attention") {
    return "Retry Discord sync";
  }
  if (getEventStatus(event, now) === "past") {
    return "Remove from Discord";
  }

  return "Resync Discord";
}

export function formatEventMonth(value: string) {
  const date = parseEventDate(value);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
  });
}

export function formatEventDay(value: string) {
  const date = parseEventDate(value);
  if (!date) {
    return { day: "--", month: "TBD" };
  }

  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit", timeZone: CLUB_TIME_ZONE }),
    month: date.toLocaleDateString("en-US", { month: "short", timeZone: CLUB_TIME_ZONE }),
  };
}

export function formatEventDateTime(event: WebsiteEvent) {
  const start = getEventStart(event);
  const end = parseEventDate(event.endsAt);
  const date = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  });

  if (!end) {
    const timeZone = start.toLocaleTimeString("en-US", {
      timeZone: CLUB_TIME_ZONE,
      timeZoneName: "short",
    }).split(" ").at(-1);
    return `${date} at ${startTime} ${timeZone ?? "ET"}`;
  }

  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
    timeZoneName: "short",
  });

  return `${date}, ${startTime} - ${endTime}`;
}

export function upsertEventRow<T extends { id?: unknown }>(
  rows: readonly T[] | undefined,
  event: T,
) {
  const currentRows = rows ?? [];
  const eventId = typeof event.id === "string" ? event.id : null;
  if (!eventId) {
    return [event, ...currentRows];
  }

  const existingIndex = currentRows.findIndex((row) => row.id === eventId);
  if (existingIndex < 0) {
    return [event, ...currentRows];
  }

  return currentRows.map((row, index) => index === existingIndex ? event : row);
}

export function removeEventRow<T extends { id?: unknown }>(
  rows: readonly T[] | undefined,
  eventId: string,
) {
  return (rows ?? []).filter((row) => row.id !== eventId);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readEventPhotoUrl(value: unknown, id: string | null, thumbnail: boolean) {
  if (!id || typeof value !== "string") return null;
  const expected = `/api/events/image/photo/${encodeURIComponent(id)}${thumbnail ? "?variant=thumbnail" : ""}`;
  return value === expected ? value : null;
}

function readNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDiscordSyncStatus(value: unknown): WebsiteEvent["discordSyncStatus"] {
  return value === "failed" || value === "not_applicable" || value === "synced"
    ? value
    : null;
}
