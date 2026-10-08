import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [homeSource, publicSource, memberSource, adminSource, editorSource, listSource, resultModalSource, galleryImagesSource, adminTypesSource, placementBadgeSource, imageDimensionsSource] = await Promise.all([
  readFile(new URL("../src/components/Home.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Competitions.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/CompetitionsDashboard.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/AdminCompetitions.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/competitions/CompetitionEditorPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/competitions/CompetitionList.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/competitions/ResultUploadModal.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/gallery-images.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/competitions/types.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/CompetitionPlacementBadge.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/image-dimensions.ts", import.meta.url), "utf8"),
]);

test("competition metadata no longer renders or submits competition descriptions", () => {
  assert.doesNotMatch(publicSource, /competition\.description/);
  assert.doesNotMatch(memberSource, /comp\.description/);
  assert.doesNotMatch(editorSource, /Description/);
  assert.doesNotMatch(listSource, /competition\.description/);
  assert.doesNotMatch(adminSource, /description\.trim\(\)/);
  assert.match(resultModalSource, /resultForm\.description/);
});

test("home winner cards use entry titles and disappear when no winner is loaded", () => {
  assert.doesNotMatch(homeSource, /winner\.description/);
  assert.match(homeSource, /winnerTitle: winner\.entryTitle \|\| "Untitled"/);
  assert.match(homeSource, /compStatus === "loaded" && !latestComp/);
  assert.match(homeSource, /alt=\{`\$\{latestComp\.winnerTitle\} by \$\{latestComp\.winner\}`\}/);
  assert.match(homeSource, /getHomeCompetitionWinnerSizes\(winnerOrientation\)/);
});

test("public competition winners use a two-column composition and accurate image sizing", () => {
  assert.match(publicSource, /grid grid-cols-1 gap-4 items-start md:grid-cols-2/);
  assert.match(publicSource, /getWinnerCardClass\(winner\)/);
  assert.match(publicSource, /md:col-span-2/);
  assert.match(publicSource, /getCompetitionWinnerSizes\(winner\.place, getImageOrientation\(winner\.width, winner\.height\)\)/);
  assert.match(publicSource, /alt=\{`\$\{winner\.title\} by \$\{winner\.photographer\}`\}/);
  assert.match(publicSource, /className="block h-auto w-full object-contain"/);
});

test("public competition results retain medium data without rendering medium badges", () => {
  assert.match(publicSource, /medium\?: "film" \| "digital" \| null;/);
  assert.match(publicSource, /medium: result\.medium === "film" \? "Film" : "Digital"/);
  assert.doesNotMatch(publicSource, /import \{ ExternalLink, Film, Monitor, X \} from "lucide-react"/);
  assert.doesNotMatch(publicSource, /winner\.medium === "Film"/);
  assert.doesNotMatch(publicSource, /lightbox\.medium === "Film"/);
  assert.doesNotMatch(publicSource, /<Film|<Monitor/);
});

test("competition result photos use intrinsic dimensions and preserve portrait layout", () => {
  assert.match(publicSource, /height: number \| null;/);
  assert.match(publicSource, /width: number \| null;/);
  assert.match(publicSource, /height: result\.height/);
  assert.match(publicSource, /width: result\.width/);
  assert.match(publicSource, /getImageOrientation\(winner\.width, winner\.height\)/);
  assert.match(publicSource, /md:max-w-sm md:justify-self-center/);
  assert.match(publicSource, /md:max-w-2xl md:justify-self-center/);
  assert.match(publicSource, /width=\{getValidImageDimension\(winner\.width\)\}/);
  assert.match(publicSource, /height=\{getValidImageDimension\(winner\.height\)\}/);
  assert.doesNotMatch(publicSource, /aspect-\[(?:16\/10|16\/9|4\/3)\]/);
  assert.doesNotMatch(publicSource, /const PlaceIcon = placeIcons/);
});

test("competition result previews preserve complete compositions in dashboards", () => {
  assert.match(adminTypesSource, /height: number \| null;/);
  assert.match(adminTypesSource, /width: number \| null;/);
  assert.match(listSource, /width=\{getValidImageDimension\(result\.width\)\}/);
  assert.match(listSource, /height=\{getValidImageDimension\(result\.height\)\}/);
  assert.match(listSource, /className="block h-auto w-full object-contain"/);
  assert.doesNotMatch(listSource, /aspect-\[4\/3\]/);
  assert.match(resultModalSource, /className="block h-auto w-full object-contain"/);
  assert.doesNotMatch(resultModalSource, /aspect-\[4\/3\]/);
  assert.match(resultModalSource, /min-h-40/);
  assert.match(resultModalSource, /full image is high quality/);
  assert.match(resultModalSource, /preview is lightweight/);
});

test("competition placement badges use consistent semantic icons and accessible sizing", () => {
  assert.match(placementBadgeSource, /1: Trophy, 2: Award, 3: Award/);
  assert.doesNotMatch(placementBadgeSource, /Medal/);
  assert.match(placementBadgeSource, /1st Place/);
  assert.match(placementBadgeSource, /2nd Place/);
  assert.match(placementBadgeSource, /3rd Place/);
  assert.match(placementBadgeSource, /size-4 shrink-0/);
  assert.match(placementBadgeSource, /strokeWidth=\{1\.75\}/);
  assert.match(placementBadgeSource, /aria-hidden="true"/);
  assert.match(placementBadgeSource, /3: "text-orange-300"/);
  assert.match(publicSource, /<CompetitionPlacementBadge place=\{winner\.place\}/);
  assert.match(publicSource, /<CompetitionPlacementBadge place=\{lightbox\.place\}/);
  assert.match(homeSource, /<CompetitionPlacementBadge place=\{1\}/);
});

