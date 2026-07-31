const GALLERY_EXPLORE_VIEW_PATTERN = /^v1\.[a-f0-9]{64}\.[0-9a-z]{1,11}$/;
const GALLERY_EXPLORE_RANDOM_BYTE_COUNT = 32;
const GALLERY_EXPLORE_MAX_PAGE = 10_000;

interface CreateGalleryExploreViewTokenInput {
  now?: Date;
  randomBytes?: Uint8Array;
}

export interface GalleryExploreUrlState {
  filter: string;
  page: number;
  view: string | null;
}

interface GalleryExploreUrlInput {
  filter: string;
  page: number;
  view: string;
}

function getRandomBytes() {
  const randomBytes = new Uint8Array(GALLERY_EXPLORE_RANDOM_BYTE_COUNT);
  crypto.getRandomValues(randomBytes);
  return randomBytes;
}

export function isGalleryExploreViewToken(value: string | null | undefined): value is string {
  return typeof value === "string" && GALLERY_EXPLORE_VIEW_PATTERN.test(value);
}

export function createGalleryExploreViewToken({
  now = new Date(),
  randomBytes = getRandomBytes(),
}: CreateGalleryExploreViewTokenInput = {}) {
  if (randomBytes.byteLength !== GALLERY_EXPLORE_RANDOM_BYTE_COUNT) {
    throw new Error("Gallery view randomness must contain 32 bytes.");
  }

  const seed = Array.from(randomBytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `v1.${seed}.${now.getTime().toString(36)}`;
}

export function readGalleryExploreUrlState(
  search: string,
  supportedTags: readonly string[],
): GalleryExploreUrlState {
  const parameters = new URLSearchParams(search);
  const requestedPage = Number(parameters.get("page"));
  const requestedTag = parameters.get("tag");
  const requestedView = parameters.get("view");

  return {
    filter: requestedTag && supportedTags.includes(requestedTag) ? requestedTag : "All",
    page: Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= GALLERY_EXPLORE_MAX_PAGE
      ? requestedPage
      : 1,
    view: isGalleryExploreViewToken(requestedView) ? requestedView : null,
  };
}

export function buildGalleryExploreUrl({ filter, page, view }: GalleryExploreUrlInput) {
  const parameters = new URLSearchParams();
  parameters.set("view", view);
  parameters.set("page", String(page));
  if (filter !== "All") parameters.set("tag", filter);
  return `/gallery?${parameters}`;
}
