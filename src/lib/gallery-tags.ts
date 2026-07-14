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

export function parseGalleryTags(value: string | null | undefined) {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const valuePart of value?.split(",") ?? []) {
    const trimmed = valuePart.trim();
    if (!trimmed) continue;

    const tag = CANONICAL_GALLERY_TAGS.get(trimmed.toLowerCase());
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

type GalleryTagValue = string | readonly string[] | null | undefined;

function normalizeGalleryTagValue(value: GalleryTagValue) {
  const serialized = typeof value === "string" || value == null
    ? value
    : value.join(",");
  return parseGalleryTags(serialized);
}

export function getPrimaryGalleryTag(value: GalleryTagValue) {
  return normalizeGalleryTagValue(value)[0] ?? null;
}

export function makeGalleryTagPrimary(
  tags: readonly string[],
  primaryTag: string,
) {
  const normalized = normalizeGalleryTagValue(tags);
  const primaryIndex = normalized.findIndex(
    (tag) => tag.toLowerCase() === primaryTag.trim().toLowerCase(),
  );
  if (primaryIndex <= 0) return normalized;

  return [
    normalized[primaryIndex],
    ...normalized.filter((_, index) => index !== primaryIndex),
  ];
}

export function serializeGalleryTags(tags: readonly string[]) {
  const normalized = parseGalleryTags(tags.join(","));
  return normalized.length > 0 ? normalized.join(", ") : null;
}
