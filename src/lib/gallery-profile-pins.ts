export const PROFILE_PIN_LIMIT = 3;

export interface ProfilePinState {
  atLimit: boolean;
  pinnedCount: number;
}

export function getProfilePinState(value: unknown): ProfilePinState {
  const count = typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : 0;
  const pinnedCount = Math.min(PROFILE_PIN_LIMIT, Math.max(0, count));

  return {
    atLimit: pinnedCount >= PROFILE_PIN_LIMIT,
    pinnedCount,
  };
}

export function getGalleryProfilePinRequest(photoId: string, currentlyPinned: boolean) {
  return {
    method: currentlyPinned ? "DELETE" as const : "PUT" as const,
    url: `/api/gallery/${encodeURIComponent(photoId)}/profile-pin`,
  };
}
