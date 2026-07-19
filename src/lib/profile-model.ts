export const PROFILE_TEMPLATES = [
  "contact-sheet",
  "print-index",
  "split-frame",
  "negative-strip",
  "editorial-grid",
  "darkroom-card",
  "diptych",
] as const;
export const PROFILE_DECORATIONS = [
  "none",
  "film-frame",
  "contact-marks",
  "viewfinder",
  "sprocket",
  "archival-stamp",
  "grid-lines",
] as const;
export const PROFILE_NAME_STYLES = [
  "classic",
  "film-credit",
  "editorial",
  "bold-print",
  "condensed",
  "typewriter",
  "small-caps",
] as const;
export const PROFILE_PALETTES = [
  "monochrome",
  "amber",
  "cyanotype",
  "forest",
  "burgundy",
  "violet",
] as const;
export const PROFILE_AVATAR_SHAPES = ["auto", "circle", "rounded", "square"] as const;
export const PROFILE_SOCIAL_STYLES = ["tiles", "labels"] as const;
export const PROFILE_SOCIAL_PLATFORMS = ["instagram", "discord", "vsco", "website", "email"] as const;
export const PROFILE_SOCIAL_ICONS = ["instagram", "discord", "vsco", "globe", "mail"] as const;
export const PROFILE_SPECIALTIES = [
  "Street",
  "Nature",
  "Landscape",
  "Portrait",
  "Wildlife",
  "Astro",
  "Macro",
  "Automotive",
  "Sports",
  "Events",
  "Travel",
  "Videography",
] as const;

export type ProfileTemplate = (typeof PROFILE_TEMPLATES)[number];
export type ProfileDecoration = (typeof PROFILE_DECORATIONS)[number];
export type ProfileNameStyle = (typeof PROFILE_NAME_STYLES)[number];
export type ProfilePalette = (typeof PROFILE_PALETTES)[number];
export type ProfileAvatarShape = (typeof PROFILE_AVATAR_SHAPES)[number];
export type ProfileSocialStyle = (typeof PROFILE_SOCIAL_STYLES)[number];
export type ProfileSocialPlatform = (typeof PROFILE_SOCIAL_PLATFORMS)[number];
export type ProfileSocialIconName = (typeof PROFILE_SOCIAL_ICONS)[number];
export type ProfileSpecialty = (typeof PROFILE_SPECIALTIES)[number];

const INCOMPATIBLE_PROFILE_DECORATIONS: Partial<Record<
  ProfileTemplate,
  ReadonlySet<ProfileDecoration>
>> = {
  "darkroom-card": new Set(["film-frame", "grid-lines"]),
  "negative-strip": new Set(["film-frame", "sprocket", "grid-lines"]),
};

export function resolveProfileDecoration(
  profile: Pick<ProfileDraft, "decoration" | "template">,
): ProfileDecoration {
  return INCOMPATIBLE_PROFILE_DECORATIONS[profile.template]?.has(profile.decoration)
    ? "none"
    : profile.decoration;
}

export function getCompatibleProfileDecorations(template: ProfileTemplate) {
  const incompatible = INCOMPATIBLE_PROFILE_DECORATIONS[template];
  return incompatible
    ? PROFILE_DECORATIONS.filter((decoration) => !incompatible.has(decoration))
    : [...PROFILE_DECORATIONS];
}

export const PROFILE_AVATAR_ZOOM_MIN = 100;
export const PROFILE_AVATAR_ZOOM_MAX = 200;
export const PROFILE_AVATAR_POSITION_MIN = 0;
export const PROFILE_AVATAR_POSITION_MAX = 100;

export interface ProfileSocial {
  icon: ProfileSocialIconName;
  platform: ProfileSocialPlatform;
  value: string;
}

export interface ProfileDraft {
  anonymous: boolean;
  anonymousId: string | null;
  avatarId: string | null;
  avatarPositionX: number;
  avatarPositionY: number;
  avatarShape: ProfileAvatarShape;
  avatarUrl: string | null;
  avatarZoom: number;
  bio: string;
  decoration: ProfileDecoration;
  displayName: string;
  enabled: boolean;
  nameStyle: ProfileNameStyle;
  palette: ProfilePalette;
  socialStyle: ProfileSocialStyle;
  socials: ProfileSocial[];
  specialties: ProfileSpecialty[];
  template: ProfileTemplate;
  username: string;
}

