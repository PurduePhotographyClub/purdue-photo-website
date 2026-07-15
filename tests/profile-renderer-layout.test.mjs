import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: ProfileTemplateRenderer } = await import(
  "../src/components/profile/ProfileTemplateRenderer.tsx"
);
const {
  PROFILE_AVATAR_SHAPES,
  PROFILE_DECORATIONS,
  PROFILE_NAME_STYLES,
  PROFILE_PALETTES,
  PROFILE_SOCIAL_STYLES,
  PROFILE_TEMPLATES,
} = await import("../src/lib/profile-model.ts");

function createProfile(overrides = {}) {
  return {
    anonymous: false,
    avatarPositionX: 68,
    avatarPositionY: 31,
    avatarShape: "auto",
    avatarUrl: "/api/profiles/avatar/layout-matrix?v=1",
    avatarZoom: 165,
    bio: "A long-form photographer biography that must remain legible across every approved presentation combination.",
    decoration: "none",
    displayName: "Alexandria Montgomery-Santiago",
    nameStyle: "classic",
    palette: "monochrome",
    socialStyle: "tiles",
    socials: [
      { icon: "instagram", platform: "instagram", value: "https://instagram.com/member/" },
      { icon: "globe", platform: "website", value: "https://member.example/" },
      { icon: "mail", platform: "email", value: "member@example.com" },
    ],
    specialties: ["Street", "Nature", "Portrait", "Events", "Videography"],
    template: "contact-sheet",
    username: "alexandria-member",
    ...overrides,
  };
}

test("every core layout combination preserves identity, copy, tags, socials, and safe decoration space", () => {
  for (const template of PROFILE_TEMPLATES) {
    for (const decoration of PROFILE_DECORATIONS) {
      for (const nameStyle of PROFILE_NAME_STYLES) {
        for (const palette of PROFILE_PALETTES) {
          const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
            profile: createProfile({ decoration, nameStyle, palette, template }),
          }));
          const context = `${template}/${decoration}/${nameStyle}/${palette}`;
          assert.match(html, /Alexandria Montgomery-Santiago/, context);
          assert.match(html, /long-form photographer biography/, context);
          assert.match(html, /Photography roles/, context);
          assert.match(html, /Profile social links/, context);
          assert.match(html, /data-profile-role-tag="true"/, context);
          assert.match(html, /data-profile-safe-area="true"/, context);
          assert.match(html, new RegExp(`data-profile-template="${template}"`), context);
        }
      }
    }
  }
});

test("orthogonal portrait, role-tag, and social styles render across every template", () => {
  const squareLayouts = new Set([
    "split-frame",
    "negative-strip",
    "editorial-grid",
    "diptych",
  ]);
  for (const template of PROFILE_TEMPLATES) {
    for (const avatarShape of PROFILE_AVATAR_SHAPES) {
      const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
        profile: createProfile({ avatarShape, template }),
      }));
      assert.match(html, /data-profile-avatar="true"/);
      const expectedShape = avatarShape === "auto"
        ? squareLayouts.has(template) ? "square" : "circle"
        : avatarShape;
      assert.match(html, new RegExp(`data-profile-avatar-shape="${expectedShape}"`));
    }
    for (const socialStyle of PROFILE_SOCIAL_STYLES) {
      const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
        profile: createProfile({ socialStyle, template }),
      }));
      assert.match(html, new RegExp(`data-profile-social-style="${socialStyle}"`));
    }
  }
});

test("anonymous profiles remove the entire portrait region in every template", () => {
  for (const template of PROFILE_TEMPLATES) {
    const html = renderToStaticMarkup(createElement(ProfileTemplateRenderer, {
      profile: createProfile({ anonymous: true, template }),
    }));
    assert.match(html, /PPC Member/);
    assert.doesNotMatch(html, /data-profile-avatar|layout-matrix|<img|<svg/);
    assert.doesNotMatch(html, /Alexandria|biography|Profile social links|Photography roles/);
  }
});
