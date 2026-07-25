import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildAdminReceiptsUrl,
  normalizeAdminReceiptsPage,
  normalizeAdminReceiptSettings,
} from "../src/lib/admin-receipts.ts";

async function readOptionalSource(url) {
  try {
    return await readFile(url, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function readReceiptNamedSources(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const sources = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(
        `${entry.name}${entry.isDirectory() ? "/" : ""}`,
        directoryUrl,
      );
      if (entry.isDirectory()) {
        return readReceiptNamedSources(url);
      }
      if (!/receipt/i.test(entry.name) || !/\.tsx?$/.test(entry.name)) {
        return "";
      }
      return readFile(url, "utf8");
    }),
  );
  return sources.join("\n");
}

const [layoutSource, routeSource, receiptComponentSource, receiptLibSource] =
  await Promise.all([
    readFile(
      new URL("../src/layouts/DashboardLayout.astro", import.meta.url),
      "utf8",
    ),
    readOptionalSource(
      new URL("../src/pages/dashboard/admin/receipts.astro", import.meta.url),
    ),
    readReceiptNamedSources(
      new URL("../src/components/dashboard/admin/", import.meta.url),
    ),
    readOptionalSource(
      new URL("../src/lib/admin-receipts.ts", import.meta.url),
    ),
  ]);

const receiptSource = `${receiptComponentSource}\n${receiptLibSource}`;

test("receipt request URLs expose only bounded non-PII list controls", () => {
  const url = buildAdminReceiptsUrl({
    delivery: "discord_pending",
    direction: "asc",
    kind: "membership",
    page: 2,
    perPage: 20,
    sort: "purchased_at",
    status: "processing",
    tier: "facilities",
    visibility: "archived",
  });
  const parsedUrl = new URL(url, "https://receipts.test");

  assert.equal(parsedUrl.pathname, "/api/admin/receipts");
  assert.equal(parsedUrl.searchParams.get("page"), "2");
  assert.equal(parsedUrl.searchParams.get("per_page"), "20");
  assert.equal(parsedUrl.searchParams.get("status"), "processing");
  assert.equal(parsedUrl.searchParams.get("kind"), "membership");
  assert.equal(parsedUrl.searchParams.get("tier"), "facilities");
  assert.equal(parsedUrl.searchParams.get("delivery"), "discord_pending");
  assert.equal(parsedUrl.searchParams.get("visibility"), "archived");
  assert.equal(parsedUrl.searchParams.get("sort"), "purchased_at");
  assert.equal(parsedUrl.searchParams.get("direction"), "asc");
  assert.equal(parsedUrl.searchParams.has("search"), false);
});

test("receipt response normalization rejects malformed rows and summary values", () => {
  const page = normalizeAdminReceiptsPage(
    {
      receipts: [
        {
          id: "receipt-1",
          idempotencyKey: "order-1:membership",
          kind: "membership",
          status: "fulfilled",
        },
        { id: 42, kind: "membership", status: "fulfilled" },
        { id: "receipt-3", kind: null, status: "failed" },
      ],
      meta: {
        hasNextPage: false,
        hasPreviousPage: false,
        page: 1,
        perPage: 20,
        total: 1,
        totalPages: 1,
      },
      summary: {
        failed: "not-a-count",
        fulfilled: 1,
        manualReview: 2,
        processing: -1,
      },
    },
    "/api/admin/receipts?page=1&per_page=20",
  );

  assert.equal(page.receipts.length, 1);
  assert.equal(page.receipts[0]?.id, "receipt-1");
  assert.deepEqual(page.summary, { fulfilled: 1, manualReview: 2 });
});

test("receipt settings normalize the API envelope and fixed mailbox fallback", () => {
  assert.deepEqual(
    normalizeAdminReceiptSettings({
      settings: {
        allowedSenderEmail: "sender@example.com",
        facilitiesRoleId: "1519105558127575141",
        memberRoleId: "1519105703736770600",
        receiptToAddress: "purchases@purduephotoclub.org",
        roleReconciliationGeneration: 4,
        roleReconciliationPending: true,
        updatedAt: "2026-07-24T10:00:00.000Z",
      },
    }),
    {
      allowedSenderEmail: "sender@example.com",
      facilitiesRoleId: "1519105558127575141",
      memberRoleId: "1519105703736770600",
      receiptToAddress: "purchases@purduephotoclub.org",
      roleReconciliationGeneration: 4,
      roleReconciliationPending: true,
      updatedAt: "2026-07-24T10:00:00.000Z",
    },
  );
  assert.equal(
    normalizeAdminReceiptSettings({}).receiptToAddress,
    "purchases@purduephotoclub.org",
  );
});

