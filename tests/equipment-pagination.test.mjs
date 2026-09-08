import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const {
  EQUIPMENT_PAGE_SIZE,
  getEquipmentPage,
} = await import("../src/lib/equipment-pagination.ts");
const { default: EquipmentPagination } = await import(
  "../src/components/dashboard/EquipmentPagination.tsx"
);

const dashboardSource = await readFile(
  new URL("../src/components/dashboard/EquipmentDashboard.tsx", import.meta.url),
  "utf8",
);

test("equipment pagination shows fifteen items per page", () => {
  const equipment = Array.from({ length: 31 }, (_, index) => ({ id: index + 1 }));

  assert.equal(EQUIPMENT_PAGE_SIZE, 15);
  assert.deepEqual(getEquipmentPage(equipment, 1).items.map((item) => item.id), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.deepEqual(getEquipmentPage(equipment, 2).items.map((item) => item.id), Array.from({ length: 15 }, (_, index) => index + 16));
  assert.deepEqual(getEquipmentPage(equipment, 3).items.map((item) => item.id), [31]);
});

test("equipment pagination clamps invalid and stale page numbers", () => {
  const equipment = Array.from({ length: 16 }, (_, index) => index + 1);

  assert.deepEqual(getEquipmentPage(equipment, -4), {
    items: equipment.slice(0, 15),
    page: 1,
    totalItems: 16,
    totalPages: 2,
  });
  assert.deepEqual(getEquipmentPage(equipment, 99), {
    items: [16],
    page: 2,
    totalItems: 16,
    totalPages: 2,
  });
  assert.deepEqual(getEquipmentPage([], 3), {
    items: [],
    page: 1,
    totalItems: 0,
    totalPages: 1,
  });
});

test("equipment pagination renders an accessible range and boundary controls", () => {
  const html = renderToStaticMarkup(
    createElement(EquipmentPagination, {
      ariaLabel: "PPC equipment pagination",
      onPageChange: () => {},
      page: 2,
      totalItems: 31,
      totalPages: 3,
    }),
  );

  assert.match(html, /<nav aria-label="PPC equipment pagination"/);
  assert.match(html, />Page 2 of 3</);
  assert.match(html, />16–30 of 31</);
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>Previous/);
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>Next/);

  const finalPageHtml = renderToStaticMarkup(
    createElement(EquipmentPagination, {
      ariaLabel: "PPC equipment pagination",
      onPageChange: () => {},
      page: 3,
      totalItems: 31,
      totalPages: 3,
    }),
  );

  assert.match(finalPageHtml, />31–31 of 31</);
  assert.match(finalPageHtml, /<button[^>]*disabled=""[^>]*>Next/);
});

test("both equipment lists use accessible pagination and reset when filters change", () => {
  assert.match(dashboardSource, /ariaLabel="PPC equipment pagination"/);
  assert.match(dashboardSource, /ariaLabel="Personal equipment pagination"/);
  assert.match(dashboardSource, /setPpcPage\(1\)/);
  assert.match(dashboardSource, /setPersonalPage\(1\)/);
  assert.match(dashboardSource, /ppcPageData\.items\.map/);
  assert.match(dashboardSource, /personalPageData\.items\.map/);
});