const SQUARE_PROFILE_AVATAR_TEMPLATES = new Set<ProfileTemplate>([
  "split-frame",
  "negative-strip",
  "editorial-grid",
  "diptych",
]);

export function resolveProfileAvatarShape(
  profile: Pick<ProfileDraft, "avatarShape" | "template">,
): Exclude<ProfileAvatarShape, "auto"> {
  if (profile.avatarShape !== "auto") return profile.avatarShape;
  return SQUARE_PROFILE_AVATAR_TEMPLATES.has(profile.template) ? "square" : "circle";
}

export interface ProfilePermissions {
  canDisable: boolean;
  canEdit: boolean;
  canEnable: boolean;
}

export interface NormalizedProfileResponse {
  permissions: ProfilePermissions;
  profile: ProfileDraft;
}

const RESERVED_PROFILE_USERNAMES = new Set([
  "admin",
  "api",
  "dashboard",
  "gallery",
  "profile",
  "profiles",
  "settings",
]);

const PROFILE_USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANONYMOUS_PROFILE_ID_PATTERN = /^p_[a-f0-9]{32}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function readNullableString(value: unknown) {
  const text = readString(value);
  return text || null;
}

function readBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

function includesValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

export function createEmptyProfileDraft(displayName: string): ProfileDraft {
  return {
    anonymous: false,
    anonymousId: null,
    avatarId: null,
    avatarPositionX: 50,
    avatarPositionY: 50,
    avatarShape: "auto",
    avatarUrl: null,
    avatarZoom: 100,
    bio: "",
    decoration: "none",
    displayName: displayName.trim(),
    enabled: false,
    nameStyle: "classic",
    palette: "monochrome",
    socialStyle: "tiles",
    socials: [],
    specialties: [],
    template: "contact-sheet",
    username: "",
  };
}

export function getProfileUsernameValidationError(value: string) {
  const username = value.trim().toLowerCase();
  if (username.length < 3 || username.length > 30) {
    return "Use 3 to 30 characters.";
  }
  if (!PROFILE_USERNAME_PATTERN.test(username)) {
    return "Use lowercase letters, numbers, and single hyphens only.";
  }
  if (RESERVED_PROFILE_USERNAMES.has(username)) {
    return "That profile URL is reserved.";
  }
  return null;
}

export function normalizeProfileUsername(value: string) {
  return value.trim().toLowerCase();
}

export function getPublicProfileHref(
  profile: Pick<ProfileDraft, "anonymous" | "anonymousId" | "enabled" | "username">,
) {
  if (!profile.enabled) return null;
  if (profile.anonymous) {
    return profile.anonymousId && ANONYMOUS_PROFILE_ID_PATTERN.test(profile.anonymousId)
      ? `/profile/${encodeURIComponent(profile.anonymousId)}`
      : null;
  }

  const normalized = normalizeProfileUsername(profile.username);
  return getProfileUsernameValidationError(normalized)
    ? null
    : `/profile/${encodeURIComponent(normalized)}`;
}

function isAllowedProfileAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\/api\/(?:v1\/)?profiles?\/[^\s?#]+(?:\?[^\s#]*)?$/.test(value) ||
    /^\/api\/(?:v1\/)?admin\/members\/[^\s/?#]+\/profile\/avatar(?:\?[^\s#]*)?$/.test(value);
}

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  const addressOnlyPattern = /^[a-z0-9.!'*+_-]+@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/i;
  return normalized.length <= 254 && addressOnlyPattern.test(normalized) ? normalized : null;
}

function normalizeHttpsUrl(value: string, allowedHosts?: ReadonlySet<string>) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (
      allowedHosts &&
      ![...allowedHosts].some((host) => hostname === host || hostname.endsWith(`.${host}`))
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeProfileSocialValue(
  platform: ProfileSocialPlatform,
  value: string,
) {
  if (!value.trim()) return null;
  if (platform === "email") return normalizeEmail(value);
  if (platform === "instagram") {
    return normalizeHttpsUrl(value, new Set(["instagram.com"]));
  }
  if (platform === "vsco") {
    return normalizeHttpsUrl(value, new Set(["vsco.co"]));
  }
  if (platform === "discord") {
    return normalizeHttpsUrl(value, new Set([
      "discord.com",
      "discord.gg",
      "discordapp.com",
    ]));
  }
  return normalizeHttpsUrl(value);
}

export function getProfileSocialValidationError(
  platform: ProfileSocialPlatform,
  value: string,
) {
  if (!value.trim() || normalizeProfileSocialValue(platform, value)) return null;
  if (platform === "email") return "Enter the email address only.";
  if (platform === "instagram") return "Use an Instagram link that starts with https://.";
  if (platform === "discord") return "Use a Discord link that starts with https://.";
  if (platform === "vsco") return "Use a VSCO link that starts with https://.";
  return "Use a complete link that starts with https://.";
}

export function getProfileSocialHref(social: ProfileSocial) {
  const normalized = normalizeProfileSocialValue(social.platform, social.value);
  if (!normalized) return null;
  return social.platform === "email" ? `mailto:${normalized}` : normalized;
}

export async function refreshProfileAfterMutation(
  onReload: () => Promise<unknown>,
  setStatus: (message: string) => void,
  successMessage: string,
) {
  setStatus(successMessage);
  try {
    await onReload();
  } catch {
    setStatus(`${successMessage} Refresh failed; reload the page to see the latest version.`);
  }
}

export function getDefaultProfileSocialIcon(
  platform: ProfileSocialPlatform,
): ProfileSocialIconName {
  if (platform === "website") return "globe";
  if (platform === "email") return "mail";
  return platform;
}

function normalizeSocials(value: unknown): ProfileSocial[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<ProfileSocialPlatform>();
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !includesValue(PROFILE_SOCIAL_PLATFORMS, entry.platform)) return [];
    if (seen.has(entry.platform)) return [];
    const normalized = normalizeProfileSocialValue(entry.platform, readString(entry.value));
    if (!normalized) return [];
    seen.add(entry.platform);
    return [{
      icon: includesValue(PROFILE_SOCIAL_ICONS, entry.icon)
        ? entry.icon
        : getDefaultProfileSocialIcon(entry.platform),
      platform: entry.platform,
      value: normalized,
    }];
  });
}

function normalizeSpecialties(value: unknown): ProfileSpecialty[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<ProfileSpecialty>();
  return value.flatMap((entry) => {
    if (!includesValue(PROFILE_SPECIALTIES, entry) || seen.has(entry)) return [];
    seen.add(entry);
    return [entry];
  });
}