test("home winner spotlight uses native ratio and a clear result hierarchy", () => {
  assert.match(homeSource, /height: number \| null;/);
  assert.match(homeSource, /width: number \| null;/);
  assert.match(homeSource, /height: winner\.height/);
  assert.match(homeSource, /width: winner\.width/);
  assert.match(homeSource, /getImageOrientation\(latestComp\.width, latestComp\.height\)/);
  assert.match(homeSource, /winnerOrientation === "portrait" \? "md:max-w-sm md:justify-self-center" : winnerOrientation === "unknown" \? "md:max-w-2xl md:justify-self-center" : "md:max-w-2xl"/);
  assert.match(homeSource, /getHomeCompetitionWinnerSizes\(winnerOrientation\)/);
  assert.match(homeSource, /Latest Competition/);
  assert.match(homeSource, /Winner Spotlight/);
  assert.match(homeSource, /<h3[\s\S]*?latestComp\.winnerTitle/);
  assert.match(homeSource, /By \{latestComp\.winner\}/);
  assert.match(homeSource, /Theme:.*latestComp\.theme/);
  assert.match(homeSource, /View Competition Results/);
  assert.match(homeSource, /width=\{getValidImageDimension\(latestComp\.width\)\}/);
  assert.match(homeSource, /height=\{getValidImageDimension\(latestComp\.height\)\}/);
  assert.match(homeSource, /className="block h-auto w-full object-contain"/);
  assert.doesNotMatch(homeSource, /Members compete with their best shot/);
});

test("competition image sizes stay accurate for orientation and legacy dimensions", async () => {
  const dimensions = await import("../src/lib/image-dimensions.ts");
  assert.equal(dimensions.getCompetitionWinnerSizes(1, "portrait"), "(min-width: 768px) 384px, 100vw");
  assert.equal(dimensions.getCompetitionWinnerSizes(1, "landscape"), "(min-width: 1280px) 1280px, 100vw");
  assert.equal(dimensions.getCompetitionWinnerSizes(1, "unknown"), "(min-width: 768px) 672px, 100vw");
  assert.equal(dimensions.getCompetitionWinnerSizes(2, "portrait"), "(min-width: 1280px) 632px, (min-width: 768px) 50vw, 100vw");
  assert.equal(dimensions.getHomeCompetitionWinnerSizes("portrait"), "(min-width: 768px) 384px, 100vw");
  assert.equal(dimensions.getHomeCompetitionWinnerSizes("landscape"), "(min-width: 1024px) 512px, (min-width: 768px) 50vw, 100vw");
  assert.equal(dimensions.getHomeCompetitionWinnerSizes("unknown"), "(min-width: 1024px) 512px, (min-width: 768px) 50vw, 100vw");
  assert.equal(dimensions.getImageOrientation(null, null), "unknown");
  assert.match(imageDimensionsSource, /Legacy null rows prioritize no letterbox over perfect zero-CLS/);
});

test("competition views share the date-only formatter", async () => {
  const dateModule = await import("../src/lib/date-only.ts");
  assert.equal(dateModule.formatDateOnly("2026-01-02"), "1/2/2026");
  assert.match(publicSource, /import \{ formatDateOnly \} from "@\/lib\/date-only"/);
  assert.match(memberSource, /import \{ formatDateOnly \} from "@\/lib\/date-only"/);
  assert.match(listSource, /import \{ formatDateOnly \} from "@\/lib\/date-only"/);
  assert.match(publicSource, /formatDateOnly\(competition\.submissionDeadline\)/);
  assert.match(memberSource, /formatDateOnly\(comp\.submissionDeadline\)/);
  assert.match(listSource, /formatDateOnly\(competition\.submissionDeadline\)/);
});

test("competition upload profiles retain gallery defaults and add a higher-quality competition profile", () => {
  assert.match(galleryImagesSource, /export const COMPETITION_FULL_IMAGE_MAX_DIMENSION = 3600/);
  assert.match(galleryImagesSource, /export const COMPETITION_FULL_IMAGE_QUALITY = 0\.90/);
  assert.match(galleryImagesSource, /export const COMPETITION_FULL_IMAGE_TARGET_BYTES = 3 \* 1024 \* 1024/);
  assert.match(galleryImagesSource, /export const COMPETITION_FULL_IMAGE_MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(galleryImagesSource, /export const COMPETITION_FULL_IMAGE_MIN_DIMENSION = 1800/);
  assert.match(galleryImagesSource, /export const COMPETITION_PREVIEW_IMAGE_MAX_DIMENSION = 1200/);
  assert.match(galleryImagesSource, /export const COMPETITION_PREVIEW_IMAGE_QUALITY = 0\.82/);
  assert.match(galleryImagesSource, /export const COMPETITION_PREVIEW_IMAGE_TARGET_BYTES = 400 \* 1024/);
  assert.match(galleryImagesSource, /export const COMPETITION_PREVIEW_IMAGE_MAX_BYTES = 700 \* 1024/);
  assert.match(galleryImagesSource, /export async function prepareCompetitionUploadImages/);
  assert.match(galleryImagesSource, /GALLERY_FULL_IMAGE_MAX_DIMENSION = 2200/);
  assert.match(galleryImagesSource, /GALLERY_PREVIEW_IMAGE_MAX_DIMENSION = 900/);
});
