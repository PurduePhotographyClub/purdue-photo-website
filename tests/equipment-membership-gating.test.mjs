import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const {
  canRequestEquipmentItem,
  getEquipmentRequestAccess,
} = await import("../src/lib/equipment-membership-access.ts");

const dashboardSource = await readFile(
  new URL("../src/components/dashboard/EquipmentDashboard.tsx", import.meta.url),
  "utf8",
);

test("Basic members can request personal gear while PPC equipment stays Facilities-only", () => {
  const basicAccess = getEquipmentRequestAccess("user", "member");

  assert.deepEqual(basicAccess, {
    canRequestPersonal: true,
    canRequestPpc: false,
    isStaff: false,
  });
  assert.equal(canRequestEquipmentItem(basicAccess, false), true);
  assert.equal(canRequestEquipmentItem(basicAccess, true), false);
});

test("Facilities members and staff retain access to both equipment types", () => {
  for (const access of [
    getEquipmentRequestAccess("user", "facilities"),
    getEquipmentRequestAccess("officer", null),
  ]) {
    assert.equal(canRequestEquipmentItem(access, false), true);
    assert.equal(canRequestEquipmentItem(access, true), true);
  }
});

test("the dashboard uses the shared per-item membership decision", () => {
  assert.match(dashboardSource, /getEquipmentRequestAccess\(userRole, userTier\)/);
  assert.match(
    dashboardSource,
    /canRequestEquipmentItem\(equipmentAccess, isPpcItem\)/,
  );
});

test("the Facilities upsell clearly preserves Basic personal-loan access", () => {
  assert.match(
    dashboardSource,
    /Basic members can borrow and lend Personal Gear\./,
  );
});
