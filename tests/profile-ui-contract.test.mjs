import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  settingsSource,
  profileSettingsSource,
  profileFieldsSource,
  profileSocialsSource,
  profileAppearanceSource,
  publicProfileSource,
  profileRendererSource,
  profileGallerySource,
  profileRouteSource,
  adminMembersSource,
  adminEditorSource,
  adminRouteSource,
  gallerySource,
  homeSource,
  middlewareSource,
  headerSource,
] = await Promise.all([
  readFile(new URL("../src/components/dashboard/SettingsPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/profile/ProfileSettingsPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileFormFields.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileSocialLinksEditor.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileAppearancePicker.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/PublicProfile.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileTemplateRenderer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileGallery.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/profile/[username].astro", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/AdminMembers.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/AdminMemberProfileEditor.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/dashboard/admin/members/[id]/profile.astro", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Gallery.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Home.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/middleware.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Header.tsx", import.meta.url), "utf8"),
]);

test("settings includes an accessible first-class Profile tab and membership lock", () => {
  assert.match(settingsSource, /id:\s*"profile"/);
  assert.match(settingsSource, /ProfileSettingsPanel/);
  assert.match(settingsSource, /role="tablist"/);
  assert.match(settingsSource, /role="tab"/);
  assert.match(settingsSource, /aria-selected/);
  assert.match(settingsSource, /ArrowRight/);
  assert.match(settingsSource, /ArrowLeft/);
  assert.match(profileSettingsSource, /Enable public profile/);
  assert.match(profileSettingsSource, /Anonymous profile/);
  assert.match(profileSettingsSource, /Save profile/);
  assert.match(profileSettingsSource, /View profile/);
  assert.match(profileSettingsSource, /getPublicProfileHref/);
  assert.match(profileSettingsSource, /canEdit/);
  assert.match(profileSettingsSource, /canDisable/);
  assert.match(profileSettingsSource, /Active membership/);
  assert.match(profileSettingsSource, /prepareProfileAvatarImage/);
  const profileSettingsParentSource = profileSettingsSource.slice(
    profileSettingsSource.indexOf("export default function ProfileSettingsPanel"),
  );
  assert.match(profileSettingsParentSource, /const \[success, setSuccess\] = useState\(""\)/);
  assert.match(profileSettingsParentSource, /onSuccessChange=\{setSuccess\}/);
  assert.match(profileSettingsParentSource, /success=\{success\}/);
});

