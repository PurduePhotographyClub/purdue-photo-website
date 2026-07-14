import { readJpegDimensions } from "./jpeg-dimensions.ts";

const GALLERY_IMAGE_PATH = "/api/gallery/image/photo/";
export const GALLERY_FULL_IMAGE_MAX_DIMENSION = 2200;
const GALLERY_PREVIEW_IMAGE_MAX_DIMENSION = 900;
const GALLERY_FULL_IMAGE_MIN_DIMENSION = 1200;
const GALLERY_PREVIEW_IMAGE_MIN_DIMENSION = 480;
const GALLERY_FULL_IMAGE_QUALITY = 0.78;
const GALLERY_PREVIEW_IMAGE_QUALITY = 0.68;
export const GALLERY_FULL_IMAGE_MAX_BYTES = 1_500_000;
export const GALLERY_FULL_IMAGE_TARGET_BYTES = 700 * 1024;
export const GALLERY_PREVIEW_IMAGE_MAX_BYTES = 450 * 1024;
export const GALLERY_PREVIEW_IMAGE_TARGET_BYTES = 160 * 1024;
export const GALLERY_SOURCE_IMAGE_MAX_BYTES = 50_000_000;
export const GALLERY_SOURCE_IMAGE_MAX_DIMENSION = 16_384;
export const GALLERY_SOURCE_IMAGE_MAX_PIXELS = 70_000_000;
const GALLERY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

type GalleryMedium = "Digital" | "Film";

interface GalleryRow {
  camera?: unknown;
  createdAt?: unknown;
  description?: unknown;
  height?: unknown;
  imageUrl?: unknown;
  lens?: unknown;
  metadataHidden?: unknown;
  profileUrl?: unknown;
  tags?: unknown;
  thumbnailUrl?: unknown;
  title?: unknown;
  uploaderName?: unknown;
  width?: unknown;
}

export interface GalleryPageMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface GalleryPage<T> {
  legacy: boolean;
  meta: GalleryPageMeta;
  photos: T[];
}

interface GalleryPageFallback {
  page: number;
  perPage: number;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasGalleryPageMeta(value: unknown): value is GalleryPageMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const meta = value as Partial<GalleryPageMeta>;
  return typeof meta.hasNextPage === "boolean" &&
    typeof meta.hasPreviousPage === "boolean" &&
    isPositiveInteger(meta.page) &&
    isPositiveInteger(meta.perPage) &&
    typeof meta.total === "number" &&
    Number.isSafeInteger(meta.total) &&
    meta.total >= 0 &&
    isPositiveInteger(meta.totalPages);
}

export function normalizeGalleryPage<T>(
  value: unknown,
  fallback: GalleryPageFallback,
): GalleryPage<T> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const page = value as Partial<GalleryPage<T>>;
    if (Array.isArray(page.photos) && hasGalleryPageMeta(page.meta)) {
      return { legacy: false, photos: page.photos, meta: page.meta };
    }
  }

  const photos = Array.isArray(value) ? value as T[] : [];
  const hasNextPage = photos.length === fallback.perPage;
  const total = ((fallback.page - 1) * fallback.perPage) + photos.length + (hasNextPage ? 1 : 0);

  return {
    legacy: true,
    photos,
    meta: {
      hasNextPage,
      hasPreviousPage: fallback.page > 1,
      page: fallback.page,
      perPage: fallback.perPage,
      total,
      totalPages: fallback.page + (hasNextPage ? 1 : 0),
    },
  };
}

export function normalizeGalleryPageForUrl<T>(
  value: unknown,
  url: string,
  defaultPerPage: number,
): GalleryPage<T> {
  const requestUrl = new URL(url, "https://gallery.local");
  const requestedPage = Number(requestUrl.searchParams.get("page"));
  const requestedPerPage = Number(requestUrl.searchParams.get("per_page"));

  return normalizeGalleryPage<T>(value, {
    page: isPositiveInteger(requestedPage) ? requestedPage : 1,
    perPage: isPositiveInteger(requestedPerPage) ? requestedPerPage : defaultPerPage,
  });
}

interface GalleryImageSource {
  author: string | null;
  camera: string | null;
  createdAt: string | null;
  description: string | null;
  fullSrc: string;
  height: number | null;
  lens: string | null;
  medium: GalleryMedium | null;
  metadataHidden: boolean;
  previewSrc: string;
  profileUrl: string | null;
  tags: string | null;
  title: string | null;
  width: number | null;
}

