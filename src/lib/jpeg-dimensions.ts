const JPEG_MARKER_PREFIX = 0xff;
const JPEG_START_OF_IMAGE = 0xd8;
const JPEG_START_OF_SCAN = 0xda;
const JPEG_END_OF_IMAGE = 0xd9;
const START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

interface JpegDimensions {
  height: number;
  width: number;
}

function isStandaloneMarker(marker: number) {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

export function readJpegDimensions(
  input: ArrayBuffer | Uint8Array,
): JpegDimensions | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (
    bytes.length < 4 ||
    bytes[0] !== JPEG_MARKER_PREFIX ||
    bytes[1] !== JPEG_START_OF_IMAGE
  ) {
    return null;
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== JPEG_MARKER_PREFIX) return null;
    while (bytes[offset] === JPEG_MARKER_PREFIX) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;
    if (marker === JPEG_START_OF_SCAN || marker === JPEG_END_OF_IMAGE) return null;
    if (isStandaloneMarker(marker)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    const payloadStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.length) return null;

    if (START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentEnd - payloadStart < 6) return null;
      const height = (bytes[payloadStart + 1] << 8) | bytes[payloadStart + 2];
      const width = (bytes[payloadStart + 3] << 8) | bytes[payloadStart + 4];
      return width > 0 && height > 0 ? { height, width } : null;
    }

    offset = segmentEnd;
  }

  return null;
}
