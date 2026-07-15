import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_AVATAR_SHAPES,
  PROFILE_DECORATIONS,
  PROFILE_NAME_STYLES,
  PROFILE_PALETTES,
  PROFILE_SOCIAL_PLATFORMS,
  PROFILE_SOCIAL_STYLES,
  PROFILE_SPECIALTIES,
  PROFILE_TEMPLATES,
  createEmptyProfileDraft,
  getProfileSocialValidationError,
  getProfileSocialHref,
  getPublicProfileHref,
  normalizeProfileSocialValue,
  normalizeProfileResponse,
  refreshProfileAfterMutation,
  resolveProfileAvatarShape,
  toProfileUpdate,
} from "../src/lib/profile-model.ts";

test("profile editor choices match the expanded fixed server contract", () => {
  assert.deepEqual(PROFILE_TEMPLATES, [
    "contact-sheet",
    "print-index",
    "split-frame",
    "negative-strip",
    "editorial-grid",
    "darkroom-card",
    "diptych",
  ]);
  assert.deepEqual(PROFILE_DECORATIONS, [
    "none",
    "film-frame",
    "contact-marks",
    "viewfinder",
    "sprocket",
    "archival-stamp",
    "grid-lines",
  ]);
  assert.deepEqual(PROFILE_NAME_STYLES, [
    "classic",
    "film-credit",
    "editorial",
    "bold-print",
    "condensed",
    "typewriter",
    "small-caps",
  ]);
  assert.deepEqual(PROFILE_PALETTES, [
    "monochrome",
    "amber",
    "cyanotype",
    "forest",
    "burgundy",
    "violet",
  ]);
  assert.deepEqual(PROFILE_AVATAR_SHAPES, ["auto", "circle", "rounded", "square"]);
  assert.deepEqual(PROFILE_SOCIAL_STYLES, ["tiles", "labels"]);
  assert.deepEqual(PROFILE_SOCIAL_PLATFORMS, ["instagram", "discord", "vsco", "website", "email"]);
  assert.deepEqual(PROFILE_SPECIALTIES, [
    "Street",
    "Nature",
    "Landscape",
    "Portrait",
    "Wildlife",
    "Astro",
    "Macro",
    "Automotive",
    "Sports",
    "Events",
    "Travel",
    "Videography",
  ]);
  assert.equal(PROFILE_SPECIALTIES.some((role) => /\p{Extended_Pictographic}/u.test(role)), false);
});

test("new profile drafts are disabled without mutating response data", () => {
  assert.deepEqual(createEmptyProfileDraft("Member Name"), {
    anonymous: false,
    anonymousId: null,
    avatarId: null,
    avatarPositionX: 50,
    avatarPositionY: 50,
    avatarShape: "auto",
    avatarUrl: null,
    avatarZoom: 100,
    bio: "",
    decoration: "none",
    displayName: "Member Name",
    enabled: false,
    nameStyle: "classic",
    palette: "monochrome",
    socialStyle: "tiles",
    socials: [],
    specialties: [],
    template: "contact-sheet",
    username: "",
  });

  const source = {
    permissions: { canDisable: true, canEdit: true, canEnable: true },
    profile: {
      ...createEmptyProfileDraft("Jane"),
      socials: [{ platform: "email", value: "jane@example.com" }],
      specialties: ["Travel"],
    },
  };
  const normalized = normalizeProfileResponse(source, "Fallback");
  normalized.profile.socials.push({ platform: "website", value: "https://example.com" });
  normalized.profile.specialties.push("Street");
  assert.deepEqual(source.profile.socials, [{ platform: "email", value: "jane@example.com" }]);
  assert.deepEqual(source.profile.specialties, ["Travel"]);
});

test("profile palettes are normalized and included in updates", () => {
  const fallback = normalizeProfileResponse({
    profile: { displayName: "Jane", palette: "unsafe-css" },
  }, "Fallback").profile;
  assert.equal(fallback.palette, "monochrome");

  const profile = { ...createEmptyProfileDraft("Jane"), palette: "cyanotype" };
  assert.equal(toProfileUpdate(profile).palette, "cyanotype");
});

test("profile presentation controls default safely and serialize as bounded values", () => {
  const normalized = normalizeProfileResponse({
    profile: {
      avatarPositionX: 74,
      avatarPositionY: 19,
      avatarShape: "rounded",
      avatarZoom: 180,
      displayName: "Jane",
      socialStyle: "labels",
    },
  }, "Fallback").profile;
  assert.deepEqual({
    avatarPositionX: normalized.avatarPositionX,
    avatarPositionY: normalized.avatarPositionY,
    avatarShape: normalized.avatarShape,
    avatarZoom: normalized.avatarZoom,
    socialStyle: normalized.socialStyle,
  }, {
    avatarPositionX: 74,
    avatarPositionY: 19,
    avatarShape: "rounded",
    avatarZoom: 180,
    socialStyle: "labels",
  });
  assert.deepEqual(toProfileUpdate(normalized), {
    anonymous: false,
    avatarPositionX: 74,
    avatarPositionY: 19,
    avatarShape: "rounded",
    avatarZoom: 180,
    bio: null,
    decoration: "none",
    displayName: "Jane",
    enabled: false,
    nameStyle: "classic",
    palette: "monochrome",
    socialStyle: "labels",
    socials: [],
    specialties: [],
    template: "contact-sheet",
    username: null,
  });

  const fallback = normalizeProfileResponse({
    profile: {
      avatarPositionX: -1,
      avatarPositionY: 101,
      avatarShape: "hexagon",
      avatarZoom: 99,
      displayName: "Jane",
      socialStyle: "invisible",
    },
  }, "Fallback").profile;
  assert.deepEqual({
    avatarPositionX: fallback.avatarPositionX,
    avatarPositionY: fallback.avatarPositionY,
    avatarShape: fallback.avatarShape,
    avatarZoom: fallback.avatarZoom,
    socialStyle: fallback.socialStyle,
  }, {
    avatarPositionX: 50,
    avatarPositionY: 50,
    avatarShape: "auto",
    avatarZoom: 100,
    socialStyle: "tiles",
  });
});

