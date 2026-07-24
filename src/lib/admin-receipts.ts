export const ADMIN_RECEIPTS_PAGE_SIZE = 20;

const RECEIPT_CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});
const RECEIPT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type ReceiptDirection = "asc" | "desc";
export type ReceiptVisibility = "active" | "archived" | "all";

export interface AdminReceipt {
  amount: string | null;
  archivedAt: string | null;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
  discordNotifiedAt: string | null;
  emailSentAt: string | null;
  error: string | null;
  id: string;
  idempotencyKey: string;
  kind: string;
  orderId: string | null;
  productName: string | null;
  purchasedAt: string | null;
  sourceSender: string | null;
  status: string;
  tier: string | null;
  updatedAt: string;
}

export interface AdminReceiptPageMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminReceiptSummary {
  archived?: number;
  failed?: number;
  fulfilled?: number;
  manualReview?: number;
  processing?: number;
  total?: number;
  [key: string]: number | undefined;
}

export interface AdminReceiptsPage {
  meta: AdminReceiptPageMeta;
  receipts: AdminReceipt[];
  summary: AdminReceiptSummary;
}

export interface AdminReceiptSettings {
  allowedSenderEmail: string | null;
  facilitiesRoleId: string;
  memberRoleId: string;
  receiptToAddress: string;
  roleReconciliationGeneration: number;
  roleReconciliationPending: boolean;
  updatedAt: string | null;
}

export type AdminReceiptSettingsUpdate =
  | Pick<AdminReceiptSettings, "allowedSenderEmail">
  | (Pick<
      AdminReceiptSettings,
      "allowedSenderEmail" | "facilitiesRoleId" | "memberRoleId"
    > & {
      expectedRoleGeneration: number;
    });

export interface AdminReceiptFilters {
  delivery: string;
  direction: ReceiptDirection;
  kind: string;
  page: number;
  perPage?: number;
  sort: string;
  status: string;
  tier: string;
  visibility: ReceiptVisibility;
}

const EMPTY_META: AdminReceiptPageMeta = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  perPage: ADMIN_RECEIPTS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readRequiredString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeReceipt(value: unknown): AdminReceipt | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const receipt = value as Record<string, unknown>;
  if (
    typeof receipt.id !== "string" ||
    typeof receipt.kind !== "string" ||
    typeof receipt.status !== "string"
  ) {
    return null;
  }

  const amount =
    typeof receipt.amount === "number" && Number.isFinite(receipt.amount)
      ? String(receipt.amount)
      : readNullableString(receipt.amount);

  return {
    amount,
    archivedAt: readNullableString(receipt.archivedAt),
    createdAt: readRequiredString(receipt.createdAt),
    customerEmail: readNullableString(receipt.customerEmail),
    customerName: readNullableString(receipt.customerName),
    discordNotifiedAt: readNullableString(receipt.discordNotifiedAt),
    emailSentAt: readNullableString(receipt.emailSentAt),
    error: readNullableString(receipt.error),
    id: receipt.id,
    idempotencyKey: readRequiredString(receipt.idempotencyKey),
    kind: receipt.kind,
    orderId: readNullableString(receipt.orderId),
    productName: readNullableString(receipt.productName),
    purchasedAt: readNullableString(receipt.purchasedAt),
    sourceSender: readNullableString(receipt.sourceSender),
    status: receipt.status,
    tier: readNullableString(receipt.tier),
    updatedAt: readRequiredString(receipt.updatedAt),
  };
}

function normalizeSummary(value: unknown): AdminReceiptSummary {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(([, count]) => isNonNegativeInteger(count)),
  );
}

