export type ImageOrientation = "landscape" | "portrait" | "square" | "unknown";

export function getValidImageDimension(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function getImageOrientation(width: number | null | undefined, height: number | null | undefined): ImageOrientation {
  const validWidth = getValidImageDimension(width);
  const validHeight = getValidImageDimension(height);
  if (validWidth === undefined || validHeight === undefined) return "unknown";
  if (validHeight > validWidth) return "portrait";
  if (validWidth === validHeight) return "square";
  return "landscape";
}

// Legacy null rows prioritize no letterbox over perfect zero-CLS; stored dimensions keep current uploads stable.
export function getCompetitionWinnerSizes(place: 1 | 2 | 3, orientation: ImageOrientation) {
  if (place !== 1) return "(min-width: 1280px) 632px, (min-width: 768px) 50vw, 100vw";
  if (orientation === "portrait") return "(min-width: 768px) 384px, 100vw";
  if (orientation === "unknown") return "(min-width: 768px) 672px, 100vw";
  return "(min-width: 1280px) 1280px, 100vw";
}

export function getHomeCompetitionWinnerSizes(orientation: ImageOrientation) {
  if (orientation === "portrait") return "(min-width: 768px) 384px, 100vw";
  return "(min-width: 1024px) 512px, (min-width: 768px) 50vw, 100vw";
}
