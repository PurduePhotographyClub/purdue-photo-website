import {
  AlertTriangle,
  ChevronDown,
  Clock3,
  MailCheck,
  MessageSquare,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  formatReceiptAmount,
  formatReceiptDate,
  type AdminReceipt,
  type AdminReceiptsPage,
  type ReceiptDirection,
  type ReceiptVisibility,
} from "@/lib/admin-receipts";

export interface ReceiptFilterState {
  delivery: string;
  direction: ReceiptDirection;
  kind: string;
  search: string;
  sort: string;
  status: string;
  tier: string;
  visibility: ReceiptVisibility;
}

interface AdminReceiptsLedgerProps {
  filters: ReceiptFilterState;
  loading: boolean;
  onFilterChange: <K extends keyof ReceiptFilterState>(
    field: K,
    value: ReceiptFilterState[K],
  ) => void;
  onPageChange: (page: number) => void;
  page: AdminReceiptsPage;
}

const CONTROL_CLASS =
  "min-h-11 w-full border border-neutral-800 bg-neutral-950 px-3 text-xs text-neutral-300 outline-none transition-colors placeholder:text-neutral-500 focus:border-neutral-500 sm:w-auto";

const STATUS_TONE: Record<string, string> = {
  failed: "border-red-900/80 bg-red-950/30 text-red-300",
  fulfilled: "border-emerald-900/80 bg-emerald-950/30 text-emerald-300",
  manual_review: "border-sky-900/80 bg-sky-950/30 text-sky-300",
  processing: "border-amber-900/80 bg-amber-950/30 text-amber-300",
};

const RECEIPT_GRID =
  "xl:grid-cols-[7rem_minmax(10rem,1.35fr)_minmax(11rem,1.2fr)_9rem_9rem_6rem_2.75rem]";

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