function normalizeMeta(
  value: unknown,
  fallback: Pick<AdminReceiptPageMeta, "page" | "perPage">,
): AdminReceiptPageMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...EMPTY_META, ...fallback };
  }

  const meta = value as Partial<AdminReceiptPageMeta>;
  const page = isPositiveInteger(meta.page) ? meta.page : fallback.page;
  const perPage = isPositiveInteger(meta.perPage) ? meta.perPage : fallback.perPage;
  const total = isNonNegativeInteger(meta.total) ? meta.total : 0;
  const totalPages = isPositiveInteger(meta.totalPages)
    ? meta.totalPages
    : Math.max(1, Math.ceil(total / perPage));

  return {
    hasNextPage: typeof meta.hasNextPage === "boolean"
      ? meta.hasNextPage
      : page < totalPages,
    hasPreviousPage: typeof meta.hasPreviousPage === "boolean"
      ? meta.hasPreviousPage
      : page > 1,
    page,
    perPage,
    total,
    totalPages,
  };
}

export function buildAdminReceiptsUrl({
  delivery,
  direction,
  kind,
  page,
  perPage = ADMIN_RECEIPTS_PAGE_SIZE,
  sort,
  status,
  tier,
  visibility,
}: AdminReceiptFilters) {
  const searchParams = new URLSearchParams();
  searchParams.set("format", "page");
  searchParams.set("page", String(page));
  searchParams.set("per_page", String(perPage));
  searchParams.set("status", status);
  searchParams.set("kind", kind);
  searchParams.set("tier", tier);
  searchParams.set("delivery", delivery);
  searchParams.set("visibility", visibility);
  searchParams.set("sort", sort);
  searchParams.set("direction", direction);
  return `/api/admin/receipts?${searchParams.toString()}`;
}

export function normalizeAdminReceiptsPage(
  value: unknown,
  url: string,
): AdminReceiptsPage {
  const requestUrl = new URL(url, "https://admin-receipts.local");
  const requestedPage = Number(requestUrl.searchParams.get("page"));
  const requestedPerPage = Number(requestUrl.searchParams.get("per_page"));
  const fallback = {
    page: isPositiveInteger(requestedPage) ? requestedPage : 1,
    perPage: isPositiveInteger(requestedPerPage)
      ? requestedPerPage
      : ADMIN_RECEIPTS_PAGE_SIZE,
  };

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { meta: normalizeMeta(null, fallback), receipts: [], summary: {} };
  }

  const page = value as Partial<AdminReceiptsPage>;
  return {
    meta: normalizeMeta(page.meta, fallback),
    receipts: Array.isArray(page.receipts)
      ? page.receipts.flatMap((receipt) => {
        const normalized = normalizeReceipt(receipt);
        return normalized ? [normalized] : [];
      })
      : [],
    summary: normalizeSummary(page.summary),
  };
}

export function normalizeAdminReceiptSettings(
  value: unknown,
): AdminReceiptSettings {
  const envelope =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as { settings?: unknown }
      : {};
  const candidate =
    typeof envelope.settings === "object" &&
    envelope.settings !== null &&
    !Array.isArray(envelope.settings)
      ? envelope.settings
      : value;
  const settings =
    typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)
      ? candidate as Partial<AdminReceiptSettings>
      : {};

  return {
    allowedSenderEmail:
      typeof settings.allowedSenderEmail === "string"
        ? settings.allowedSenderEmail
        : null,
    facilitiesRoleId:
      typeof settings.facilitiesRoleId === "string"
        ? settings.facilitiesRoleId
        : "",
    memberRoleId:
      typeof settings.memberRoleId === "string" ? settings.memberRoleId : "",
    receiptToAddress:
      typeof settings.receiptToAddress === "string"
        ? settings.receiptToAddress
        : "purchases@purduephotoclub.org",
    roleReconciliationGeneration:
      typeof settings.roleReconciliationGeneration === "number" &&
      Number.isSafeInteger(settings.roleReconciliationGeneration) &&
      settings.roleReconciliationGeneration >= 0
        ? settings.roleReconciliationGeneration
        : 0,
    roleReconciliationPending: settings.roleReconciliationPending === true,
    updatedAt:
      typeof settings.updatedAt === "string" ? settings.updatedAt : null,
  };
}

export function formatReceiptDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return RECEIPT_DATE_FORMATTER.format(date);
}

export function formatReceiptAmount(value: string | null) {
  if (!value) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return RECEIPT_CURRENCY_FORMATTER.format(amount);
}