interface GalleryImageDimensions {
  height: number;
  width: number;
}

interface PreparedGalleryUploadImages {
  file: File;
  height: number;
  thumbnail: File;
  width: number;
}

interface LoadedGalleryImage {
  close?: () => void;
  height: number;
  image: CanvasImageSource;
  width: number;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function readGalleryImageUrl(value: unknown) {
  const url = readString(value);
  return url?.startsWith(GALLERY_IMAGE_PATH) ? url : null;
}

function readProfileUrl(value: unknown) {
  const url = readString(value);
  return url && /^\/profile\/(?:[a-z0-9]+(?:-[a-z0-9]+)*|p_[a-f0-9]{32})$/.test(url)
    ? url
    : null;
}

function readDate(value: unknown) {
  const date = readString(value);
  return date && !Number.isNaN(Date.parse(date)) ? date : null;
}

export function formatGalleryDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : GALLERY_DATE_FORMATTER.format(timestamp);
}

function readMedium(tags: unknown): GalleryMedium {
  const tagSet = new Set(
    readString(tags)
      ?.split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean) ?? [],
  );

  return tagSet.has("film") ? "Film" : "Digital";
}

export function getGalleryImageSources(row: GalleryRow): GalleryImageSource | null {
  const fullSrc = readGalleryImageUrl(row.imageUrl);
  const previewSrc = readGalleryImageUrl(row.thumbnailUrl);

  if (!fullSrc || !previewSrc) return null;

  const metadataHidden = row.metadataHidden === true;

  return {
    author: readString(row.uploaderName),
    camera: metadataHidden ? null : readString(row.camera),
    createdAt: readDate(row.createdAt),
    description: readString(row.description),
    fullSrc,
    height: readNumber(row.height),
    lens: metadataHidden ? null : readString(row.lens),
    medium: readMedium(row.tags),
    metadataHidden,
    previewSrc,
    profileUrl: readProfileUrl(row.profileUrl),
    tags: readString(row.tags),
    title: readString(row.title) ?? "Untitled",
    width: readNumber(row.width),
  };
}

export function getGalleryUploadValidationError(
  file: Pick<File, "size" | "type">,
): string | null {
  if (file.type !== "image/jpeg") {
    return "Choose a JPG or JPEG image.";
  }
  if (file.size <= 0) {
    return "Choose a non-empty JPEG image.";
  }
  if (file.size > GALLERY_SOURCE_IMAGE_MAX_BYTES) {
    return "Choose a JPEG that is 50 MB or smaller before optimization.";
  }
  return null;
}

export async function getGalleryUploadSourceValidationError(
  file: File,
): Promise<string | null> {
  const validationError = getGalleryUploadValidationError(file);
  if (validationError) return validationError;

  let dimensions: GalleryImageDimensions | null = null;
  try {
    dimensions = readJpegDimensions(await file.arrayBuffer());
  } catch {
    // The same user-facing validation message covers unreadable local files.
  }

  if (!dimensions) {
    return "Choose a valid JPG or JPEG image.";
  }

  const longestSide = Math.max(dimensions.width, dimensions.height);
  const pixels = dimensions.width * dimensions.height;
  if (
    longestSide > GALLERY_SOURCE_IMAGE_MAX_DIMENSION ||
    pixels > GALLERY_SOURCE_IMAGE_MAX_PIXELS
  ) {
    return "Choose a JPEG no larger than 70 megapixels or 16,384 px per side.";
  }

  return null;
}

export function getGalleryUploadTargetSize(
  dimensions: GalleryImageDimensions,
  maxDimension?: number,
): GalleryImageDimensions {
  const longestSide = Math.max(dimensions.width, dimensions.height);
  if (maxDimension === undefined || longestSide <= maxDimension) {
    return {
      height: Math.max(1, Math.round(dimensions.height)),
      width: Math.max(1, Math.round(dimensions.width)),
    };
  }

  const ratio = maxDimension / longestSide;
  return {
    height: Math.max(1, Math.round(dimensions.height * ratio)),
    width: Math.max(1, Math.round(dimensions.width * ratio)),
  };
}

