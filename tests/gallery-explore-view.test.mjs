import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const publicGallerySource = await readFile(
  new URL("../src/components/Gallery.tsx", import.meta.url),
  "utf8",
);
const galleryLibDirectory = new URL("../src/lib/", import.meta.url);
const galleryHelperNames = (await readdir(galleryLibDirectory))
  .filter((name) => name.startsWith("gallery-") && name.endsWith(".ts"));
const galleryHelperSources = await Promise.all(
  galleryHelperNames.map((name) => readFile(new URL(name, galleryLibDirectory), "utf8")),
);
const galleryExploreSource = [publicGallerySource, ...galleryHelperSources].join("\n");

function assertSourceMatch(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

test("gallery collection component is declared once after branch merges", () => {
  const declarations = publicGallerySource.match(/function\s+GalleryPhotoCollection\s*\(/g) ?? [];
  assert.equal(declarations.length, 1);
});

test("public gallery requests the explore order with its stable view token", () => {
  assertSourceMatch(
    galleryExploreSource,
    /(?:order=explore|["']order["']\s*[:,]\s*["']explore["'])/,
    "the public request must opt into explore ordering",
  );
  assertSourceMatch(
    galleryExploreSource,
    /(?:view=\$\{[^}]+\}|["']view["']\s*[:,]\s*[^,}\n]+|\.set\(["']view["'],)/,
    "the explore request must send its opaque view token",
  );
  assertSourceMatch(publicGallerySource, /explore\??\s*:\s*\{/, "gallery metadata must expose explore details");
  assertSourceMatch(publicGallerySource, /recentCount\s*:\s*number/, "explore metadata must type recentCount");
  assertSourceMatch(publicGallerySource, /view\s*:\s*string/, "explore metadata must type its normalized view");
});

test("a clean gallery visit creates one versioned seed-and-snapshot view and replaces the URL", () => {
  assertSourceMatch(
    galleryExploreSource,
    /["'`]v1/,
    "gallery explore tokens need an explicit v1 version marker",
  );
  assertSourceMatch(
    galleryExploreSource,
    /crypto\.(?:randomUUID|getRandomValues)/,
    "a fresh visit needs a cryptographically random seed",
  );
  assertSourceMatch(
    galleryExploreSource,
    /(?:Date\.now\(\)|new Date\(\))/,
    "a fresh view needs a snapshot timestamp",
  );
  assertSourceMatch(
    publicGallerySource,
    /history\.replaceState\(/,
    "the clean /gallery entry must replace itself with its shareable view URL",
  );
});

test("gallery page and filter navigation keep view, page, and tag in browser history", () => {
  assertSourceMatch(galleryExploreSource, /new URLSearchParams\(/, "gallery URLs need structured search parameters");
  assertSourceMatch(galleryExploreSource, /(?:\.set\(["']view["'],|view\s*:)/, "gallery URLs must retain view");
  assertSourceMatch(galleryExploreSource, /(?:\.set\(["']page["'],|page\s*:)/, "gallery URLs must retain page");
  assertSourceMatch(galleryExploreSource, /(?:\.set\(["']tag["'],|tag\s*:)/, "gallery URLs must retain tag");
  assertSourceMatch(
    publicGallerySource,
    /history\.pushState\(/,
    "page and filter changes must create navigable history entries",
  );
  assertSourceMatch(
    publicGallerySource,
    /setPage\(1\)/,
    "filter changes still reset the explore sequence to page 1",
  );
});

test("initial load and popstate restore the gallery view, page, and filter from the URL", () => {
  assertSourceMatch(galleryExploreSource, /window\.location\.(?:search|href)/, "initial gallery state must read the current URL");
  assertSourceMatch(galleryExploreSource, /\.get\(["']view["']\)/, "gallery state must read view from the URL");
  assertSourceMatch(galleryExploreSource, /\.get\(["']page["']\)/, "gallery state must read page from the URL");
  assertSourceMatch(galleryExploreSource, /\.get\(["']tag["']\)/, "gallery state must read tag from the URL");
  assertSourceMatch(publicGallerySource, /addEventListener\(["']popstate["']/, "Back and Forward need a popstate listener");
  assertSourceMatch(publicGallerySource, /removeEventListener\(["']popstate["']/, "the popstate listener needs cleanup");
  assertSourceMatch(publicGallerySource, /setPage\(/, "URL restoration must update page state");
  assertSourceMatch(publicGallerySource, /setFilter\(/, "URL restoration must update filter state");
  assertSourceMatch(
    publicGallerySource,
    /set\w*View\(/,
    "Back and Forward must restore the opaque view token as well as visible controls",
  );
});

test("gallery canonicalizes normalized URL inputs and server-clamped pages", () => {
  assertSourceMatch(publicGallerySource, /window\.location\.pathname/, "URL restoration must compare the canonical path");
  assertSourceMatch(publicGallerySource, /setPage\(normalizedPage\)/, "the client must adopt the API-clamped page");
  assertSourceMatch(
    publicGallerySource,
    /buildGalleryExploreUrl\(\{\s*filter,\s*page:\s*normalizedPage,\s*view:\s*normalizedView\s*\}\)/,
    "the shareable URL must use the normalized view and page",
  );
});

test("page one splits API-counted recent photos from discovery", () => {
  assertSourceMatch(publicGallerySource, /meta(?:\?\.|\.)explore(?:\?\.|\.)recentCount/, "recent lane size must come from API metadata");
  assertSourceMatch(publicGallerySource, /\.slice\(0,\s*\w*recent\w*Count\w*\)/i, "recent photos must use the API-provided boundary");
  assertSourceMatch(publicGallerySource, /\.slice\(\w*recent\w*Count\w*\)/i, "discovery must start after the API-provided recent boundary");
  assertSourceMatch(publicGallerySource, /(?:meta\.page|page)\s*===\s*1/, "the recent lane must be limited to page 1");
  assertSourceMatch(publicGallerySource, />\s*Recently added\s*</, "page 1 needs a Recently added heading");
  assertSourceMatch(publicGallerySource, />\s*Discover\s*</, "the gallery needs a Discover heading");
});

test("pages after page one keep discovery while omitting the recent lane", () => {
  const recentCountIsPageOneOnly = /const\s+\w*recent\w*Count\w*\s*=\s*(?:meta(?:\?\.|\.)page|page)\s*===\s*1[\s\S]{0,180}recentCount[\s\S]{0,80}:\s*0/i
    .test(publicGallerySource);
  const discoveryFallsBackToTheWholePage = /const\s+\w*discover\w*\s*=\s*(?:meta(?:\?\.|\.)page|page)\s*===\s*1[\s\S]{0,180}\.slice\([\s\S]{0,80}:\s*(?:visibleImages|images)/i
    .test(publicGallerySource);

  assert.ok(
    recentCountIsPageOneOnly || discoveryFallsBackToTheWholePage,
    "only page 1 may remove the API-counted recent lane from discovery",
  );
});

test("recent and discovery lanes are labelled regions without shrinking existing touch targets", () => {
  assertSourceMatch(
    publicGallerySource,
    /<section[^>]+aria-labelledby=["'{][^>]*>[\s\S]*Recently added/,
    "Recently added needs a labelled section",
  );
  assertSourceMatch(
    publicGallerySource,
    /<section[^>]+aria-labelledby=["'{][^>]*>[\s\S]*Discover/,
    "Discover needs a labelled section",
  );
  assertSourceMatch(publicGallerySource, /aria-label="Gallery pagination"/, "pagination must keep its accessible label");
  assertSourceMatch(publicGallerySource, /aria-pressed=\{filter === cat\}/, "filters must keep their pressed state");
  assertSourceMatch(publicGallerySource, /min-h-11/, "gallery controls must keep 44px minimum height targets");
  assertSourceMatch(publicGallerySource, /min-w-11/, "gallery controls must keep 44px minimum width targets");
});

test("compact recent cards keep rich metadata in discovery and the lightbox", () => {
  assertSourceMatch(publicGallerySource, /grid grid-cols-1 gap-2 sm:grid-cols-3/, "recent cards must use one mobile column");
  assertSourceMatch(publicGallerySource, /!isRecent\s*&&\s*img\.description/, "recent cards must omit descriptions");
  assertSourceMatch(publicGallerySource, /!isRecent\s*&&\s*formattedDate/, "recent cards must omit dates");
  assertSourceMatch(publicGallerySource, /!isRecent\s*&&\s*img\.primaryTag/, "recent cards must omit tag badges");
  assertSourceMatch(publicGallerySource, /by \{img\.author\}/, "recent cards must retain photographer attribution");
  assert.doesNotMatch(publicGallerySource, /The newest work, balanced across members\./);
  assert.doesNotMatch(publicGallerySource, /A member-balanced mix that stays with this visit\./);
});