test("profile editor exposes every fixed field and uses immutable update patterns", () => {
  for (const label of [
    "Display name",
    "Profile URL",
    "Bio",
    "Social links",
    "Photography roles",
    "Layout and details",
  ]) {
    assert.match(
      `${profileSettingsSource}\n${profileFieldsSource}\n${profileAppearanceSource}`,
      new RegExp(label, "i"),
    );
  }
  assert.match(profileSettingsSource, /PROFILE_SOCIAL_PLATFORMS/);
  assert.match(profileSettingsSource, /PROFILE_SPECIALTIES/);
  assert.match(profileSettingsSource, /PROFILE_TEMPLATES/);
  assert.doesNotMatch(profileSettingsSource, /\.push\(/);
  assert.doesNotMatch(profileSettingsSource, /dangerouslySetInnerHTML/);
  assert.match(profileFieldsSource, /cursor-not-allowed/);
  assert.match(profileFieldsSource, /ProfileSocialLinksEditor/);
  assert.match(profileFieldsSource, /ProfileAppearancePicker/);
  assert.match(profileFieldsSource, /Up to 512px and 200KB\./);
  assert.match(profileSocialsSource, /ModalDialog/);
  assert.match(profileSocialsSource, /Add social/);
  assert.match(profileSocialsSource, /Remove/);
  assert.match(profileAppearanceSource, /PROFILE_DECORATIONS/);
  assert.match(profileAppearanceSource, /negative-strip/);
  assert.match(profileAppearanceSource, /split-frame/);
});

test("public profiles render four responsive templates from one aggregate paginated API", () => {
  assert.match(profileRouteSource, /PublicProfile/);
  assert.match(profileRouteSource, /robots="noindex, nofollow, noimageindex, noarchive"/);
  assert.match(profileRendererSource, /ContactSheetHeader/);
  assert.match(profileRendererSource, /PrintIndexHeader/);
  assert.match(profileRendererSource, /SplitFrameHeader/);
  assert.match(profileRendererSource, /NegativeStripHeader/);
  assert.match(publicProfileSource, /\/api\/profiles\//);
  assert.match(publicProfileSource, /per_page=15/);
  assert.match(publicProfileSource, /PPC Member profile/);
  assert.match(publicProfileSource, /createdAt:\s*readNullableText\(value\.createdAt\)/);
  assert.match(profileGallerySource, /aria-label="Profile gallery pagination"/);
  assert.match(profileGallerySource, /aria-live="polite"/);
  assert.match(profileGallerySource, /scrollIntoView/);
  assert.match(profileGallerySource, /min-h-11/);
  assert.match(profileGallerySource, /sm:columns-2/);
  assert.match(profileGallerySource, /lg:columns-3/);
});

test("global gallery uses API-provided profile links without nesting interactive controls", () => {
  const cardSource = gallerySource.slice(
    gallerySource.indexOf("<figure"),
    gallerySource.indexOf("</figure>") + "</figure>".length,
  );
  assert.match(gallerySource, /profileUrl/);
  assert.match(gallerySource, /metadataHidden/);
  assert.match(cardSource, /<figure/);
  assert.match(cardSource, /href=\{img\.profileUrl\}/);
  assert.ok(cardSource.indexOf("href={img.profileUrl}") < cardSource.indexOf("<button"));
  assert.match(cardSource, /href=\{img\.profileUrl\}[\s\S]*?className="[^"]*min-h-11/);
  assert.match(cardSource, /View .*profile/);
  assert.doesNotMatch(cardSource, /<button[^>]*>[\s\S]*<a\s[\s\S]*<\/button>/);
});

test("homepage keeps profile-wide anonymous photo tags available", () => {
  assert.match(homeSource, /medium:\s*source\.medium/);
  assert.match(homeSource, /item\.medium\s*&&/);
});

test("signed-in header exposes the account destinations from one accessible menu", () => {
  assert.match(headerSource, /aria-haspopup="menu"/);
  assert.match(headerSource, /role="menu"/);
  assert.match(headerSource, /View profile/);
  assert.match(headerSource, /Profile settings/);
  assert.match(headerSource, /Dashboard/);
  assert.match(headerSource, /Sign out/);
  assert.match(headerSource, /getPublicProfileHref/);
  assert.match(headerSource, /authClient\.signOut/);
  assert.doesNotMatch(headerSource, /profileRequestStartedRef/);
  assert.match(headerSource, /new AbortController\(\)/);
  assert.match(headerSource, /signal:\s*controller\.signal/);
});

test("member list links only enabled profiles to a dedicated responsive staff editor", () => {
  assert.match(adminMembersSource, /profileEnabled/);
  assert.match(adminMembersSource, /profileUsername/);
  assert.match(adminMembersSource, /Edit profile/);
  assert.match(adminMembersSource, /\/dashboard\/admin\/members\//);
  assert.match(
    adminMembersSource,
    /href=\{`\/dashboard\/admin\/members\/[\s\S]*?className="[^"]*min-h-11/,
  );
  assert.match(adminEditorSource, /\/api\/admin\/members\//);
  assert.match(adminEditorSource, /ProfileFormFields/);
  assert.match(adminEditorSource, /max-w-/);
  const adminEditorParentSource = adminEditorSource.slice(
    adminEditorSource.indexOf("export default function AdminMemberProfileEditor"),
  );
  assert.match(adminEditorParentSource, /const \[success, setSuccess\] = useState\(""\)/);
  assert.match(adminEditorParentSource, /onSuccessChange=\{setSuccess\}/);
  assert.match(adminEditorParentSource, /success=\{success\}/);
  assert.match(adminRouteSource, /AdminMemberProfileEditor/);
});

test("public profile routes inherit crawler privacy controls", () => {
  assert.match(middlewareSource, /pathname\.startsWith\("\/profile\/"\)/);
  assert.match(middlewareSource, /noindex, nofollow, noimageindex, noarchive/);
});
