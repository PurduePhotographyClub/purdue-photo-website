import {
  PROFILE_AVATAR_POSITION_MAX,
  PROFILE_AVATAR_POSITION_MIN,
  PROFILE_AVATAR_ZOOM_MAX,
  PROFILE_AVATAR_ZOOM_MIN,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_SPECIALTIES,
  type ProfileSpecialty,
} from "./profile-model";

const DIRECTORY_USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_AVATAR_PATTERN = /^\/api\/(?:v1\/)?profiles\/avatar\/[^\s/?#]+(?:\?[^\s#]*)?$/;

export interface MemberDirectoryProfile {
  avatarPositionX: number;
  avatarPositionY: number;
  avatarUrl: string | null;
  avatarZoom: number;
  bio: string;
  displayName: string;
  specialties: ProfileSpecialty[];
  username: string;
}

export interface MemberDirectoryMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface MemberDirectoryPage {
  meta: MemberDirectoryMeta;
  profiles: MemberDirectoryProfile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function readInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

function readNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
}

function normalizeSpecialties(value: unknown): ProfileSpecialty[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<ProfileSpecialty>();

  return value.flatMap((entry) => {
    if (
      typeof entry !== "string" ||
      !PROFILE_SPECIALTIES.includes(entry as ProfileSpecialty) ||
      seen.has(entry as ProfileSpecialty)
    ) return [];
    const specialty = entry as ProfileSpecialty;
    seen.add(specialty);
    return [specialty];
  });
}

function normalizeProfile(value: unknown): MemberDirectoryProfile | null {
  if (!isRecord(value)) return null;
  if (value.anonymous === true || value.enabled === false || value.showInDirectory === false) {
    return null;
  }

  const rawUsername = typeof value.username === "string" ? value.username.trim() : "";
  const username = rawUsername.toLowerCase();
  const displayName = readText(value.displayName, 80);
  if (
    !displayName ||
    username.length < 3 ||
    username.length > 30 ||
    !DIRECTORY_USERNAME_PATTERN.test(username)
  ) return null;

  return {
    avatarPositionX: readInteger(
      value.avatarPositionX,
      50,
      PROFILE_AVATAR_POSITION_MIN,
      PROFILE_AVATAR_POSITION_MAX,
    ),
    avatarPositionY: readInteger(
      value.avatarPositionY,
      50,
      PROFILE_AVATAR_POSITION_MIN,
      PROFILE_AVATAR_POSITION_MAX,
    ),
    avatarUrl: typeof value.avatarUrl === "string" && PUBLIC_AVATAR_PATTERN.test(value.avatarUrl)
      ? value.avatarUrl
      : null,
    avatarZoom: readInteger(
      value.avatarZoom,
      PROFILE_AVATAR_ZOOM_MIN,
      PROFILE_AVATAR_ZOOM_MIN,
      PROFILE_AVATAR_ZOOM_MAX,
    ),
    bio: readText(value.bio, PROFILE_BIO_MAX_LENGTH),
    displayName,
    specialties: normalizeSpecialties(value.specialties),
    username,
  };
}

function normalizeMeta(value: unknown, visibleCount: number): MemberDirectoryMeta {
  const meta = isRecord(value) ? value : {};
  const page = readPositiveInteger(meta.page, 1);
  const perPage = readPositiveInteger(meta.perPage, 24);
  const total = readNonNegativeInteger(meta.total, visibleCount);
  const totalPages = readPositiveInteger(meta.totalPages, Math.max(1, Math.ceil(total / perPage)));

  return {
    hasNextPage: typeof meta.hasNextPage === "boolean" ? meta.hasNextPage : page < totalPages,
    hasPreviousPage: typeof meta.hasPreviousPage === "boolean" ? meta.hasPreviousPage : page > 1,
    page,
    perPage,
    total,
    totalPages,
  };
}

export function normalizeMemberDirectoryResponse(value: unknown): MemberDirectoryPage {
  const root = isRecord(value) && isRecord(value.data) ? value.data : value;
  const response = isRecord(root) ? root : {};
  const profiles = Array.isArray(response.profiles)
    ? response.profiles.flatMap((entry) => {
      const profile = normalizeProfile(entry);
      return profile ? [profile] : [];
    })
    : [];

  return {
    meta: normalizeMeta(response.meta, profiles.length),
    profiles,
  };
}