test("automatic portrait shapes match each layout while explicit choices stay fixed", () => {
  const profile = createEmptyProfileDraft("Jane");
  const squareLayouts = new Set([
    "split-frame",
    "negative-strip",
    "editorial-grid",
    "diptych",
  ]);

  for (const template of PROFILE_TEMPLATES) {
    assert.equal(
      resolveProfileAvatarShape({ ...profile, template }),
      squareLayouts.has(template) ? "square" : "circle",
      template,
    );
  }
  assert.equal(resolveProfileAvatarShape({ ...profile, avatarShape: "rounded" }), "rounded");
});

test("public profile links switch to the opaque id only while anonymous mode is active", () => {
  const profile = {
    ...createEmptyProfileDraft("Jane Doe"),
    anonymousId: "p_11111111111111111111111111111111",
    enabled: true,
    username: "jane-doe",
  };

  assert.equal(getPublicProfileHref(profile), "/profile/jane-doe");
  assert.equal(
    getPublicProfileHref({ ...profile, anonymous: true }),
    "/profile/p_11111111111111111111111111111111",
  );
  assert.equal(getPublicProfileHref({ ...profile, anonymous: true, anonymousId: null }), null);
  assert.equal(getPublicProfileHref({ ...profile, enabled: false }), null);
});

test("malformed stored choices fall back to safe profile values", () => {
  const normalized = normalizeProfileResponse({
    permissions: { canDisable: "yes", canEdit: null, canEnable: 1 },
    profile: {
      anonymous: false,
      avatarPositionX: Number.NaN,
      avatarPositionY: "50",
      avatarShape: "script-injection",
      avatarZoom: 500,
      displayName: "Jane",
      enabled: true,
      decoration: "script-injection",
      nameStyle: "script-injection",
      palette: "script-injection",
      socials: [{ platform: "unknown", value: "javascript:alert(1)" }],
      socialStyle: "script-injection",
      specialties: ["Admin", "Street"],
      template: "unknown-template",
      username: "jane",
    },
  }, "Fallback");

  assert.equal(normalized.profile.decoration, "none");
  assert.equal(normalized.profile.nameStyle, "classic");
  assert.equal(normalized.profile.palette, "monochrome");
  assert.equal(normalized.profile.template, "contact-sheet");
  assert.equal(normalized.profile.avatarPositionX, 50);
  assert.equal(normalized.profile.avatarPositionY, 50);
  assert.equal(normalized.profile.avatarShape, "auto");
  assert.equal(normalized.profile.avatarZoom, 100);
  assert.equal(normalized.profile.socialStyle, "tiles");
  assert.deepEqual(normalized.profile.socials, []);
  assert.deepEqual(normalized.profile.specialties, ["Street"]);
  assert.deepEqual(normalized.permissions, {
    canDisable: false,
    canEdit: false,
    canEnable: false,
  });
});

test("profile email socials accept only an address and cannot inject mailto parameters", () => {
  assert.equal(normalizeProfileSocialValue("email", " MEMBER@example.com "), "member@example.com");
  for (const value of [
    "member@example.com?subject=hello",
    "member@example.com#fragment",
    "member@example.com/path",
    "member@example.com\\path",
    "member%tag@example.com",
    "member&tag@example.com",
    "member=tag@example.com",
    "mailto:member@example.com",
  ]) {
    assert.equal(normalizeProfileSocialValue("email", value), null, value);
    assert.equal(getProfileSocialHref({ platform: "email", value }), null, value);
  }
});

test("client social host validation matches server-approved service subdomains", () => {
  assert.equal(
    normalizeProfileSocialValue("instagram", "https://m.instagram.com/member/"),
    "https://m.instagram.com/member/",
  );
  assert.equal(
    normalizeProfileSocialValue("discord", "https://canary.discord.com/channels/1/2"),
    "https://canary.discord.com/channels/1/2",
  );
  assert.equal(
    normalizeProfileSocialValue("vsco", "https://portfolio.vsco.co/member"),
    "https://portfolio.vsco.co/member",
  );
  assert.equal(
    normalizeProfileSocialValue("instagram", "https://instagram.com.evil.example/member"),
    null,
  );
});

test("social editor validation explains invalid values before profile submission", () => {
  assert.equal(getProfileSocialValidationError("instagram", ""), null);
  assert.equal(
    getProfileSocialValidationError("instagram", "https://example.com/member"),
    "Use an Instagram link that starts with https://.",
  );
  assert.equal(
    getProfileSocialValidationError("website", "example.com"),
    "Use a complete link that starts with https://.",
  );
  assert.equal(
    getProfileSocialValidationError("email", "mailto:member@example.com"),
    "Enter the email address only.",
  );
  assert.equal(getProfileSocialValidationError("vsco", "https://vsco.co/member"), null);
});

test("a committed profile mutation remains successful when follow-up refresh fails", async () => {
  const messages = [];
  await refreshProfileAfterMutation(
    async () => {
      throw new Error("offline");
    },
    (message) => messages.push(message),
    "Profile saved.",
  );
  assert.deepEqual(messages, [
    "Profile saved.",
    "Profile saved. Refresh failed; reload the page to see the latest version.",
  ]);
});
