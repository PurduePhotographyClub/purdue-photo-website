export const GALLERY_TAGS = [
  "Film",
  "Digital",
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
  "PPC",
] as const;

const CANONICAL_GALLERY_TAGS = new Map(
  GALLERY_TAGS.map((tag) => [tag.toLowerCase(), tag]),
);
const LEADING_EMOJI_PATTERN = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/gu;

export function parseGalleryTags(value: string | null | undefined) {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const valuePart of value?.split(",") ?? []) {
    const trimmed = valuePart.trim();
    if (!trimmed) continue;

    const withoutEmojiPrefix = trimmed.replace(LEADING_EMOJI_PATTERN, "").trim();
    const tag = CANONICAL_GALLERY_TAGS.get(trimmed.toLowerCase())
      ?? CANONICAL_GALLERY_TAGS.get(withoutEmojiPrefix.toLowerCase())
      ?? trimmed;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function serializeGalleryTags(tags: readonly string[]) {
  const normalized = parseGalleryTags(tags.join(","));
  return normalized.length > 0 ? normalized.join(", ") : null;
}
