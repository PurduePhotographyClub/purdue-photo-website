import {
  AlertTriangle,
  Clock3,
  MailCheck,
  MessageSquare,
  Search,
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
      <div>
        <p className="mb-2 text-[10px] leading-relaxed text-neutral-600">
          Global receipt overview
        </p>
        <div
          aria-label="Global receipt overview"
          className="grid grid-cols-1 border border-neutral-800 sm:grid-cols-2 xl:grid-cols-6"
        >
          <SummaryCell label="All receipts" value={summary.total ?? 0} />
          <SummaryCell label="Fulfilled" value={summary.fulfilled ?? 0} />
          <SummaryCell label="Processing" value={summary.processing ?? 0} />
          <SummaryCell label="Manual review" value={summary.manualReview ?? 0} />
          <SummaryCell label="Failed" value={summary.failed ?? 0} />
          <SummaryCell label="Archived" value={summary.archived ?? 0} />
        </div>
      </div>

      <div className="space-y-3 border-y border-neutral-800 py-4">
        <div className="relative">
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
            placeholder="Search order, customer, product, or sender"
            type="search"
            value={filters.search}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
            <option value="all">All purchase types</option>
            <option value="membership">Membership</option>
            <option value="rolls">Film rolls</option>
            <option value="prints">Prints</option>
          </select>

          <select
            aria-label="Filter by membership tier"
            className={CONTROL_CLASS}
            onChange={(event) => onFilterChange("tier", event.target.value)}
            value={filters.tier}
          >
            <option value="all">All tiers</option>
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
            aria-label="Filter archived receipts"
            className={CONTROL_CLASS}
            onChange={(event) => onFilterChange(
              "visibility",
              event.target.value as ReceiptVisibility,
            )}
            value={filters.visibility}
          >
            <option value="active">Active receipts</option>
            <option value="archived">Archived receipts</option>
            <option value="all">Active and archived</option>
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
      </div>

      <p className="text-[10px] leading-relaxed tracking-wide text-neutral-600">
        Matching filters · Showing {receipts.length} on this page · {meta.total} receipt
        {meta.total === 1 ? "" : "s"}
      </p>

      {loading && receipts.length === 0 ? (
        <ReceiptSkeleton />
      ) : receipts.length === 0 ? (
        <div className="border border-neutral-800 bg-white/[0.015] p-6">
          <p className="text-sm text-neutral-300">No receipts match these controls.</p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-600">
            Change a filter or search term. New forwarded receipts appear here after
            the email worker accepts and sends them to the API.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <ReceiptRow key={receipt.id} receipt={receipt} />
          ))}
        </div>
      )}

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
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-neutral-800 px-4 py-3 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-600">{label}</p>
      <p className="mt-1 text-sm text-neutral-300">{value}</p>
    </div>
  );
}

function ReceiptSkeleton() {
  return (
    <div aria-label="Loading receipts" className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="h-44 animate-pulse border border-neutral-800 bg-white/[0.015] motion-reduce:animate-none"
          key={index}
        />
      ))}
    </div>
  );
}

function ReceiptRow({ receipt }: { receipt: AdminReceipt }) {
  const isMembership = receipt.kind === "membership";

  return (
    <article className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border px-2 py-1 text-[9px] uppercase tracking-[0.15em] ${
                STATUS_TONE[receipt.status] ??
                "border-neutral-700 bg-neutral-900 text-neutral-400"
              }`}
            >
              {humanize(receipt.status)}
            </span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-600">
              {humanize(receipt.kind)}
              {receipt.tier ? ` · ${humanize(receipt.tier)}` : ""}
            </span>
            {receipt.archivedAt && (
              <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-neutral-500">
                Archived
              </span>
            )}
          </div>
          <h3 className="mt-3 break-words text-sm text-neutral-100">
            {receipt.productName || "Purchase receipt"}
          </h3>
          <p className="mt-1 break-all text-xs text-neutral-500">
            {receipt.customerName || "Customer name unavailable"}
            {receipt.customerEmail ? ` · ${receipt.customerEmail}` : ""}
          </p>
        </div>
        <p className="text-base text-neutral-200">
          {formatReceiptAmount(receipt.amount)}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-neutral-800 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReceiptDatum
          label="Purchased"
          value={formatReceiptDate(receipt.purchasedAt)}
        />
        <ReceiptDatum
          label="Order"
          value={receipt.orderId || "Not provided"}
        />
        <ReceiptDatum
          label="Forwarded by"
          value={receipt.sourceSender || "Not recorded"}
        />
        <ReceiptDatum
          label="Last activity"
          value={formatReceiptDate(receipt.updatedAt)}
        />
      </dl>

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-800 pt-4 text-[10px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <DeliveryState
          complete={isMembership ? Boolean(receipt.emailSentAt) : true}
          completeLabel={isMembership ? "Activation email sent" : "Email not required"}
          icon="email"
          pendingLabel="Activation email pending"
        />
        <DeliveryState
          complete={Boolean(receipt.discordNotifiedAt)}
          completeLabel="Discord purchase log sent"
          icon="discord"
          pendingLabel="Discord purchase log pending"
        />
      </div>

      {receipt.error && (
        <p className="mt-4 flex items-start gap-2 break-words border-t border-neutral-800 pt-4 text-xs leading-relaxed text-red-300">
          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={13} />
          {receipt.error}
        </p>
      )}
    </article>
  );
}

function ReceiptDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">
        {label}
      </dt>
      <dd className="mt-1 break-all text-[10px] leading-relaxed text-neutral-400">
        {value}
      </dd>
    </div>
  );
}

function DeliveryState({
  complete,
  completeLabel,
  icon,
  pendingLabel,
}: {
  complete: boolean;
  completeLabel: string;
  icon: "discord" | "email";
  pendingLabel: string;
}) {
  const Icon = complete
    ? icon === "email"
      ? MailCheck
      : MessageSquare
    : Clock3;

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 ${
        complete ? "text-emerald-400" : "text-amber-300"
      }`}
    >
      <Icon aria-hidden="true" size={12} />
      {complete ? completeLabel : pendingLabel}
    </span>
  );
}
