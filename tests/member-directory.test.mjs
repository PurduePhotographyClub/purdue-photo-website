import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function readSource(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

const [headerSource, membersRouteSource, membersDirectorySource] = await Promise.all([
  readSource("../src/components/Header.tsx"),
  readSource("../src/pages/members.astro"),
  readSource("../src/components/MembersDirectory.tsx"),
]);

const pageMeta = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  perPage: 24,
  total: 0,
  totalPages: 1,
};

test("Members is a main navigation destination with its own page", () => {
  assert.match(headerSource, /\{\s*to:\s*["']\/members["'],\s*label:\s*["']Members["']\s*\}/);
  assert.match(headerSource, /\[[^\]]*["']\/members["'][^\]]*\]\.includes\(link\.to\)/s);
  assert.match(headerSource, /hidden 2xl:inline/);
  assert.match(membersRouteSource, /MembersDirectory/);
  assert.match(membersRouteSource, /client:load/);
  assert.match(membersRouteSource, /title=["']Members/);
});

test("directory normalization defensively removes anonymous, hidden, disabled, and malformed profiles", async () => {
  const { normalizeMemberDirectoryResponse } = await import(
    "../src/lib/member-directory.ts"
  );
  const normalized = normalizeMemberDirectoryResponse({
    profiles: [
      {
        avatarUrl: "/api/profiles/avatar/avatar-1?v=1",
        bio: "Street photographer",
        displayName: "Jane Doe",
        specialties: ["Street"],
        username: "jane-doe",
      },
      {
        anonymous: true,
        displayName: "Anonymous Secret",
        enabled: true,
        showInDirectory: true,
        username: "anonymous-secret",
      },
      {
        anonymous: false,
        displayName: "Hidden Secret",
        enabled: true,
        showInDirectory: false,
        username: "hidden-secret",
      },
      {
        anonymous: false,
        displayName: "Disabled Secret",
        enabled: false,
        showInDirectory: true,
        username: "disabled-secret",
      },
      {
        anonymous: false,
        displayName: "Malformed Secret",
        enabled: true,
        showInDirectory: true,
        username: "../malformed",
      },
    ],
    meta: { ...pageMeta, total: 5 },
  });

  assert.deepEqual(normalized.profiles.map((profile) => profile.username), ["jane-doe"]);
  assert.equal(normalized.profiles[0]?.displayName, "Jane Doe");
  assert.equal(normalized.profiles[0]?.avatarUrl, "/api/profiles/avatar/avatar-1?v=1");
  assert.deepEqual(normalized.profiles[0]?.specialties, ["Street"]);
  assert.doesNotMatch(
    JSON.stringify(normalized.profiles),
    /Anonymous Secret|Hidden Secret|Disabled Secret|Malformed Secret/,
  );
});

test("member directory renders clear loading, error, empty, and profile-card states", async () => {
  const { MembersDirectoryView } = await import(
    "../src/components/MembersDirectory.tsx"
  );
  const baseProps = {
    errorMessage: "",
    loading: false,
    meta: pageMeta,
    onPageChange() {},
    onRetry() {},
    profiles: [],
  };

  const loading = renderToStaticMarkup(createElement(MembersDirectoryView, {
    ...baseProps,
    loading: true,
  }));
  const error = renderToStaticMarkup(createElement(MembersDirectoryView, {
    ...baseProps,
    errorMessage: "Could not load members.",
  }));
  const empty = renderToStaticMarkup(createElement(MembersDirectoryView, baseProps));
  const populated = renderToStaticMarkup(createElement(MembersDirectoryView, {
    ...baseProps,
    meta: { ...pageMeta, total: 1 },
    profiles: [{
      avatarUrl: null,
      bio: "Street photographer",
      displayName: "Jane Doe",
      specialties: ["Street"],
      username: "jane-doe",
    }],
  }));

  assert.match(loading, /Loading members/i);
  assert.match(loading, /aria-busy="true"/);
  assert.match(error, /Could not load members\./);
  assert.match(error, />Try again</);
  assert.match(empty, /No member profiles/i);
  assert.match(populated, /Jane Doe/);
  assert.match(populated, /Street photographer/);
  assert.match(populated, /href="\/profile\/jane-doe"/);
});

test("member directory fetches the public paginated profiles endpoint", () => {
  assert.match(membersDirectorySource, /\/api\/profiles\?page=/);
  assert.match(membersDirectorySource, /per_page=/);
  assert.match(membersDirectorySource, /normalizeMemberDirectoryResponse/);
  assert.doesNotMatch(membersDirectorySource, /dangerouslySetInnerHTML/);
});