test("global staff receive a receipts dashboard route and navigation entry", () => {
  assert.match(
    layoutSource,
    /\{\s*href:\s*["']\/dashboard\/admin\/receipts["'],\s*label:\s*["']Receipts["']/,
  );
  assert.match(routeSource, /DashboardLayout/);
  assert.match(routeSource, /AdminReceipts/);
  assert.match(routeSource, /Receipts\s+[—-]\s+Admin|Manage Receipts/);
  assert.match(routeSource, /canManage=\{Astro\.locals\.user\?\.role === ['"]admin['"]\}/);
  assert.match(routeSource, /client:load/);
});

test("receipt searches, filters, sorting, and pagination stay server-driven", () => {
  assert.match(receiptSource, /\/api\/admin\/receipts/);
  assert.match(receiptSource, /method:\s*["']POST["']/);
  assert.match(receiptSource, /JSON\.stringify\(\{[^}]*search/s);

  for (const parameter of [
    "page",
    "per_page",
    "status",
    "kind",
    "tier",
    "delivery",
    "visibility",
    "sort",
    "direction",
  ]) {
    assert.match(
      receiptSource,
      new RegExp(`(?:searchParams\\.set\\(|[?&])["'\`]?${parameter}`),
      `receipt requests must send the ${parameter} server-side parameter`,
    );
  }

  assert.match(receiptSource, /ADMIN_RECEIPTS_PAGE_SIZE/);
  assert.match(receiptSource, /setPage\(1\)/);
  assert.doesNotMatch(receiptSource, /receipts\.filter\(/);
  assert.doesNotMatch(receiptSource, /receipts\.sort\(/);
});

test("receipt controls expose searchable, sortable, and filterable state accessibly", () => {
  assert.match(receiptSource, /aria-label=["']Search receipts["']/);
  assert.match(receiptSource, /aria-label=["']Filter by status["']/);
  assert.match(receiptSource, /aria-label=["']Filter by purchase type["']/);
  assert.match(receiptSource, /aria-label=["']Filter by membership tier["']/);
  assert.match(receiptSource, /aria-label=["']Filter by delivery state["']/);
  assert.match(receiptSource, /aria-label=["']Filter archived receipts["']/);
  assert.match(receiptSource, /aria-label=["']Sort receipts["']/);
  assert.match(receiptSource, /aria-label=["']Sort direction["']/);
  assert.match(receiptSource, /value=["']manual_review["']/);
  assert.match(receiptSource, /Global receipt overview/);
  assert.match(receiptSource, /Matching filters/);

  assert.match(receiptSource, /aria-label=["']Receipt pagination["']/);
  assert.match(receiptSource, />\s*Previous\s*</);
  assert.match(receiptSource, />\s*Next\s*</);
  assert.match(receiptSource, /Page \{[^}]*page\} of \{[^}]*totalPages\}/);
  assert.match(receiptSource, /aria-live=["']polite["']/);
});

test("receipt settings support one exact sender and the two managed Discord roles", () => {
  assert.match(receiptSource, /\/api\/admin\/receipt-settings/);
  assert.match(receiptSource, /method:\s*["']PATCH["']/);
  assert.match(receiptSource, /allowedSenderEmail/);
  assert.match(receiptSource, /memberRoleId/);
  assert.match(receiptSource, /facilitiesRoleId/);
  assert.match(receiptSource, /expectedRoleGeneration/);
  assert.match(receiptSource, /rolesChanged/);

  assert.match(receiptSource, /type=["']email["']/);
  assert.match(receiptSource, /One exact (?:envelope )?sender|one exact email address/i);
  assert.match(receiptSource, /Member role ID/i);
  assert.match(receiptSource, /Facilities role ID/i);
  assert.match(receiptSource, /inputMode=["']numeric["']/);
  assert.match(receiptSource, /\\d\{17,20\}/);
  assert.match(receiptSource, /Role sync queued/);
  assert.match(receiptSource, /sync for linked members/i);
  assert.match(receiptSource, /\{canManage\s*&&/);
  assert.match(receiptSource, /disabled=\{[^}]*!canManage/);
});

test("receipt settings remount from every reconciled role generation", () => {
  assert.match(
    receiptSource,
    /key=\{`[^`]*\$\{settings\.roleReconciliationGeneration\}[^`]*\$\{settings\.memberRoleId\}[^`]*\$\{settings\.facilitiesRoleId\}[^`]*`\}/,
  );
});

test("admins can clear the sender allowlist and the dashboard explains fail-closed intake", () => {
  const senderInput = receiptSource.match(
    /<input[\s\S]*?aria-label=["']Exact allowed sender["'][\s\S]*?\/>/,
  )?.[0] ?? "";

  assert.notEqual(senderInput, "");
  assert.doesNotMatch(senderInput, /\brequired\b/);
  assert.match(
    receiptSource,
    /allowedSenderEmail\s*!==\s*null\s*&&\s*!EXACT_EMAIL_PATTERN\.test\(allowedSenderEmail\)/,
  );
  assert.match(
    receiptSource,
    /const allowedSenderEmail = trimmedAllowedSenderEmail[\s\S]*\?\s*trimmedAllowedSenderEmail[\s\S]*:\s*null/,
  );
  assert.match(receiptSource, /:\s*\{\s*allowedSenderEmail\s*\}/);
  assert.match(
    receiptSource,
    /expectedRoleGeneration:\s*settings\.roleReconciliationGeneration/,
  );
  assert.match(receiptSource, /empty|leave (?:this )?blank/i);
  assert.match(receiptSource, /disable receipt intake|intake disabled/i);
  assert.match(receiptSource, /wildcard|list/i);
  assert.match(receiptSource, /no email can be processed|fail(?:s)? closed|reject/i);
});

test("receipt cleanup is admin-only, confirmed, and preserves the fulfillment ledger", () => {
  assert.match(receiptSource, /method:\s*["']DELETE["']/);
  assert.match(receiptSource, /olderThanDays/);
  assert.match(receiptSource, /confirm/);
  assert.match(receiptSource, /CLEAN/);
  assert.match(
    receiptSource,
    /statuses:\s*\[\s*["']fulfilled["'],\s*["']failed["'],\s*["']manual_review["']\s*\]/,
  );
  assert.match(
    receiptSource,
    /archive[^.]*receipt|receipt[^.]*archive/i,
  );
  assert.match(
    receiptSource,
    /idempotenc|duplicate processing|processing history/i,
  );
  assert.match(receiptSource, /\{canManage\s*&&[\s\S]*CLEAN/);
  assert.doesNotMatch(receiptSource, /Delete receipt/i);
});

test("receipt rows and actions remain usable on phones and assistive technology", () => {
  assert.match(receiptSource, /overflow-x-auto|grid-cols-1/);
  assert.match(receiptSource, /break-all|break-words/);
  assert.match(receiptSource, /min-h-11/);
  assert.match(receiptSource, /role=["']status["']/);
  assert.match(receiptSource, /role=["']alert["']/);
  assert.match(receiptSource, /aria-busy=/);
  assert.match(receiptSource, /disabled=\{[^}]*(?:loading|busy|saving|cleaning)/);
});

test("receipt history uses compact rows with progressive details", () => {
  assert.match(receiptSource, /aria-label=["']Receipt list["']/);
  for (const label of [
    "Status",
    "Receipt",
    "Customer",
    "Purchased",
    "Delivery",
    "Amount",
  ]) {
    assert.match(receiptSource, new RegExp(`>\\s*${label}\\s*<`));
  }

  assert.match(receiptSource, /<details[\s\S]*<summary/);
  assert.match(receiptSource, /View details for/);
  assert.match(receiptSource, /Receipt details/);
  assert.match(receiptSource, /h-16/);
  assert.doesNotMatch(receiptSource, /h-44/);
});

test("receipt dashboard copy is concise and operational", () => {
  assert.match(routeSource, />\s*Receipts\s*</);
  assert.match(routeSource, /Purchases, email delivery, and Discord logs\./);
  assert.match(receiptSource, /No matching receipts\./);
  assert.match(receiptSource, /More filters/);
  assert.match(receiptSource, /Receipt settings/);
  assert.match(receiptSource, /Email intake/);
  assert.match(receiptSource, /Discord roles/);
  assert.match(receiptSource, /Archive history/);

  for (const verboseCopy of [
    /Purchase fulfillment ledger/i,
    /Follow each forwarded purchase/i,
    /Search text is sent in the request body/i,
    /API performs every filter/i,
    /resumable scheduled batches/i,
    /Idempotency and processing history remain stored/i,
  ]) {
    assert.doesNotMatch(receiptSource, verboseCopy);
  }
});

test("failed receipt rows keep the error and delivery state readable at a glance", () => {
  assert.match(receiptSource, /receipt\.error/);
  assert.match(receiptSource, /Email sent|Email pending/);
  assert.match(receiptSource, /Discord sent|Discord pending/);
  assert.match(receiptSource, /Full error/);
  assert.match(receiptSource, /line-clamp-1/);
});
