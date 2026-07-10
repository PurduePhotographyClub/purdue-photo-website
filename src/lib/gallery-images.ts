const GALLERY_IMAGE_PATH = "/api/gallery/image/photo/";
const GALLERY_FULL_IMAGE_MAX_DIMENSION = 2200;
const GALLERY_PREVIEW_IMAGE_MAX_DIMENSION = 900;
const GALLERY_FULL_IMAGE_MIN_DIMENSION = 1200;
const GALLERY_PREVIEW_IMAGE_MIN_DIMENSION = 480;
const GALLERY_FULL_IMAGE_QUALITY = 0.82;
const GALLERY_PREVIEW_IMAGE_QUALITY = 0.7;
const GALLERY_MIN_IMAGE_QUALITY = 0.52;
export const GALLERY_FULL_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const GALLERY_PREVIEW_IMAGE_MAX_BYTES = 450 * 1024;

type GalleryMedium = "Digital" | "Film";

interface GalleryRow {
  camera?: unknown;
  height?: unknown;
  imageUrl?: unknown;
  lens?: unknown;
  tags?: unknown;
  thumbnailUrl?: unknown;
  title?: unknown;
  uploaderName?: unknown;
  width?: unknown;
}

interface GalleryImageSource {
  author: string;
  camera: string | null;
  fullSrc: string;
  height: number | null;
  lens: string | null;
  medium: GalleryMedium;
  previewSrc: string;
  title: string;
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

  if (!fullSrc) return null;
  const previewSrc = readGalleryImageUrl(row.thumbnailUrl) ?? fullSrc;

  return {
    author: readString(row.uploaderName) ?? "PPC Member",
    camera: readString(row.camera),
    fullSrc,
    height: readNumber(row.height),
    lens: readString(row.lens),
    medium: readMedium(row.tags),
    previewSrc,
    title: readString(row.title) ?? "Untitled",
    width: readNumber(row.width),
  };
}

export function getGalleryUploadTargetSize(
  dimensions: GalleryImageDimensions,
  maxDimension: number,
): GalleryImageDimensions {
  const longestSide = Math.max(dimensions.width, dimensions.height);
  if (longestSide <= maxDimension) {
    return {
      height: Math.round(dimensions.height),
      width: Math.round(dimensions.width),
    };
  }

  const ratio = maxDimension / longestSide;
  return {
    height: Math.round(dimensions.height * ratio),
    width: Math.round(dimensions.width * ratio),
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

function reduceGalleryImageSize(size: GalleryImageDimensions, minDimension: number) {
  const longestSide = Math.max(size.width, size.height);
  const nextLongestSide = Math.max(minDimension, Math.round(longestSide * 0.85));
  return getGalleryUploadTargetSize(size, nextLongestSide);
}

async function renderJpegWithinLimit(
  source: LoadedGalleryImage,
  size: GalleryImageDimensions,
  maxBytes: number,
  initialQuality: number,
  minDimension: number,
  name: string,
  lastModified: number,
) {
  let targetSize = size;
  let quality = initialQuality;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const file = await renderJpegFile(source, targetSize, quality, name, lastModified);
    if (file.size <= maxBytes) {
      return file;
    }

    if (quality > GALLERY_MIN_IMAGE_QUALITY) {
      quality = Math.max(GALLERY_MIN_IMAGE_QUALITY, Number((quality - 0.08).toFixed(2)));
      continue;
    }

    const longestSide = Math.max(targetSize.width, targetSize.height);
    if (longestSide <= minDimension) break;

    targetSize = reduceGalleryImageSize(targetSize, minDimension);
    quality = initialQuality;
  }

  throw new Error("Unable to keep the selected image under the gallery storage limit.");
}

export async function prepareGalleryUploadImages(file: File): Promise<PreparedGalleryUploadImages> {
  const source = await loadGalleryImage(file);
  try {
    const fullSize = getGalleryUploadTargetSize(source, GALLERY_FULL_IMAGE_MAX_DIMENSION);
    const previewSize = getGalleryUploadTargetSize(source, GALLERY_PREVIEW_IMAGE_MAX_DIMENSION);
    const optimizedFile = await renderJpegWithinLimit(
      source,
      fullSize,
      GALLERY_FULL_IMAGE_MAX_BYTES,
      GALLERY_FULL_IMAGE_QUALITY,
      GALLERY_FULL_IMAGE_MIN_DIMENSION,
      withJpegExtension(file.name),
      file.lastModified,
    );

    const thumbnail = await renderJpegWithinLimit(
      source,
      previewSize,
      GALLERY_PREVIEW_IMAGE_MAX_BYTES,
      GALLERY_PREVIEW_IMAGE_QUALITY,
      GALLERY_PREVIEW_IMAGE_MIN_DIMENSION,
      withJpegExtension(file.name, "preview"),
      file.lastModified,
    );

    return {
      file: optimizedFile,
      height: fullSize.height,
      thumbnail,
      width: fullSize.width,
    };
  } finally {
    source.close?.();
  }
}
