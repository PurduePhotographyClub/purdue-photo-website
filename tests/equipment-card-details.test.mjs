import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardSource = await readFile(
  new URL("../src/components/dashboard/EquipmentDashboard.tsx", import.meta.url),
  "utf8",
);
const detailsModalSource = await readFile(
  new URL("../src/components/dashboard/EquipmentDetailsModal.tsx", import.meta.url),
  "utf8",
);

test("equipment cards expose an explicit way to read complete item details", () => {
  assert.match(dashboardSource, /detailsTarget:\s*EquipmentItem\s*\|\s*null/);
  assert.match(
    dashboardSource,
    /aria-label=\{`View full details for \$\{item\.name\}`\}/,
  );
  assert.match(dashboardSource, /onClick=\{\(\) => setDetailsTarget\(item\)\}/);
  assert.match(dashboardSource, />\s*View Details\s*</);
  assert.match(dashboardSource, /<EquipmentDetailsModal/);
});

test("equipment details modal renders complete descriptions and member terms in a mobile-safe dialog", () => {
  assert.match(detailsModalSource, /<ModalDialog/);
  assert.match(detailsModalSource, /ariaLabel=\{`Equipment details for \$\{item\.name\}`\}/);
  assert.match(detailsModalSource, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(detailsModalSource, /overflow-y-auto/);
  assert.match(detailsModalSource, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(
    detailsModalSource,
    /whitespace-pre-wrap break-words[^"]*">\s*\{item\.description\}/,
  );
  assert.match(detailsModalSource, /<MarkdownMessage[\s\S]*value=\{item\.lenderTerms\}/);
  assert.doesNotMatch(detailsModalSource, /max-h-(?:12|14)|line-clamp/);
});

test("the borrow request dialog repeats the full description before submission", () => {
  const borrowModalSource = dashboardSource.slice(
    dashboardSource.indexOf("function BorrowEquipmentModal"),
    dashboardSource.indexOf("interface EquipmentDeleteModalProps"),
  );

  assert.match(borrowModalSource, /item\.description/);
  assert.match(borrowModalSource, /whitespace-pre-wrap/);
  assert.match(borrowModalSource, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(borrowModalSource, /overflow-y-auto/);
  assert.match(borrowModalSource, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
});