function withJpegExtension(fileName: string, suffix = "") {
  const normalizedSuffix = suffix ? `-${suffix}` : "";
  if (/\.(jpe?g)$/i.test(fileName)) {
    return fileName.replace(/\.(jpe?g)$/i, `${normalizedSuffix}.jpg`);
  }
  return `${fileName}${normalizedSuffix}.jpg`;
}

async function loadGalleryImage(file: File): Promise<LoadedGalleryImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      close: () => bitmap.close(),
      height: bitmap.height,
      image: bitmap,
      width: bitmap.width,
    };
  }

  if (typeof document === "undefined") {
    throw new Error("Image optimization is only available in the browser.");
  }

  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        height: image.naturalHeight,
        image,
        width: image.naturalWidth,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected image."));
    };
    image.src = objectUrl;
  });
}

async function renderJpegFile(
  source: LoadedGalleryImage,
  size: GalleryImageDimensions,
  quality: number,
  name: string,
  lastModified: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to optimize the selected image.");
  }

  context.fillStyle = "#fff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(source.image, 0, 0, size.width, size.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
      } else {
        reject(new Error("Unable to optimize the selected image."));
      }
    }, "image/jpeg", quality);
  });

  return new File([blob], name, {
    lastModified,
    type: "image/jpeg",
  });
}

function reduceGalleryImageSize(
  size: GalleryImageDimensions,
  minDimension: number,
  currentBytes: number,
  maxBytes: number,
) {
  const longestSide = Math.max(size.width, size.height);
  const byteScale = Math.sqrt(maxBytes / currentBytes) * 0.95;
  const nextLongestSide = Math.max(
    minDimension,
    Math.round(longestSide * Math.min(0.85, byteScale)),
  );
  return getGalleryUploadTargetSize(size, nextLongestSide);
}

async function renderJpegWithinLimit(
  source: LoadedGalleryImage,
  size: GalleryImageDimensions,
  targetBytes: number,
  maxBytes: number,
  initialQuality: number,
  minDimension: number,
  name: string,
  lastModified: number,
) {
  let targetSize = size;
  let fallback: {
    file: File;
    height: number;
    width: number;
  } | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const file = await renderJpegFile(source, targetSize, initialQuality, name, lastModified);
    const candidate = {
      file,
      height: targetSize.height,
      width: targetSize.width,
    };

    if (file.size <= targetBytes) {
      return candidate;
    }
    if (file.size <= maxBytes && (!fallback || file.size < fallback.file.size)) {
      fallback = candidate;
    }

    const longestSide = Math.max(targetSize.width, targetSize.height);
    if (longestSide <= minDimension) break;

    const nextSize = reduceGalleryImageSize(targetSize, minDimension, file.size, targetBytes);
    if (nextSize.width === targetSize.width && nextSize.height === targetSize.height) break;
    targetSize = nextSize;
  }

  if (fallback) return fallback;
  throw new Error("Unable to keep the selected image under the gallery storage limit.");
}

export async function prepareGalleryUploadImages(file: File): Promise<PreparedGalleryUploadImages> {
  const validationError = await getGalleryUploadSourceValidationError(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const source = await loadGalleryImage(file);
  try {
    const fullSize = getGalleryUploadTargetSize(source, GALLERY_FULL_IMAGE_MAX_DIMENSION);
    const previewSize = getGalleryUploadTargetSize(source, GALLERY_PREVIEW_IMAGE_MAX_DIMENSION);
    const optimizedFile = await renderJpegWithinLimit(
      source,
      fullSize,
      GALLERY_FULL_IMAGE_TARGET_BYTES,
      GALLERY_FULL_IMAGE_MAX_BYTES,
      GALLERY_FULL_IMAGE_QUALITY,
      GALLERY_FULL_IMAGE_MIN_DIMENSION,
      withJpegExtension(file.name),
      file.lastModified,
    );

    const thumbnail = await renderJpegWithinLimit(
      source,
      previewSize,
      GALLERY_PREVIEW_IMAGE_TARGET_BYTES,
      GALLERY_PREVIEW_IMAGE_MAX_BYTES,
      GALLERY_PREVIEW_IMAGE_QUALITY,
      GALLERY_PREVIEW_IMAGE_MIN_DIMENSION,
      withJpegExtension(file.name, "preview"),
      file.lastModified,
    );

    return {
      file: optimizedFile.file,
      height: optimizedFile.height,
      thumbnail: thumbnail.file,
      width: optimizedFile.width,
    };
  } finally {
    source.close?.();
  }
}
