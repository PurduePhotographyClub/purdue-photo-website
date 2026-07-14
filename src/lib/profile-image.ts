import { readJpegDimensions } from "./jpeg-dimensions.ts";

export const PROFILE_AVATAR_MAX_DIMENSION = 512;
export const PROFILE_AVATAR_TARGET_BYTES = 80 * 1024;
export const PROFILE_AVATAR_MAX_BYTES = 200 * 1024;
export const PROFILE_AVATAR_SOURCE_MAX_BYTES = 10_000_000;
export const PROFILE_AVATAR_SOURCE_MAX_DIMENSION = 16_384;
export const PROFILE_AVATAR_SOURCE_MAX_PIXELS = 70_000_000;

interface LoadedImage {
  close?: () => void;
  height: number;
  image: CanvasImageSource;
  width: number;
}

function getTargetSize(width: number, height: number, maxDimension: number) {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) return { height, width };
  const ratio = maxDimension / longestSide;
  return {
    height: Math.max(1, Math.round(height * ratio)),
    width: Math.max(1, Math.round(width * ratio)),
  };
}

export async function getProfileAvatarSourceValidationError(file: File) {
  if (file.type !== "image/jpeg") return "Choose a JPG or JPEG image.";
  if (file.size <= 0) return "Choose a non-empty JPEG image.";
  if (file.size > PROFILE_AVATAR_SOURCE_MAX_BYTES) {
    return "Choose a JPEG that is 10 MB or smaller before optimization.";
  }

  let dimensions: { height: number; width: number } | null = null;
  try {
    dimensions = readJpegDimensions(await file.arrayBuffer());
  } catch {
    // The same validation response covers corrupt and unsupported JPEG files.
  }
  if (!dimensions) return "Choose a valid JPG or JPEG image.";

  if (
    Math.max(dimensions.width, dimensions.height) > PROFILE_AVATAR_SOURCE_MAX_DIMENSION ||
    dimensions.width * dimensions.height > PROFILE_AVATAR_SOURCE_MAX_PIXELS
  ) {
    return "Choose a JPEG no larger than 70 megapixels or 16,384 px per side.";
  }
  return null;
}

async function loadImage(file: File): Promise<LoadedImage> {
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
    throw new Error("Avatar optimization is only available in the browser.");
  }

  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ height: image.naturalHeight, image, width: image.naturalWidth });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected JPEG."));
    };
    image.src = objectUrl;
  });
}

async function encodeJpeg(
  source: LoadedImage,
  width: number,
  height: number,
  quality: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to optimize the selected JPEG.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source.image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error("Unable to optimize the selected JPEG."));
    }, "image/jpeg", quality);
  });
  return new File([blob], "profile-avatar.jpg", { type: "image/jpeg" });
}

export async function prepareProfileAvatarImage(file: File) {
  const validationError = await getProfileAvatarSourceValidationError(file);
  if (validationError) throw new Error(validationError);

  const source = await loadImage(file);
  try {
    let size = getTargetSize(source.width, source.height, PROFILE_AVATAR_MAX_DIMENSION);
    let fallback: File | null = null;

    for (let scaleAttempt = 0; scaleAttempt < 4; scaleAttempt += 1) {
      for (const quality of [0.82, 0.74, 0.66, 0.58]) {
        const candidate = await encodeJpeg(source, size.width, size.height, quality);
        if (candidate.size <= PROFILE_AVATAR_TARGET_BYTES) return candidate;
        if (candidate.size <= PROFILE_AVATAR_MAX_BYTES && (!fallback || candidate.size < fallback.size)) {
          fallback = candidate;
        }
      }
      size = getTargetSize(size.width, size.height, Math.max(160, Math.round(Math.max(size.width, size.height) * 0.78)));
    }

    if (fallback) return fallback;
    throw new Error("Unable to keep this avatar under 200 KB.");
  } finally {
    source.close?.();
  }
}