export default function AdminReceiptsLedger({
  filters,
  loading,
  onFilterChange,
  onPageChange,
  page,
}: AdminReceiptsLedgerProps) {
  const { meta, receipts, summary } = page;
  const pageNumbers = getVisiblePageNumbers(meta.page, meta.totalPages);

  return (
    <section aria-busy={loading} className="space-y-4">
      <div
        aria-label="Global receipt overview"
        className="grid grid-cols-3 border border-neutral-800 sm:grid-cols-6"
      >
        <SummaryCell label="All" value={summary.total ?? 0} />
        <SummaryCell label="Done" value={summary.fulfilled ?? 0} />
        <SummaryCell label="Working" value={summary.processing ?? 0} />
        <SummaryCell label="Review" value={summary.manualReview ?? 0} />
        <SummaryCell label="Failed" value={summary.failed ?? 0} />
        <SummaryCell label="Archived" value={summary.archived ?? 0} />
      </div>

      <div className="border border-neutral-800">
        <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(3,auto)]">
          <div className="relative col-span-2 lg:col-span-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
              size={14}
            />
            <input
              aria-label="Search receipts"
              className={`${CONTROL_CLASS} w-full pl-9 sm:w-full`}
              maxLength={100}
              onChange={(event) => onFilterChange("search", event.target.value)}
              placeholder="Order, customer, product, or sender"
              type="search"
              value={filters.search}
            />
          </div>

          <select
            aria-label="Filter by status"
            className={CONTROL_CLASS}
            onChange={(event) => onFilterChange("status", event.target.value)}
            value={filters.status}
          >
            <option value="all">All statuses</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="manual_review">Manual review</option>
          </select>

          <select
            aria-label="Filter by purchase type"
            className={CONTROL_CLASS}
            onChange={(event) => onFilterChange("kind", event.target.value)}
            value={filters.kind}
          >
            <option value="all">All purchases</option>
            <option value="membership">Membership</option>
            <option value="rolls">Film rolls</option>
            <option value="prints">Prints</option>
          </select>

          <select
            aria-label="Filter archived receipts"
            className={`${CONTROL_CLASS} col-span-2 lg:col-span-1`}
            onChange={(event) => onFilterChange(
              "visibility",
              event.target.value as ReceiptVisibility,
            )}
            value={filters.visibility}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All history</option>
          </select>
        </div>

        <details className="group border-t border-neutral-800">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-[10px] uppercase tracking-[0.14em] text-neutral-500 outline-none transition-colors hover:bg-white/[0.02] hover:text-neutral-300 focus-visible:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal aria-hidden="true" size={13} />
              More filters
            </span>
            <ChevronDown
              aria-hidden="true"
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
              size={14}
            />
          </summary>
          <div className="grid grid-cols-1 gap-2 border-t border-neutral-800 bg-black/20 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              aria-label="Filter by membership tier"
              className={CONTROL_CLASS}
              onChange={(event) => onFilterChange("tier", event.target.value)}
              value={filters.tier}
            >
              <option value="all">All membership tiers</option>
              <option value="member">Member</option>
              <option value="facilities">Facilities</option>
              <option value="none">No membership tier</option>
            </select>

            <select
              aria-label="Filter by delivery state"
              className={CONTROL_CLASS}
              onChange={(event) => onFilterChange("delivery", event.target.value)}
              value={filters.delivery}
            >
              <option value="all">All delivery states</option>
              <option value="email_sent">Email sent</option>
              <option value="email_pending">Email pending</option>
              <option value="discord_sent">Discord sent</option>
              <option value="discord_pending">Discord pending</option>
            </select>

            <select
              aria-label="Sort receipts"
              className={CONTROL_CLASS}
              onChange={(event) => onFilterChange("sort", event.target.value)}
              value={filters.sort}
            >
              <option value="purchased_at">Purchase date</option>
              <option value="created_at">Received date</option>
              <option value="updated_at">Last activity</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>

            <select
              aria-label="Sort direction"
              className={CONTROL_CLASS}
              onChange={(event) => onFilterChange(
                "direction",
                event.target.value as ReceiptDirection,
              )}
              value={filters.direction}
            >
              <option value="desc">Newest / highest</option>
              <option value="asc">Oldest / lowest</option>
            </select>
          </div>
        </details>
      </div>

      <p className="text-[10px] tracking-wide text-neutral-600">
        <span className="sr-only">Matching filters. </span>
        Showing {receipts.length} of {meta.total}
      </p>

      {loading && receipts.length === 0 ? (
        <ReceiptSkeleton />
      ) : receipts.length === 0 ? (
        <div className="border border-neutral-800 bg-white/[0.015] px-4 py-8 text-center">
          <p className="text-sm text-neutral-300">No matching receipts.</p>
          <p className="mt-2 text-xs text-neutral-600">Try another search or filter.</p>
        </div>
      ) : (
        <div aria-label="Receipt list" className="border border-neutral-800">
          <div
            aria-hidden="true"
            className={`hidden ${RECEIPT_GRID} gap-3 border-b border-neutral-800 bg-black/20 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-neutral-600 xl:grid`}
          >
            <span>Status</span>
            <span>Receipt</span>
            <span>Customer</span>
            <span>Purchased</span>
            <span>Delivery</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {receipts.map((receipt) => (
            <ReceiptRow key={receipt.id} receipt={receipt} />
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <nav
          aria-label="Receipt pagination"
          className="flex flex-wrap items-center justify-center gap-2 border-t border-neutral-800 pt-4"
        >
          <p
            aria-live="polite"
            className="w-full pb-1 text-center text-[10px] uppercase tracking-[0.18em] text-neutral-600"
            role="status"
          >
            Page {meta.page} of {meta.totalPages}
          </p>
          <button
            className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={loading || !meta.hasPreviousPage}
            onClick={() => onPageChange(meta.page - 1)}
            type="button"
          >
            Previous
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              aria-current={pageNumber === meta.page ? "page" : undefined}
              aria-label={`Go to receipt page ${pageNumber}`}
              className={`min-h-11 min-w-11 border px-3 text-xs transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${
                pageNumber === meta.page
                  ? "border-white text-white"
                  : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"
              }`}
              disabled={loading}
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ))}
          <button
            className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={loading || !meta.hasNextPage}
            onClick={() => onPageChange(meta.page + 1)}
            type="button"
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-r border-neutral-800 px-3 py-2.5 [&:nth-child(3n)]:border-r-0 [&:nth-child(n+4)]:border-b-0 sm:border-b-0 sm:[&:nth-child(3n)]:border-r sm:last:border-r-0">
      <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">{label}</p>
      <p className="mt-1 text-sm text-neutral-300">{value}</p>
    </div>
  );
}

function ReceiptSkeleton() {
  return (
    <div aria-label="Loading receipts" className="border border-neutral-800">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="h-16 animate-pulse border-b border-neutral-800 bg-white/[0.015] last:border-b-0 motion-reduce:animate-none"
          key={index}
        />
      ))}
    </div>
  );
}

