import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeSource = await readFile(
  new URL("../src/components/Home.tsx", import.meta.url),
  "utf8",
);

const merchSection = homeSource.match(
  /function MerchStoreSection[\s\S]*?interface FeaturedPhotosSectionProps/,
)?.[0] ?? "";

test("merch photos expose the correct author credits", () => {
  assert.match(merchSection, /<figcaption[^>]*>[\s\S]*Alejandro Griffith/);
  assert.match(merchSection, /<figcaption[^>]*>[\s\S]*Justin Lin/);
  assert.match(merchSection, /sm:group-hover:opacity-100/);
  assert.doesNotMatch(merchSection, /tabIndex=/);
});

test("stacked merch collage reserves space below rotated photos", () => {
  assert.match(
    merchSection,
    /h-\[340px\][^"]*sm:h-\[460px\][^"]*md:h-\[560px\][^"]*xl:h-\[500px\]/,
  );
});
