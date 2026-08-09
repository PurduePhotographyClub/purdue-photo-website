import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const instagramIconConsumers = await Promise.all(
  [
    "../src/components/Competitions.tsx",
    "../src/components/Footer.tsx",
    "../src/components/Header.tsx",
    "../src/components/Home.tsx",
    "../src/components/profile/ProfileSocialIcon.tsx",
  ].map(async (relativePath) => ({
    relativePath,
    source: await readFile(new URL(relativePath, import.meta.url), "utf8"),
  })),
);

test("Instagram consumers use the local brand icon instead of Lucide's removed export", async () => {
  for (const { relativePath, source } of instagramIconConsumers) {
    assert.doesNotMatch(
      source,
      /import\s*\{[^}]*\bInstagram\b[^}]*\}\s*from\s*["']lucide-react["']/s,
      relativePath,
    );
  }

  const { default: InstagramIcon } = await import(
    "../src/components/icons/InstagramIcon.tsx"
  );
  const html = renderToStaticMarkup(
    createElement(InstagramIcon, { className: "social-icon", size: 18 }),
  );

  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /class="social-icon"/);
  assert.match(html, /width="18"/);
  assert.match(html, /height="18"/);
});
