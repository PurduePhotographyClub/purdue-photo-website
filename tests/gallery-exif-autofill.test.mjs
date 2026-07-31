import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  mergeGalleryExifAutofill,
  readGalleryExifMetadata,
} from "../src/lib/gallery-exif.ts";

const galleryManagerSource = await readFile(
  new URL("../src/components/dashboard/GalleryManager.tsx", import.meta.url),
  "utf8",
);

function createExifJpeg({
  lensMake = "FUJIFILM",
  lensModel = "XF23mmF2 R WR",
  make = "FUJIFILM",
  model = "X-T5",
} = {}) {
  const littleEndian = true;
  const tiff = new Uint8Array(512);
  const view = new DataView(tiff.buffer);
  const write16 = (offset, value) => view.setUint16(offset, value, littleEndian);
  const write32 = (offset, value) => view.setUint32(offset, value, littleEndian);
  const ifd0Offset = 8;
  const ifd0Entries = 3;
  const exifIfdOffset = ifd0Offset + 2 + (ifd0Entries * 12) + 4;
  const exifEntries = 2;
  let dataOffset = exifIfdOffset + 2 + (exifEntries * 12) + 4;

  tiff.set([0x49, 0x49], 0);
  write16(2, 42);
  write32(4, ifd0Offset);
  write16(ifd0Offset, ifd0Entries);
  write16(exifIfdOffset, exifEntries);

  const writeAsciiEntry = (entryOffset, tag, value) => {
    const encoded = Uint8Array.from([
      ...Array.from(value, (character) => character.charCodeAt(0) & 0xff),
      0,
    ]);
    write16(entryOffset, tag);
    write16(entryOffset + 2, 2);
    write32(entryOffset + 4, encoded.length);
    write32(entryOffset + 8, dataOffset);
    tiff.set(encoded, dataOffset);
    dataOffset += encoded.length;
  };

  writeAsciiEntry(ifd0Offset + 2, 0x010f, make);
  writeAsciiEntry(ifd0Offset + 14, 0x0110, model);
  const exifPointerOffset = ifd0Offset + 26;
  write16(exifPointerOffset, 0x8769);
  write16(exifPointerOffset + 2, 4);
  write32(exifPointerOffset + 4, 1);
  write32(exifPointerOffset + 8, exifIfdOffset);
  write32(ifd0Offset + 2 + (ifd0Entries * 12), 0);

  writeAsciiEntry(exifIfdOffset + 2, 0xa433, lensMake);
  writeAsciiEntry(exifIfdOffset + 14, 0xa434, lensModel);
  write32(exifIfdOffset + 2 + (exifEntries * 12), 0);

  const tiffBytes = tiff.slice(0, dataOffset);
  const exifPayload = Uint8Array.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    ...tiffBytes,
  ]);
  const segmentLength = exifPayload.length + 2;
  return new File([
    Uint8Array.from([
      0xff, 0xd8,
      0xff, 0xe1,
      (segmentLength >> 8) & 0xff,
      segmentLength & 0xff,
    ]),
    exifPayload,
    Uint8Array.from([0xff, 0xd9]),
  ], "club-photo.jpg", { type: "image/jpeg" });
}

test("gallery EXIF metadata autofills camera and lens without repeating the maker", async () => {
  assert.deepEqual(await readGalleryExifMetadata(createExifJpeg()), {
    camera: "FUJIFILM X-T5",
    lens: "FUJIFILM XF23mmF2 R WR",
  });

  assert.deepEqual(await readGalleryExifMetadata(createExifJpeg({
    lensMake: "Canon",
    lensModel: "Canon RF24-70mm F2.8 L IS USM",
    make: "Canon",
    model: "Canon EOS R6 Mark II",
  })), {
    camera: "Canon EOS R6 Mark II",
    lens: "Canon RF24-70mm F2.8 L IS USM",
  });
});

test("gallery EXIF metadata safely ignores missing or malformed APP1 data", async () => {
  const withoutExif = new File([
    Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
  ], "plain.jpg", { type: "image/jpeg" });
  const truncatedExif = new File([
    Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20, 0x45, 0x78]),
  ], "truncated.jpg", { type: "image/jpeg" });

  for (const file of [withoutExif, truncatedExif]) {
    assert.deepEqual(await readGalleryExifMetadata(file), {
      camera: null,
      lens: null,
    });
  }
});

test("gallery EXIF metadata strips attacker-controlled C1 characters", async () => {
  const metadata = await readGalleryExifMetadata(createExifJpeg({
    make: "FUJI\u0085FILM",
  }));

  assert.equal(metadata.camera, "FUJI FILM X-T5");
  assert.doesNotMatch(metadata.camera ?? "", /[\u0000-\u001f\u007f-\u009f]/);
});

test("EXIF autofill replaces only blank or previously generated field values", () => {
  assert.equal(mergeGalleryExifAutofill("", "", "Canon EOS R5"), "Canon EOS R5");
  assert.equal(
    mergeGalleryExifAutofill("Canon EOS R5", "Canon EOS R5", "FUJIFILM X-T5"),
    "FUJIFILM X-T5",
  );
  assert.equal(
    mergeGalleryExifAutofill("My manual camera", "Canon EOS R5", "FUJIFILM X-T5"),
    "My manual camera",
  );
  assert.equal(mergeGalleryExifAutofill("Canon EOS R5", "Canon EOS R5", null), "");
});

test("gallery file selection reads EXIF before preview and upload optimization", () => {
  const validationIndex = galleryManagerSource.indexOf(
    "getGalleryUploadSourceValidationError(file)",
  );
  const exifIndex = galleryManagerSource.indexOf("readGalleryExifMetadata(file)");
  const staleGuardIndex = galleryManagerSource.indexOf(
    "fileRef.current?.files?.[0] !== file",
    exifIndex,
  );
  const autofillIndex = galleryManagerSource.indexOf("mergeGalleryExifAutofill(", exifIndex);
  const previewIndex = galleryManagerSource.indexOf("URL.createObjectURL(file)");
  const optimizationIndex = galleryManagerSource.indexOf("prepareGalleryUploadImages(file)");

  assert.ok(validationIndex >= 0);
  assert.ok(exifIndex > validationIndex);
  assert.ok(staleGuardIndex > exifIndex);
  assert.ok(autofillIndex > staleGuardIndex);
  assert.ok(previewIndex > autofillIndex);
  assert.ok(optimizationIndex > previewIndex);

  const cameraInput = galleryManagerSource.slice(
    galleryManagerSource.indexOf('aria-label="Camera"'),
    galleryManagerSource.indexOf('aria-label="Lens"'),
  );
  const lensInput = galleryManagerSource.slice(
    galleryManagerSource.indexOf('aria-label="Lens"'),
    galleryManagerSource.indexOf("</div>", galleryManagerSource.indexOf('aria-label="Lens"')),
  );
  assert.match(cameraInput, /maxLength=\{200\}/);
  assert.match(lensInput, /maxLength=\{200\}/);
  assert.match(galleryManagerSource, /appear with the photo/);
});
