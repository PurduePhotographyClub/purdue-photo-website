import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_NAME_STYLES,
  PROFILE_SOCIAL_PLATFORMS,
  PROFILE_SPECIALTIES,
  PROFILE_TEMPLATES,
  createEmptyProfileDraft,
  getProfileSocialHref,
  normalizeProfileSocialValue,
  normalizeProfileResponse,
  refreshProfileAfterMutation,
} from "../src/lib/profile-model.ts";

test("profile editor choices match the fixed server contract", () => {
  assert.deepEqual(PROFILE_TEMPLATES, ["contact-sheet", "print-index"]);
  assert.deepEqual(PROFILE_NAME_STYLES, ["classic", "film-credit", "editorial", "bold-print"]);
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
    avatarId: null,
    avatarUrl: null,
    bio: "",
    displayName: "Member Name",
    enabled: false,
    nameStyle: "classic",
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

test("malformed stored choices fall back to safe profile values", () => {
  const normalized = normalizeProfileResponse({
    permissions: { canDisable: "yes", canEdit: null, canEnable: 1 },
    profile: {
      anonymous: false,
      displayName: "Jane",
      enabled: true,
      nameStyle: "script-injection",
      socials: [{ platform: "unknown", value: "javascript:alert(1)" }],
      specialties: ["Admin", "Street"],
      template: "unknown-template",
      username: "jane",
    },
  }, "Fallback");

  assert.equal(normalized.profile.nameStyle, "classic");
  assert.equal(normalized.profile.template, "contact-sheet");
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
