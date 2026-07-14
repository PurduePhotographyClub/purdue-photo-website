import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: ProfileFormFields } = await import(
  "../src/components/profile/ProfileFormFields.tsx"
);
const { default: ProfileTemplateRenderer } = await import(
  "../src/components/profile/ProfileTemplateRenderer.tsx"
);
const { createEmptyProfileDraft } = await import("../src/lib/profile-model.ts");

test("inactive members render locked profile fields while retaining the disable control", () => {
  const profile = {
    ...createEmptyProfileDraft("Jane Doe"),
    bio: "Film photographer",
    enabled: true,
    username: "jane-doe",
  };
  const html = renderToStaticMarkup(createElement(ProfileFormFields, {
    canDisable: true,
    canEnable: false,
    disabled: true,
    onChange() {
      throw new Error("server render must not mutate the profile");
    },
    profile,
  }));

  assert.match(html, /<fieldset disabled="" class="contents">/);
  const publishingSwitch = html.match(/<input[^>]+role="switch"[^>]*>/)?.[0] ?? "";
  assert.match(publishingSwitch, /checked=""/);
  assert.doesNotMatch(publishingSwitch, /disabled=""/);
  assert.match(html, /Enable public profile/);
  assert.match(html, /Profiles start disabled/);
  assert.match(html, /Anonymous profile/);
  assert.match(html, /Contact sheet/);
  assert.match(html, /Print index/);
});

test("an unpublished inactive member cannot enable or edit profile fields", () => {
  const html = renderToStaticMarkup(createElement(ProfileFormFields, {
    canDisable: false,
    canEnable: false,
    disabled: true,
    onChange() {},
    profile: createEmptyProfileDraft("Jane Doe"),
  }));

  const publishingSwitch = html.match(/<input[^>]+role="switch"[^>]*>/)?.[0] ?? "";
  assert.match(publishingSwitch, /disabled=""/);
  assert.match(html, /<fieldset disabled="" class="contents">/);
});

test("public profile rendering shows the selected template content and safe social link", () => {
  const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
    profile: {
      anonymous: false,
      avatarUrl: "/api/profiles/avatar/public-avatar?v=1",
      bio: "Street and travel photographer.",
      displayName: "Jane Portfolio",
      nameStyle: "editorial",
      socials: [{
        icon: "instagram",
        platform: "instagram",
        value: "https://www.instagram.com/jane/",
      }],
      specialties: ["Street", "Travel"],
      template: "print-index",
      username: "jane-doe",
    },
  }));

  assert.match(html, /Jane Portfolio/);
  assert.match(html, /Street and travel photographer\./);
  assert.match(html, /Photography roles/);
  assert.match(html, />Street</);
  assert.match(html, />Travel</);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/jane\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("anonymous public rendering is image-portfolio-only and never emits supplied identity", () => {
  const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
    profile: {
      anonymous: true,
      avatarUrl: "/api/profiles/avatar/private-avatar?v=secret",
      bio: "Private biography",
      displayName: "Private Display Name",
      nameStyle: "bold-print",
      socials: [{
        icon: "mail",
        platform: "email",
        value: "private@example.com",
      }],
      specialties: ["Street"],
      template: "contact-sheet",
      username: "private-member",
    },
  }));

  assert.match(html, /Anonymous photographer/);
  assert.doesNotMatch(
    html,
    /Private Display Name|Private biography|private@example\.com|private-avatar|private-member|>Street</,
  );
  assert.doesNotMatch(html, /<img|Profile social links|Photography roles/);
});