function ReceiptRow({ receipt }: { receipt: AdminReceipt }) {
  const isMembership = receipt.kind === "membership";
  const receiptName = receipt.productName || "Purchase receipt";
  const customerName = receipt.customerName || "Customer unavailable";

  return (
    <details className="group border-b border-neutral-800 last:border-b-0">
      <summary
        aria-label={`View details for ${receiptName}`}
        className="cursor-pointer list-none px-3 py-3 outline-none transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.03] [&::-webkit-details-marker]:hidden"
      >
        <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 ${RECEIPT_GRID} xl:grid`}>
          <div className="order-1 min-w-0 xl:order-1">
            <span
              className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${
                STATUS_TONE[receipt.status] ??
                "border-neutral-700 bg-neutral-900 text-neutral-400"
              }`}
            >
              {humanize(receipt.status)}
            </span>
          </div>

          <div className="order-3 col-span-2 min-w-0 xl:order-2 xl:col-span-1">
            <p className="truncate text-xs text-neutral-100">{receiptName}</p>
            <p className="mt-1 truncate text-[10px] text-neutral-600">
              {humanize(receipt.kind)}
              {receipt.tier ? ` · ${humanize(receipt.tier)}` : ""}
              {receipt.archivedAt ? " · Archived" : ""}
            </p>
            {receipt.error && (
              <p className="mt-1 line-clamp-1 text-[10px] leading-5 text-red-300">
                {receipt.error}
              </p>
            )}
          </div>

          <div className="order-4 col-span-2 min-w-0 xl:order-3 xl:col-span-1">
            <p className="truncate text-xs text-neutral-300">{customerName}</p>
            {receipt.customerEmail && (
              <p className="mt-1 truncate text-[10px] text-neutral-500">
                {receipt.customerEmail}
              </p>
            )}
          </div>

          <p className="order-5 text-[10px] leading-5 text-neutral-500 xl:order-4">
            {formatReceiptDate(receipt.purchasedAt)}
          </p>

          <div className="order-6 flex flex-col items-start gap-1 text-[10px] xl:order-5">
            <DeliveryState
              complete={isMembership ? Boolean(receipt.emailSentAt) : null}
              completeLabel="Email sent"
              pendingLabel="Email pending"
            />
            <DeliveryState
              complete={Boolean(receipt.discordNotifiedAt)}
              completeLabel="Discord sent"
              pendingLabel="Discord pending"
              type="discord"
            />
          </div>

          <div className="order-2 flex items-center justify-self-end xl:contents">
            <p className="text-sm text-neutral-200 xl:order-6 xl:justify-self-end">
              {formatReceiptAmount(receipt.amount)}
            </p>
            <span className="flex size-9 items-center justify-center text-neutral-600 xl:order-7 xl:size-11">
              <ChevronDown
                aria-hidden="true"
                className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
                size={15}
              />
            </span>
          </div>
        </div>
      </summary>

      <div className="border-t border-neutral-800 bg-black/20 px-3 py-3">
        <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          Receipt details
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
          <ReceiptDatum label="Order" value={receipt.orderId || "Not provided"} />
          <ReceiptDatum
            label="Received"
            value={formatReceiptDate(receipt.createdAt)}
          />
          <ReceiptDatum
            label="Forwarded by"
            value={receipt.sourceSender || "Not recorded"}
          />
          <ReceiptDatum
            label="Last activity"
            value={formatReceiptDate(receipt.updatedAt)}
          />
          <ReceiptDatum label="Receipt ID" value={receipt.id} />
        </dl>

        {receipt.error && (
          <p className="mt-3 flex items-start gap-2 break-words border-t border-neutral-800 pt-3 text-xs leading-5 text-red-300">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={13}
            />
            <span>
              <span className="mr-2 text-[9px] uppercase tracking-[0.14em] text-red-400">
                Full error
              </span>
              {receipt.error}
            </span>
          </p>
        )}
      </div>
    </details>
  );
}

function ReceiptDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">
        {label}
      </dt>
      <dd className="mt-1 break-all text-[10px] leading-5 text-neutral-400">
        {value}
      </dd>
    </div>
  );
}

function DeliveryState({
  complete,
  completeLabel,
  pendingLabel,
  type = "email",
}: {
  complete: boolean | null;
  completeLabel: string;
  pendingLabel: string;
  type?: "discord" | "email";
}) {
  if (complete === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-neutral-600">
        <MailCheck aria-hidden="true" size={12} />
        Email n/a
      </span>
    );
  }

  const Icon = complete
    ? type === "email"
      ? MailCheck
      : MessageSquare
    : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        complete ? "text-emerald-400" : "text-amber-300"
      }`}
    >
      <Icon aria-hidden="true" size={12} />
      {complete ? completeLabel : pendingLabel}
    </span>
  );
}