export function normalizeProfileResponse(
  value: unknown,
  fallbackDisplayName: string,
): NormalizedProfileResponse {
  const root = isRecord(value) && isRecord(value.data) ? value.data : value;
  const response = isRecord(root) ? root : {};
  const rawProfile = isRecord(response.profile) ? response.profile : response;
  const rawPermissions = isRecord(response.permissions) ? response.permissions : {};
  const fallback = createEmptyProfileDraft(fallbackDisplayName);
  const template = includesValue(PROFILE_TEMPLATES, rawProfile.template)
    ? rawProfile.template
    : fallback.template;
  const decoration = includesValue(PROFILE_DECORATIONS, rawProfile.decoration)
    ? rawProfile.decoration
    : fallback.decoration;

  return {
    permissions: {
      canDisable: rawPermissions.canDisable === true,
      canEdit: rawPermissions.canEdit === true,
      canEnable: rawPermissions.canEnable === true,
    },
    profile: {
      anonymous: rawProfile.anonymous === true,
      anonymousId: typeof rawProfile.anonymousId === "string" && ANONYMOUS_PROFILE_ID_PATTERN.test(rawProfile.anonymousId)
        ? rawProfile.anonymousId
        : null,
      avatarId: readNullableString(rawProfile.avatarId),
      avatarPositionX: readBoundedInteger(
        rawProfile.avatarPositionX,
        fallback.avatarPositionX,
        PROFILE_AVATAR_POSITION_MIN,
        PROFILE_AVATAR_POSITION_MAX,
      ),
      avatarPositionY: readBoundedInteger(
        rawProfile.avatarPositionY,
        fallback.avatarPositionY,
        PROFILE_AVATAR_POSITION_MIN,
        PROFILE_AVATAR_POSITION_MAX,
      ),
      avatarShape: includesValue(PROFILE_AVATAR_SHAPES, rawProfile.avatarShape)
        ? rawProfile.avatarShape
        : fallback.avatarShape,
      avatarUrl: isAllowedProfileAssetUrl(rawProfile.avatarUrl) ? rawProfile.avatarUrl : null,
      avatarZoom: readBoundedInteger(
        rawProfile.avatarZoom,
        fallback.avatarZoom,
        PROFILE_AVATAR_ZOOM_MIN,
        PROFILE_AVATAR_ZOOM_MAX,
      ),
      bio: readString(rawProfile.bio),
      decoration,
      displayName: readString(rawProfile.displayName, fallback.displayName) || fallback.displayName,
      enabled: rawProfile.enabled === true,
      nameStyle: includesValue(PROFILE_NAME_STYLES, rawProfile.nameStyle)
        ? rawProfile.nameStyle
        : fallback.nameStyle,
      palette: includesValue(PROFILE_PALETTES, rawProfile.palette)
        ? rawProfile.palette
        : fallback.palette,
      socialStyle: includesValue(PROFILE_SOCIAL_STYLES, rawProfile.socialStyle)
        ? rawProfile.socialStyle
        : fallback.socialStyle,
      socials: normalizeSocials(rawProfile.socials),
      specialties: normalizeSpecialties(rawProfile.specialties),
      template,
      username: readString(rawProfile.username).toLowerCase(),
    },
  };
}

export function toProfileUpdate(
  profile: ProfileDraft,
  options: { includePrivacy?: boolean; includePublishing?: boolean } = {},
) {
  const base = {
    avatarPositionX: profile.avatarPositionX,
    avatarPositionY: profile.avatarPositionY,
    avatarShape: profile.avatarShape,
    avatarZoom: profile.avatarZoom,
    bio: profile.bio.trim() || null,
    decoration: profile.decoration,
    displayName: profile.displayName.trim(),
    nameStyle: profile.nameStyle,
    palette: profile.palette,
    socialStyle: profile.socialStyle,
    socials: profile.socials.map((social) => ({ ...social })),
    specialties: [...profile.specialties],
    template: profile.template,
    username: normalizeProfileUsername(profile.username) || null,
  };

  return {
    ...base,
    ...(options.includePrivacy === false ? {} : { anonymous: profile.anonymous }),
    ...(options.includePublishing === false ? {} : { enabled: profile.enabled }),
  };
}

export function getProfileAvatarImageStyle(
  profile: Pick<ProfileDraft, "avatarPositionX" | "avatarPositionY" | "avatarZoom">,
) {
  const positionX = readBoundedInteger(
    profile.avatarPositionX,
    50,
    PROFILE_AVATAR_POSITION_MIN,
    PROFILE_AVATAR_POSITION_MAX,
  );
  const positionY = readBoundedInteger(
    profile.avatarPositionY,
    50,
    PROFILE_AVATAR_POSITION_MIN,
    PROFILE_AVATAR_POSITION_MAX,
  );
  const zoom = readBoundedInteger(
    profile.avatarZoom,
    PROFILE_AVATAR_ZOOM_MIN,
    PROFILE_AVATAR_ZOOM_MIN,
    PROFILE_AVATAR_ZOOM_MAX,
  );
  const focalPoint = `${positionX}% ${positionY}%`;

  return {
    objectPosition: focalPoint,
    transform: `scale(${zoom / 100})`,
    transformOrigin: focalPoint,
  };
}
