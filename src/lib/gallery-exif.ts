const EXIF_SCAN_BYTES = 1024 * 1024;
const EXIF_TEXT_MAX_BYTES = 4096;
const GALLERY_METADATA_MAX_LENGTH = 200;

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] as const;
const JPEG_APP1_MARKER = 0xe1;
const JPEG_END_MARKER = 0xd9;
const JPEG_START_OF_SCAN_MARKER = 0xda;
const TIFF_ASCII = 2;
const TIFF_LONG = 4;
const TIFF_MAGIC = 42;

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_EXIF_IFD = 0x8769;
const TAG_LENS_MAKE = 0xa433;
const TAG_LENS_MODEL = 0xa434;
const TAG_UNIQUE_CAMERA_MODEL = 0xc614;

export interface GalleryExifMetadata {
  camera: string | null;
  lens: string | null;
}

interface ParsedIfd {
  pointers: Map<number, number>;
  strings: Map<number, string>;
}

function emptyGalleryExifMetadata(): GalleryExifMetadata {
  return { camera: null, lens: null };
}

function isStandaloneJpegMarker(marker: number) {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function hasBytes(bytes: Uint8Array, offset: number, expected: readonly number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function normalizeExifText(value: string): string | null {
  const normalized = value
    .replace(/\0.*$/s, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, GALLERY_METADATA_MAX_LENGTH);
  return normalized || null;
}

function readExifAscii(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  entryOffset: number,
  count: number,
  littleEndian: boolean,
) {
  if (count <= 0 || count > EXIF_TEXT_MAX_BYTES) return null;

  const valueOffset = count <= 4
    ? entryOffset + 8
    : tiffStart + view.getUint32(entryOffset + 8, littleEndian);
  if (valueOffset < tiffStart || valueOffset + count > tiffEnd) return null;

  let value = "";
  for (let index = 0; index < count; index += 1) {
    value += String.fromCharCode(view.getUint8(valueOffset + index));
  }
  return normalizeExifText(value);
}

function readIfd(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  relativeOffset: number,
  littleEndian: boolean,
): ParsedIfd | null {
  const ifdOffset = tiffStart + relativeOffset;
  if (relativeOffset < 0 || ifdOffset + 2 > tiffEnd) return null;

  const entryCount = view.getUint16(ifdOffset, littleEndian);
  if (entryCount > 256) return null;
  const entriesOffset = ifdOffset + 2;
  const entriesEnd = entriesOffset + (entryCount * 12);
  if (entriesEnd + 4 > tiffEnd) return null;

  const pointers = new Map<number, number>();
  const strings = new Map<number, string>();
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesOffset + (index * 12);
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);

    if (type === TIFF_ASCII) {
      const value = readExifAscii(
        view,
        tiffStart,
        tiffEnd,
        entryOffset,
        count,
        littleEndian,
      );
      if (value) strings.set(tag, value);
    } else if (type === TIFF_LONG && count === 1) {
      pointers.set(tag, view.getUint32(entryOffset + 8, littleEndian));
    }
  }

  return { pointers, strings };
}

function includesMaker(model: string, make: string) {
  const modelWords: string[] = model.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const makeWords: string[] = make.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const normalizedModel = modelWords.join(" ");
  const normalizedMake = makeWords.join(" ");
  const makerWord = makeWords.find((word) => word.length >= 3);

  return normalizedModel === normalizedMake ||
    normalizedModel.startsWith(`${normalizedMake} `) ||
    (makerWord !== undefined && modelWords.includes(makerWord));
}

function combineExifMakeAndModel(make: string | null, model: string | null) {
  if (!make) return model;
  if (!model) return make;
  return includesMaker(model, make)
    ? model
    : normalizeExifText(`${make} ${model}`);
}

function parseExifTiff(
  bytes: Uint8Array,
  tiffStart: number,
  tiffEnd: number,
): GalleryExifMetadata {
  if (tiffStart + 8 > tiffEnd) return emptyGalleryExifMetadata();

  const byteOrder = String.fromCharCode(bytes[tiffStart], bytes[tiffStart + 1]);
  if (byteOrder !== "II" && byteOrder !== "MM") return emptyGalleryExifMetadata();

  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(tiffStart + 2, littleEndian) !== TIFF_MAGIC) {
    return emptyGalleryExifMetadata();
  }

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  const ifd0 = readIfd(view, tiffStart, tiffEnd, ifd0Offset, littleEndian);
  if (!ifd0) return emptyGalleryExifMetadata();

  const exifIfdOffset = ifd0.pointers.get(TAG_EXIF_IFD);
  const exifIfd = exifIfdOffset === undefined
    ? null
    : readIfd(view, tiffStart, tiffEnd, exifIfdOffset, littleEndian);
  const make = ifd0.strings.get(TAG_MAKE) ?? null;
  const model = ifd0.strings.get(TAG_MODEL) ??
    ifd0.strings.get(TAG_UNIQUE_CAMERA_MODEL) ?? null;
  const lensMake = exifIfd?.strings.get(TAG_LENS_MAKE) ??
    ifd0.strings.get(TAG_LENS_MAKE) ?? null;
  const lensModel = exifIfd?.strings.get(TAG_LENS_MODEL) ??
    ifd0.strings.get(TAG_LENS_MODEL) ?? null;

  return {
    camera: combineExifMakeAndModel(make, model),
    lens: combineExifMakeAndModel(lensMake, lensModel),
  };
}

function parseGalleryExif(bytes: Uint8Array): GalleryExifMetadata {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return emptyGalleryExifMetadata();
  }

  let cursor = 2;
  while (cursor + 1 < bytes.length) {
    if (bytes[cursor] !== 0xff) return emptyGalleryExifMetadata();
    while (cursor < bytes.length && bytes[cursor] === 0xff) cursor += 1;
    if (cursor >= bytes.length) return emptyGalleryExifMetadata();

    const marker = bytes[cursor];
    cursor += 1;
    if (marker === JPEG_END_MARKER || marker === JPEG_START_OF_SCAN_MARKER) {
      return emptyGalleryExifMetadata();
    }
    if (isStandaloneJpegMarker(marker)) continue;
    if (cursor + 2 > bytes.length) return emptyGalleryExifMetadata();

    const segmentLength = (bytes[cursor] << 8) | bytes[cursor + 1];
    if (segmentLength < 2) return emptyGalleryExifMetadata();
    const segmentStart = cursor + 2;
    const segmentEnd = cursor + segmentLength;
    if (segmentEnd > bytes.length) return emptyGalleryExifMetadata();

    if (
      marker === JPEG_APP1_MARKER &&
      segmentStart + EXIF_HEADER.length <= segmentEnd &&
      hasBytes(bytes, segmentStart, EXIF_HEADER)
    ) {
      return parseExifTiff(
        bytes,
        segmentStart + EXIF_HEADER.length,
        segmentEnd,
      );
    }
    cursor = segmentEnd;
  }

  return emptyGalleryExifMetadata();
}

export async function readGalleryExifMetadata(file: File): Promise<GalleryExifMetadata> {
  try {
    const bytes = new Uint8Array(
      await file.slice(0, EXIF_SCAN_BYTES).arrayBuffer(),
    );
    return parseGalleryExif(bytes);
  } catch {
    return emptyGalleryExifMetadata();
  }
}

export function mergeGalleryExifAutofill(
  currentValue: string,
  previousAutofill: string,
  nextAutofill: string | null,
) {
  if (currentValue.trim() && currentValue !== previousAutofill) return currentValue;
  return nextAutofill ?? "";
}
