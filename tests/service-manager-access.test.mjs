import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  canAccessAdminPath,
  getDefaultAdminPath,
  normalizeManagerScopes,
} from "../src/lib/service-manager-access.ts";

const [middlewareSource, layoutSource, membersSource, assignmentPanelSource, envSource] =
  await Promise.all([
    readFile(new URL("../src/middleware.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/layouts/DashboardLayout.astro", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/admin/AdminMembers.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/dashboard/admin/ServiceManagerAssignments.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/env.d.ts", import.meta.url), "utf8"),
  ]);

test("normalizes only supported service-manager scopes", () => {
  assert.deepEqual(
    normalizeManagerScopes(["darkroom", "invalid", "studio", "darkroom", 3]),
    ["darkroom", "studio"],
  );
  assert.deepEqual(normalizeManagerScopes(null), []);
});

test("scoped managers can only open their matching admin section", () => {
  assert.equal(canAccessAdminPath("user", ["studio"], "/dashboard/admin/studio"), true);
  assert.equal(canAccessAdminPath("user", ["studio"], "/dashboard/admin/studio/requests"), true);
  assert.equal(canAccessAdminPath("user", ["studio"], "/dashboard/admin/studio-tools"), false);
  assert.equal(canAccessAdminPath("user", ["studio"], "/dashboard/admin/darkroom"), false);
  assert.equal(canAccessAdminPath("user", ["studio"], "/dashboard/admin/members"), false);
  assert.equal(canAccessAdminPath("user", [], "/dashboard/admin"), false);
});

test("global staff retain every admin route and scoped redirects stay useful", () => {
  assert.equal(canAccessAdminPath("admin", [], "/dashboard/admin/members"), true);
  assert.equal(canAccessAdminPath("officer", [], "/dashboard/admin/newsletter"), true);
  assert.equal(getDefaultAdminPath("admin", []), "/dashboard/admin/members");
  assert.equal(getDefaultAdminPath("user", ["equipment"]), "/dashboard/admin/equipment");
  assert.equal(
    getDefaultAdminPath("user", ["darkroom", "studio"]),
    "/dashboard/admin/studio",
  );
  assert.equal(getDefaultAdminPath("user", []), null);
});

test("dashboard session, middleware, and layout share scoped-manager access", () => {
  assert.match(middlewareSource, /\/api\/dashboard\/session/);
  assert.match(middlewareSource, /\/api\/auth\/get-session/);
  assert.match(middlewareSource, /context\.locals\.managerScopes/);
  assert.match(middlewareSource, /canAccessAdminPath/);
  assert.match(layoutSource, /managerScopes/);
  assert.match(layoutSource, /managerLabels/);
  assert.match(layoutSource, /serviceAdminItems/);
  assert.match(envSource, /managerScopes:.*ServiceManagerScope\[\]/s);
});

test("members admin exposes linked-member assignment controls with service caps", () => {
  assert.match(membersSource, /ServiceManagerAssignments/);
  assert.match(assignmentPanelSource, /\/api\/admin\/service-managers/);
  assert.match(assignmentPanelSource, /member\.discordId/);
  assert.match(assignmentPanelSource, /member\.suspendedUntil/);
  assert.match(assignmentPanelSource, /studio: 1/);
  assert.match(assignmentPanelSource, /darkroom: 2/);
  assert.match(assignmentPanelSource, /equipment: 1/);
  assert.match(assignmentPanelSource, /JSON\.stringify\(\{ scope, userIds \}\)/);
  assert.match(assignmentPanelSource, /reconciliation\?\.warning/);
  assert.match(assignmentPanelSource, /\{reconciliationWarning\}/);
});
