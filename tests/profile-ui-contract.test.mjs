import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  settingsSource,
  profileSettingsSource,
  profileFieldsSource,
  profileAvatarSource,
  profileSocialsSource,
  profileSocialIconSource,
  profileAppearanceSource,
  publicProfileSource,
  profileRendererSource,
  profileStatisticsSource,
  profileGallerySource,
  profileRouteSource,
  adminMembersSource,
  adminEditorSource,
  adminProfileDialogSource,
  adminRouteSource,
  gallerySource,
  homeSource,
  middlewareSource,
  headerSource,
  profileLinkCacheSource,
  dashboardLayoutSource,
] = await Promise.all([
  readFile(new URL("../src/components/dashboard/SettingsPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/profile/ProfileSettingsPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileFormFields.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileAvatarControls.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileSocialLinksEditor.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileSocialIcon.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileAppearancePicker.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/PublicProfile.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileTemplateRenderer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/profile-statistics.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/profile/ProfileGallery.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/profile/[username].astro", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/AdminMembers.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/AdminMemberProfileEditor.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/dashboard/admin/AdminMemberProfileDialog.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/dashboard/admin/members/[id]/profile.astro", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Gallery.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Home.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/middleware.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Header.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/profile-link-cache.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/layouts/DashboardLayout.astro", import.meta.url), "utf8"),
]);

test("settings includes an accessible first-class Profile tab and membership lock", () => {
  assert.match(settingsSource, /id:\s*"profile"/);
  assert.match(settingsSource, /ProfileSettingsPanel/);
  assert.match(settingsSource, /role="tablist"/);
  assert.match(settingsSource, /role="tab"/);
  assert.match(settingsSource, /aria-selected/);
  assert.match(settingsSource, /ArrowRight/);
  assert.match(settingsSource, /ArrowLeft/);
  assert.match(profileFieldsSource, /Enable public profile/);
  assert.match(profileFieldsSource, /Anonymous profile/);
  assert.doesNotMatch(profileSettingsSource, /Anonymous profile swaps your name for PPC Member\./);
  assert.doesNotMatch(profileSettingsSource, /social options.*roles.*layouts/);
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
    "Photography types",
    "Profile style",
  ]) {
    assert.match(
      `${profileSettingsSource}\n${profileFieldsSource}\n${profileSocialsSource}\n${profileAppearanceSource}`,
      new RegExp(label, "i"),
    );
  }
  assert.doesNotMatch(profileSettingsSource, /\.push\(/);
  assert.doesNotMatch(profileSettingsSource, /dangerouslySetInnerHTML/);
  assert.match(profileFieldsSource, /cursor-not-allowed/);
  assert.match(profileFieldsSource, /ProfileSocialLinksEditor/);
  assert.match(profileFieldsSource, /ProfileAppearancePicker/);
  assert.match(profileFieldsSource, /ProfileAvatarControls/);
  assert.match(profileAvatarSource, /Up to 512px and 200KB\./);
  assert.match(profileAvatarSource, /Profile picture/);
  assert.match(profileAvatarSource, /Show profile picture/);
  assert.match(profileAvatarSource, /profile\.showAvatar/);
  assert.match(profileFieldsSource, /PROFILE_BIO_MAX_LENGTH/);
  assert.match(profileFieldsSource, /maxLength=\{PROFILE_BIO_MAX_LENGTH\}/);
  assert.match(profileFieldsSource, /character limit/);
  assert.match(profileSettingsSource, /getProfileBioValidationError\(profile\.bio\)/);
  assert.match(adminEditorSource, /getProfileBioValidationError\(profile\.bio\)/);
  assert.match(profileAvatarSource, /Zoom/);
  assert.match(profileAvatarSource, /Move left \/ right/);
  assert.match(profileAvatarSource, /Move up \/ down/);
  assert.match(profileFieldsSource, /type="button"/);
  assert.match(profileFieldsSource, /aria-pressed/);
  assert.doesNotMatch(profileFieldsSource, /<input type="checkbox" checked=\{profile\.specialties/);
  assert.match(profileSocialsSource, /ModalDialog/);
  assert.match(profileSocialsSource, /Add social/);
  assert.match(profileSocialsSource, /Remove/);
  assert.match(profileAppearanceSource, /PROFILE_DECORATIONS/);
  assert.match(profileAppearanceSource, /negative-strip/);
  assert.match(profileAppearanceSource, /split-frame/);
  assert.match(profileAppearanceSource, /editorial-grid/);
  assert.match(profileAppearanceSource, /darkroom-card/);
  assert.match(profileAppearanceSource, /diptych/);
  assert.match(profileAppearanceSource, /PROFILE_PALETTES/);
  assert.match(profileAppearanceSource, /Color/);
  assert.match(profileSettingsSource, /Add your photo, bio, and links\./);
  assert.doesNotMatch(profileSettingsSource, /links you actually use|Publish whenever you are ready/);
  assert.match(profileAppearanceSource, /PROFILE_PALETTE_MODES/);
  assert.match(profileAppearanceSource, /Color use/);
  assert.match(profileAppearanceSource, /Accent only/);
  assert.match(profileAppearanceSource, /Background \+ accent/);
  assert.match(profileAppearanceSource, /Portrait shape/);
  assert.match(profileAppearanceSource, /Social link style/);
  assert.match(profileAppearanceSource, /Profile style/);
  assert.match(profileAppearanceSource, /header/);
  assert.match(profileAppearanceSource, /resolveProfileDecoration/);
  assert.match(profileRendererSource, /data-profile-safe-area/);
  assert.match(profileRendererSource, /data-profile-header-surface/);
  assert.match(profileRendererSource, /data-profile-gallery-surface/);
  assert.match(profileRendererSource, /data-profile-identity-group/);
  assert.match(profileRendererSource, /data-profile-meta-group/);
  assert.match(profileRendererSource, /data-profile-social-style/);
  assert.match(profileRendererSource, /data-profile-role-tag/);
  assert.match(profileRendererSource, /size=\{20\}/);
  assert.match(profileSocialsSource, /size-14/);
  assert.match(profileSocialsSource, /size=\{28\}/);
  assert.match(profileSocialIconSource, /size = 18/);
});

