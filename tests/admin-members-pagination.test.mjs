import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ADMIN_MEMBERS_PAGE_SIZE,
  buildAdminMembersUrl,
  normalizeAdminMembersPage,
} from "../src/lib/admin-members.ts";

const [adminMembersContainerSource, adminMembersListSource] = await Promise.all([
  readFile(
    new URL("../src/components/dashboard/admin/AdminMembers.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/components/dashboard/admin/AdminMembersList.tsx", import.meta.url),
    "utf8",
  ),
]);
const adminMembersSource = `${adminMembersContainerSource}\n${adminMembersListSource}`;

test("admin member page responses normalize bounded metadata and legacy fallbacks", () => {
  assert.equal(ADMIN_MEMBERS_PAGE_SIZE, 20);
  assert.deepEqual(
    normalizeAdminMembersPage({
      members: [{ id: "member-2" }],
      meta: {
        hasNextPage: true,
        hasPreviousPage: false,
        page: 1,
        perPage: 20,
        total: 21,
        totalPages: 2,
      },
    }, { page: 1, perPage: 20 }),
    {
      legacy: false,
      members: [{ id: "member-2" }],
      meta: {
        hasNextPage: true,
        hasPreviousPage: false,
        page: 1,
        perPage: 20,
        total: 21,
        totalPages: 2,
      },
    },
  );

  assert.deepEqual(
    normalizeAdminMembersPage([{ id: "member-1" }], { page: 2, perPage: 20 }),
    {
      legacy: true,
      members: [{ id: "member-1" }],
      meta: {
        hasNextPage: false,
        hasPreviousPage: true,
        page: 2,
        perPage: 20,
        total: 21,
        totalPages: 2,
      },
    },
  );
});

test("admin member URLs encode page and non-PII filters without exposing searches", () => {
  assert.equal(
    buildAdminMembersUrl({
      discordLinked: true,
      excludeSuspended: true,
      page: 3,
      perPage: 20,
      role: "officer",
      status: "active",
    }),
    "/api/admin/members?format=page&page=3&per_page=20&role=officer&status=active&discord_linked=true&exclude_suspended=true",
  );
});

test("admin member list requests one server-filtered page and exposes accessible controls", () => {
  assert.match(adminMembersSource, /buildAdminMembersUrl\(/);
  assert.match(adminMembersContainerSource, /method: "POST"/);
  assert.match(adminMembersContainerSource, /JSON\.stringify\(\{ search \}\)/);
  assert.match(adminMembersSource, /ADMIN_MEMBERS_PAGE_SIZE/);
  assert.match(adminMembersSource, /aria-label="Member list pagination"/);
  assert.match(adminMembersSource, />\s*Previous\s*</);
  assert.match(adminMembersSource, />\s*Next\s*</);
  assert.match(adminMembersSource, /aria-current=\{[^}]*"page"/);
  assert.match(adminMembersSource, /Page \{meta\.page\} of \{meta\.totalPages\}/);
  assert.match(adminMembersSource, /setPage\(1\)/);
  assert.doesNotMatch(
    adminMembersSource,
    /useSWR<Member\[]>\("\/api\/admin\/members"/,
  );
  assert.doesNotMatch(adminMembersSource, /members\.filter\(/);
});

test("admin member mutations revalidate page totals instead of mutating a full collection", () => {
  assert.match(adminMembersContainerSource, /await mutateMembers\(\)/);
  assert.match(adminMembersContainerSource, /refreshedPage\.meta\.page !== page/);
  assert.doesNotMatch(adminMembersContainerSource, /members\.map\(/);
  assert.doesNotMatch(adminMembersContainerSource, /members\.filter\(/);
});
