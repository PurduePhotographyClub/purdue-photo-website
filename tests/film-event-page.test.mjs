import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("/film-event uses a route-scoped campaign theme", async () => {
  const [route, layout, header, footer] = await Promise.all([
    read("src/pages/film-event.astro"),
    read("src/layouts/Layout.astro"),
    read("src/components/Header.tsx"),
    read("src/components/Footer.tsx"),
  ]);

  assert.match(route, /<Layout[^>]*theme=["']film-event["']/s);
  assert.match(route, /title=["']Film Event \| Purdue Photography Club["']/);
  assert.match(route, /showFloatingWidgets=\{false\}/);
  assert.match(route, /<FilmEventReturnDetails\s+client:load\s*\/>/);
  assert.doesNotMatch(route, /step-arrow|arrow\.png/);
  assert.doesNotMatch(route, /<FilmEventGallery\s+client:visible\s*\/>/);
  assert.doesNotMatch(route, /id=["']member-photos["']/);

  assert.match(layout, /theme\?:\s*["']default["']\s*\|\s*["']film-event["']/);
  assert.match(layout, /<Header[^>]*theme=\{theme\}/);
  assert.match(layout, /<Footer[^>]*theme=\{theme\}/);
  assert.match(header, /theme\s*===\s*["']film-event["']/);
  assert.match(footer, /theme\s*===\s*["']film-event["']/);
  assert.match(header, /specialEventLink\s*=\s*\{\s*to:\s*["']\/film-event["']/);
  assert.match(header, /href=\{specialEventLink\.to\}/);
  assert.match(header, /Special event/);
  assert.match(header, /Film event/);
  assert.match(header, /text-amber-300/);
  assert.doesNotMatch(header, /border-amber-300/);
  assert.doesNotMatch(header, /↗/);
});

test("the page uses the supplied artwork as responsive decorative assets", async () => {
  const assets = [
    "lomography-box.png",
    "camera.png",
    "one.png",
    "two.png",
    "three.png",
    "four.png",
  ];

  await Promise.all(assets.map((asset) =>
    access(new URL(`../public/film-event/${asset}`, import.meta.url))
  ));

  for (const asset of ["one.png", "two.png", "three.png", "four.png"]) {
    const png = await readFile(
      new URL(`../public/film-event/${asset}`, import.meta.url),
    );
    assert.equal(png.readUInt32BE(16), 500, `${asset} must be 500 px wide`);
    assert.equal(png.readUInt32BE(20), 500, `${asset} must be 500 px tall`);
  }

  const [route, contentModule] = await Promise.all([
    read("src/pages/film-event.astro"),
    read("src/lib/film-event.ts"),
  ]);
  const source = `${route}\n${contentModule}`;

  for (const asset of assets) {
    assert.match(source, new RegExp(`/film-event/${asset.replace(".", "\\.")}`));
  }
  assert.match(route, /<ol[^>]*aria-label=["']How the film event works["']/);
  assert.match(route, /data-step=\{step\.number\}/);
  assert.doesNotMatch(route, /step-arrow|arrow\.png/);
  assert.match(route, /motion-reduce:/);
  assert.match(route, /loading=["']lazy["']/);
  assert.match(route, /width=["']500["'][\s\S]*height=["']500["']/);
  assert.match(route, /\.step-number\s*\{[\s\S]*?width:\s*clamp\(5rem, 7vw, 6rem\);/);
  assert.doesNotMatch(route, /\.step-number\s*\{[\s\S]*?width:\s*175%;/);
  assert.match(route, /\.steps-list\s*\{[\s\S]*?max-width:\s*48rem;/);
  assert.match(route, /\.steps-list\s*\{[\s\S]*?gap:\s*clamp\(2\.5rem, 4vw, 4rem\);/);
  assert.match(route, /\.step-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*center;[\s\S]*?text-align:\s*center;/);
  assert.doesNotMatch(route, /border-top:\s*4px solid var\(--film-ink\)/);
  assert.doesNotMatch(route, /\.step-row:nth-child\(even\)/);
  assert.match(route, /@media \(max-width: 639px\)[\s\S]*?\.hero-camera\s*\{[\s\S]*?width:\s*min\(108%, 430px\);/);
  assert.doesNotMatch(route, /\.hero-camera-stage\s*\{\s*margin:\s*2rem -1rem 0;/);
  assert.doesNotMatch(route, /hero-orbit/);
  assert.doesNotMatch(source, /codex-clipboard/);
});

test("return step uses a dedicated dialog and the page keeps post-event gallery work hidden", async () => {
  const [route, returnDetails] = await Promise.all([
    read("src/pages/film-event.astro"),
    read("src/components/FilmEventReturnDetails.tsx"),
  ]);

  assert.match(route, /<FilmEventReturnDetails\s+client:load\s*\/>/);
  assert.match(route, /href=["']#return-plan["']/);
  assert.match(route, /id=\{step\.number === 3 \? 'return-plan' : undefined\}/);
  assert.match(route, /class=["']step-row scroll-mt-40["']/);
  assert.match(returnDetails, /return-details-anchor/);
  assert.match(returnDetails, /scroll-mt-/);
  assert.match(returnDetails, /buttonLabel/);
  assert.match(returnDetails, /buttonHint/);
  assert.match(returnDetails, /FILM_EVENT_DETAILS\.cameraPolicy/);
  assert.match(route, /\{FILM_EVENT_DETAILS\.cameraPolicy\}/);
  assert.match(returnDetails, /knowledgeLabUrl/);
  assert.match(returnDetails, /knowledgeLabLocation/);
  assert.match(returnDetails, /target=["']_blank["']/);
  assert.match(returnDetails, /rel=["']noreferrer["']/);
  assert.doesNotMatch(route, /Step \{step\.number\}/);
  assert.doesNotMatch(returnDetails, /Return logistics/);
  assert.doesNotMatch(returnDetails, /Camera return details<\/p>/);
  assert.doesNotMatch(returnDetails, /↗/);
  assert.match(returnDetails, /Knowledge Lab hours/);
  assert.match(returnDetails, /dialog/);
  assert.match(returnDetails, /ModalDialog/);
  assert.match(returnDetails, /darkroom/i);
  assert.doesNotMatch(route, /The developed rolls/);
  assert.doesNotMatch(route, /member contact sheet/i);
  assert.doesNotMatch(route, /share the photographs here/i);
});

test("the normal events archive links the matching record to its special page", async () => {
  const eventsPage = await read("src/components/EventsPage.tsx");

  assert.match(eventsPage, /findFilmEvent\(\[event\]\)/);
  assert.match(eventsPage, /href=["']\/film-event["']/);
  assert.match(eventsPage, /Open film event guide/);
  assert.match(eventsPage, /Film event page/);
});
