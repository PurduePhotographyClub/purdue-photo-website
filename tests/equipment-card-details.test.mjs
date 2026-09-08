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

test("equipment cards truncate descriptions and use explicit buttons for complete text", () => {
  assert.match(dashboardSource, /detailsTarget:\s*EquipmentDetailsTarget\s*\|\s*null/);
  assert.match(dashboardSource, /const hasDescription = hasDisplayText\(item\.description\)/);
  assert.match(dashboardSource, /line-clamp-3[^\n]+\{item\.description\}/);
  assert.doesNotMatch(
    dashboardSource,
    /\{item\.description && !\(!item\.isAvailable && item\.activeLoan && \(isAdmin \|\| isItemOwner\)\) && \(/,
  );
  assert.match(
    dashboardSource,
    /aria-label=\{`View full description for \$\{item\.name\}`\}/,
  );
  assert.match(dashboardSource, />\s*View Description\s*</);
  assert.match(dashboardSource, /aria-label=\{`View borrowing terms for \$\{item\.name\}`\}/);
  assert.match(dashboardSource, />\s*View Terms\s*</);
  assert.doesNotMatch(dashboardSource, /BORROWING_TERMS_PREVIEW_CLASS/);
  assert.match(dashboardSource, /<EquipmentDetailsModal/);
});

test("equipment details modal renders the requested full text in a mobile-safe dialog", () => {
  const description = `Description start ${"camera kit contents ".repeat(70)}description end`;
  const lenderTerms = `**Terms start**\n\n${"Keep every piece protected. ".repeat(55)}Terms end`;
  const descriptionHtml = renderToStaticMarkup(
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
      section: "description",
    }),
  );
  const termsHtml = renderToStaticMarkup(
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
      section: "terms",
    }),
  );

  assert.match(descriptionHtml, /aria-label="Description for Long-copy camera kit"/);
  assert.ok(descriptionHtml.includes(description));
  assert.doesNotMatch(descriptionHtml, /Terms start/);
  assert.match(termsHtml, /aria-label="Borrowing terms for Long-copy camera kit"/);
  assert.match(termsHtml, /<strong[^>]*>Terms start<\/strong>/);
  assert.match(termsHtml, /Terms end/);
  assert.doesNotMatch(termsHtml, /Description start/);
  assert.match(detailsModalSource, /<ModalDialog/);
  assert.match(detailsModalSource, /ariaLabel=\{`\$\{sectionLabel\} for \$\{item\.name\}`\}/);
  assert.match(detailsModalSource, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(detailsModalSource, /overflow-y-auto/);
  assert.match(detailsModalSource, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(
    detailsModalSource,
    /whitespace-pre-wrap break-words[^"]*">\s*\{item\.description\}/,
  );
  assert.match(detailsModalSource, /<MarkdownMessage[\s\S]*value=\{item\.lenderTerms \?\? ""\}/);
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
