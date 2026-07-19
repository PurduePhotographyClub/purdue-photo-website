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
    access: { canDisable: true, canEnable: false, disabled: true },
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
  assert.match(html, /Anyone can visit your page and browse the photos you have shared/);
  assert.match(html, /Anonymous profile/);
  assert.match(html, /Contact sheet/);
  assert.match(html, /Print index/);
  assert.match(html, /Split frame/);
  assert.match(html, /Negative strip/);
  assert.match(html, /Editorial grid/);
  assert.match(html, /Darkroom card/);
  assert.match(html, /Diptych/);
  assert.match(html, /Color palette/);
  assert.match(html, /Color application/);
  assert.match(html, /Accent only/);
  assert.match(html, /Background \+ accent/);
  assert.match(html, /Show profile picture/);
  assert.match(html, /Cyanotype/);
  assert.match(html, /Add social/);
  assert.match(html, /Up to 512px and 200KB\./);
  assert.match(html, /aria-pressed="false"/);
});

test("an unpublished inactive member cannot enable or edit profile fields", () => {
  const html = renderToStaticMarkup(createElement(ProfileFormFields, {
    access: { canDisable: false, canEnable: false, disabled: true },
    onChange() {},
    profile: createEmptyProfileDraft("Jane Doe"),
  }));

  const publishingSwitch = html.match(/<input[^>]+role="switch"[^>]*>/)?.[0] ?? "";
  assert.match(publishingSwitch, /disabled=""/);
  assert.match(html, /<fieldset disabled="" class="contents">/);
  assert.match(html, /Only you can see this draft/);
});

test("public profile rendering shows the selected template content and safe social link", () => {
  const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
    profile: {
      anonymous: false,
      avatarPositionX: 72,
      avatarPositionY: 24,
      avatarShape: "rounded",
      avatarUrl: "/api/profiles/avatar/public-avatar?v=1",
      avatarZoom: 180,
      bio: "Street and travel photographer.",
      decoration: "film-frame",
      displayName: "Jane Example",
      nameStyle: "editorial",
      palette: "cyanotype",
      paletteMode: "accent-only",
      showAvatar: true,
      socialStyle: "labels",
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

  assert.match(html, /Jane Example/);
  assert.match(html, /Street and travel photographer\./);
  assert.match(html, /Photography types/);
  assert.match(html, /data-profile-meta-group="photography"/);
  assert.match(html, /data-profile-meta-group="socials"/);
  const photographyGroupClass = html.match(/<div class="([^"]*)" data-profile-meta-group="photography"/)?.[1] ?? "";
  assert.doesNotMatch(photographyGroupClass, /basis-64/);
  assert.match(html, />Street</);
  assert.match(html, />Travel</);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/jane\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Cyanotype profile palette/);
  assert.match(html, /data-profile-avatar="true"/);
  assert.match(html, /object-position:72% 24%/);
  assert.match(html, /scale\(1\.8\)/);
  assert.match(html, /data-profile-social-style="labels"/);
  assert.match(html, /data-profile-role-tag="true"/);
});

test("anonymous public rendering is image-only and never emits supplied identity", () => {
  const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
    profile: {
      anonymous: true,
      avatarPositionX: 10,
      avatarPositionY: 90,
      avatarShape: "square",
      avatarUrl: "/api/profiles/avatar/private-avatar?v=secret",
      avatarZoom: 225,
      bio: "Private biography",
      decoration: "viewfinder",
      displayName: "Private Display Name",
      nameStyle: "bold-print",
      palette: "amber",
      paletteMode: "background-accent",
      showAvatar: true,
      socialStyle: "labels",
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

  assert.match(html, /PPC Member/);
  assert.match(html, /Viewfinder/);
  assert.doesNotMatch(
    html,
    /Private Display Name|Private biography|private@example\.com|private-avatar|private-member|>Street</,
  );
  assert.doesNotMatch(html, /<img|Profile social links|Photography types/);
  assert.doesNotMatch(html, /data-profile-avatar|<svg/);
});

test("profiles without a picture reflow identity content without an empty portrait slot", () => {
  for (const template of ["contact-sheet", "split-frame", "editorial-grid", "diptych"]) {
    const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
      profile: {
        ...createEmptyProfileDraft("Jane Example"),
        bio: "Street photographer.",
        enabled: true,
        showAvatar: false,
        template,
        username: "jane-example",
      },
    }));

    assert.doesNotMatch(html, /data-profile-avatar="true"/, template);
    assert.match(html, /data-profile-picture-visibility="hidden"/, template);
    assert.match(html, /Jane Example/, template);
  }
});
