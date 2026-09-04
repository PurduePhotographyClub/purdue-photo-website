import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: EquipmentDetailsModal } = await import(
  "../src/components/dashboard/EquipmentDetailsModal.tsx"
);

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
  const description = `Description start ${"camera kit contents ".repeat(70)}description end`;
  const lenderTerms = `**Terms start**\n\n${"Keep every piece protected. ".repeat(55)}Terms end`;
  const html = renderToStaticMarkup(
    createElement(EquipmentDetailsModal, {
      isOwner: false,
      item: {
        assetTag: null,
        category: "camera",
        condition: "good",
        description,
        isAvailable: true,
        lenderTerms,
        model: "F-1",
        name: "Long-copy camera kit",
        ownerId: "member-1",
        ownerName: "Club Member",
      },
      onClose: () => {},
    }),
  );

  assert.match(html, /aria-label="Equipment details for Long-copy camera kit"/);
  assert.ok(html.includes(description));
  assert.match(html, /<strong[^>]*>Terms start<\/strong>/);
  assert.match(html, /Terms end/);
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
  assert.match(detailsModalSource, /aria-label="Close equipment details backdrop"[\s\S]*onClick=\{onClose\}/);
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
  assert.match(borrowModalSource, /aria-label="Close borrow request dialog"[\s\S]*onClick=/);
  assert.match(borrowModalSource, /\$\{btnOutline\} min-h-11/);
  assert.match(borrowModalSource, /\$\{btnPrimary\} min-h-11/);
});