test("public profiles leave breathing room below the site navigation", () => {
  const spacingMatches = publicProfileSource.match(/pt-6 sm:pt-8/g) ?? [];
  assert.equal(spacingMatches.length, 2);
});

test("public profiles render seven responsive templates from one aggregate paginated API", () => {
  assert.match(profileRouteSource, /PublicProfile/);
  assert.match(profileRouteSource, /robots="noindex, nofollow, noimageindex, noarchive"/);
  assert.match(profileRendererSource, /ContactSheetHeader/);
  assert.match(profileRendererSource, /PrintIndexHeader/);
  assert.match(profileRendererSource, /SplitFrameHeader/);
  assert.match(profileRendererSource, /NegativeStripHeader/);
  assert.match(profileRendererSource, /EditorialGridHeader/);
  assert.match(profileRendererSource, /DarkroomCardHeader/);
  assert.match(profileRendererSource, /DiptychHeader/);
  assert.match(profileRendererSource, /profile\.anonymous/);
  assert.match(profileRendererSource, /data-profile-avatar/);
  assert.match(profileRendererSource, /data-profile-avatar-fallback/);
  assert.match(profileRendererSource, /data-profile-statistics/);
  assert.match(profileRendererSource, /data-profile-actions/);
  assert.doesNotMatch(profileRendererSource, /data-profile-membership/);
  assert.doesNotMatch(profileRendererSource, /href="#profile-gallery"/);
  assert.doesNotMatch(profileRendererSource, /View gallery/);
  assert.match(profileRendererSource, /PROFILE_PALETTE_CLASSES/);
  assert.match(publicProfileSource, /\/api\/profiles\//);
  assert.match(publicProfileSource, /per_page=15/);
  assert.match(profileStatisticsSource, /competitionTopThreePlacements/);
  assert.match(profileStatisticsSource, /clubTenureMonths/);
  assert.match(publicProfileSource, /statistics=\{payload\.statistics\}/);
  assert.doesNotMatch(publicProfileSource, /unfilteredPhotoCount/);
  assert.match(publicProfileSource, /PPC Member profile/);
  assert.match(publicProfileSource, /<ProfileTemplateRenderer[\s\S]*<ProfileGallery[\s\S]*<\/ProfileTemplateRenderer>/);
  assert.match(publicProfileSource, /createdAt:\s*readNullableText\(value\.createdAt\)/);
  assert.match(profileGallerySource, /aria-label="Profile gallery pagination"/);
  assert.match(profileGallerySource, /aria-live="polite"/);
  assert.match(profileGallerySource, /scrollIntoView/);
  assert.match(profileGallerySource, /min-h-11/);
  assert.match(profileGallerySource, /sm:columns-2/);
  assert.match(profileGallerySource, /lg:columns-3/);
  assert.match(profileGallerySource, /Selected photographs/);
  assert.match(profileGallerySource, /id="profile-gallery"/);
  assert.match(profileGallerySource, /data-profile-gallery-layout/);
  assert.match(profileGallerySource, /var\(--profile-surface\)/);
  assert.match(profileGallerySource, /\[border-color:var\(--profile-border\)\]/);
  assert.match(profileGallerySource, /motion-reduce:group-hover:scale-100/);
  assert.match(`${publicProfileSource}\n${profileRendererSource}\n${gallerySource}`, /Member mini-portfolio/i);
  assert.doesNotMatch(`${publicProfileSource}\n${profileRendererSource}\n${gallerySource}`, /Member portfolio/i);
});

test("profile loading skeletons preserve the responsive header and gallery rhythm", () => {
  assert.match(publicProfileSource, /data-profile-loading-header="true"/);
  assert.match(publicProfileSource, /data-profile-loading-avatar="true"/);
  assert.match(publicProfileSource, /justify-self-center[^"\n]*md:justify-self-start/);
  assert.match(publicProfileSource, /data-profile-loading-statistics="true"/);
  assert.match(publicProfileSource, /grid-cols-1[^"\n]*sm:grid-cols-3/);
  assert.match(publicProfileSource, /data-profile-loading-gallery="true"/);
  assert.match(profileGallerySource, /data-profile-gallery-skeleton="true"/);
  assert.match(profileGallerySource, /animate-pulse/);
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
  assert.doesNotMatch(headerSource, /Profile settings/);
  assert.match(headerSource, /Dashboard/);
  assert.match(headerSource, /Sign out/);
  assert.match(headerSource, /getPublicProfileHref/);
  assert.match(headerSource, /authClient\.signOut/);
  assert.doesNotMatch(headerSource, /profileRequestStartedRef/);
  assert.match(headerSource, /new AbortController\(\)/);
  assert.match(headerSource, /signal:\s*controller\.signal/);
  assert.match(headerSource, /readProfileLinkCache/);
  assert.match(headerSource, /updateProfileLinkCache/);
  assert.match(profileLinkCacheSource, /writeProfileLinkCache/);
  assert.match(headerSource, /PROFILE_LINK_CACHE_UPDATED_EVENT/);
  assert.match(profileLinkCacheSource, /sessionStorage|StorageLike/);
  assert.match(profileLinkCacheSource, /PROFILE_LINK_CACHE_TTL_MS/);
});

test("member list opens enabled profiles in a responsive staff editor dialog", () => {
  assert.match(adminMembersSource, /profileEnabled/);
  assert.match(adminMembersSource, /profileUsername/);
  assert.match(adminMembersSource, /Edit profile/);
  assert.match(adminMembersSource, /profileTarget/);
  assert.match(adminMembersSource, /AdminMemberProfileDialog/);
  assert.doesNotMatch(adminMembersSource, /href=\{`\/dashboard\/admin\/members\//);
  assert.match(adminProfileDialogSource, /ModalDialog/);
  assert.match(adminProfileDialogSource, /AdminMemberProfileEditor/);
  assert.match(adminProfileDialogSource, /max-h-dvh/);
  assert.match(adminProfileDialogSource, /sm:max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(adminProfileDialogSource, /overflow-hidden/);
  assert.match(adminProfileDialogSource, /overflow-y-auto/);
  assert.match(
    dashboardLayoutSource,
    /min-h-0[^"\n]*overflow-y-auto[^"\n]*overscroll-y-contain/,
  );
  assert.match(adminProfileDialogSource, /tabIndex=\{-1\}/);
  assert.doesNotMatch(adminProfileDialogSource, /autoFocus/);
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
