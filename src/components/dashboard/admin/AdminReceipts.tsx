import { useDeferredValue, useState } from "react";
import { RefreshCw } from "lucide-react";
import useSWR from "swr";

import AdminReceiptsLedger, {
  type ReceiptFilterState,
} from "./AdminReceiptsLedger";
import AdminReceiptSettings from "./AdminReceiptSettings";
import {
  ADMIN_RECEIPTS_PAGE_SIZE,
  buildAdminReceiptsUrl,
  normalizeAdminReceiptsPage,
  normalizeAdminReceiptSettings,
  type AdminReceiptPageMeta,
  type AdminReceiptsPage,
  type AdminReceiptSettings as ReceiptSettings,
  type AdminReceiptSettingsUpdate,
} from "@/lib/admin-receipts";
import {
  fetchApi,
  fetchFreshJson,
  fetchJson,
  readErrorMessage,
} from "@/lib/http";

const EMPTY_META: AdminReceiptPageMeta = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  perPage: ADMIN_RECEIPTS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};
const EMPTY_PAGE: AdminReceiptsPage = {
  meta: EMPTY_META,
  receipts: [],
  summary: {},
};
const RECEIPT_SWR_OPTIONS = {
  dedupingInterval: 10_000,
  keepPreviousData: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
};

const INITIAL_FILTERS: ReceiptFilterState = {
  delivery: "all",
  direction: "desc",
  kind: "all",
  search: "",
  sort: "purchased_at",
  status: "all",
  tier: "all",
  visibility: "active",
};

async function fetchAdminReceipts([url, search]: readonly [string, string]) {
  const data = await fetchJson<unknown>(url, {
    body: JSON.stringify({ search }),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return normalizeAdminReceiptsPage(data, url);
}

async function fetchReceiptSettings(url: string) {
  const data = await fetchFreshJson<unknown>(url);
  return normalizeAdminReceiptSettings(data);
}

export default function AdminReceipts({ canManage }: { canManage: boolean }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pageNumber, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const deferredSearch = useDeferredValue(filters.search.trim());
  const receiptsUrl = buildAdminReceiptsUrl({
    delivery: filters.delivery,
    direction: filters.direction,
    kind: filters.kind,
    page: pageNumber,
    sort: filters.sort,
    status: filters.status,
    tier: filters.tier,
    visibility: filters.visibility,
  });

  const {
    data: receiptPage,
    error: receiptError,
    isLoading: receiptsLoading,
    isValidating: receiptsRefreshing,
    mutate: mutateReceipts,
  } = useSWR<AdminReceiptsPage>(
    [receiptsUrl, deferredSearch] as const,
    fetchAdminReceipts,
    RECEIPT_SWR_OPTIONS,
  );
  const {
    data: settings,
    error: settingsError,
    isLoading: settingsLoading,
    mutate: mutateSettings,
  } = useSWR<ReceiptSettings>(
    "/api/admin/receipt-settings",
    fetchReceiptSettings,
    RECEIPT_SWR_OPTIONS,
  );

  const clearFeedback = () => {
    setActionError("");
    setNotice("");
  };

  const handleFilterChange = <K extends keyof ReceiptFilterState>(
    field: K,
    value: ReceiptFilterState[K],
  ) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
    clearFeedback();
  };

  const handlePageChange = (nextPage: number) => {
    const meta = receiptPage?.meta;
    if (
      !meta ||
      nextPage < 1 ||
      nextPage > meta.totalPages ||
      nextPage === meta.page
    ) {
      return;
    }
    setPage(nextPage);
  };

  const handleRefresh = async () => {
    clearFeedback();
    try {
      await Promise.all([mutateReceipts(), mutateSettings()]);
      setNotice("Receipt data refreshed.");
    } catch {
      setActionError("Unable to refresh receipt data.");
    }
  };

  const handleSaveSettings = async (
    nextSettings: AdminReceiptSettingsUpdate,
  ) => {
    if (!canManage) return false;
    setSaving(true);
    clearFeedback();
    try {
      const response = await fetchApi("/api/admin/receipt-settings", {
        body: JSON.stringify(nextSettings),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to save receipt settings.",
        );
        if (response.status === 409) {
          await mutateSettings();
        }
        throw new Error(message);
      }
      const payload = await response.json().catch(() => ({})) as unknown;
      await mutateSettings(normalizeAdminReceiptSettings(payload), {
        revalidate: false,
      });
      setNotice(
        "expectedRoleGeneration" in nextSettings
          ? "Receipt settings saved. Discord role reconciliation is queued."
          : "Allowed receipt sender saved. The email worker will use it on the next message.",
      );
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to save receipt settings.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCleanReceipts = async (olderThanDays: number) => {
    if (!canManage) return false;
    setCleaning(true);
    clearFeedback();
    try {
      const response = await fetchApi("/api/admin/receipts", {
        body: JSON.stringify({
          confirm: "CLEAN",
          olderThanDays,
          statuses: ["fulfilled", "failed", "manual_review"],
        }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to archive old receipts."),
        );
      }
      const result = await response.json().catch(() => ({})) as {
        archivedCount?: number;
      };
      setPage(1);
      await mutateReceipts();
      setNotice(
        `${result.archivedCount ?? 0} old receipt${
          result.archivedCount === 1 ? "" : "s"
        } archived.`,
      );
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to archive old receipts.",
      );
      return false;
    } finally {
      setCleaning(false);
    }
  };

  const visiblePage = receiptPage ?? EMPTY_PAGE;
  const loadError = receiptError
    ? "Failed to load receipt history."
    : settingsError
      ? "Receipt history loaded, but settings are unavailable."
      : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm text-neutral-200">Purchase fulfillment ledger</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            Follow each forwarded purchase from receipt intake through activation
            email and the Discord purchase log. Search text is sent in the request
            body and the API performs every filter, sort, and page operation.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={receiptsRefreshing || settingsLoading}
          onClick={() => void handleRefresh()}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={receiptsRefreshing ? "animate-spin motion-reduce:animate-none" : ""}
            size={13}
          />
          Refresh
        </button>
      </div>

      {(actionError || loadError) && (
        <p className="text-xs leading-relaxed text-red-400" role="alert">
          {actionError || loadError}
        </p>
      )}
      {notice && (
        <p
          aria-live="polite"
          className="text-xs leading-relaxed text-emerald-400"
          role="status"
        >
          {notice}
        </p>
      )}

      <AdminReceiptsLedger
        filters={filters}
        loading={receiptsLoading || receiptsRefreshing}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        page={visiblePage}
      />

      {settingsLoading && !settings ? (
        <div
          aria-label="Loading receipt settings"
          className="h-72 animate-pulse border border-neutral-800 bg-white/[0.015] motion-reduce:animate-none"
        />
      ) : settings ? (
        <AdminReceiptSettings
          canManage={canManage}
          cleaning={cleaning}
          key={`${settings.roleReconciliationGeneration}-${settings.memberRoleId}-${settings.facilitiesRoleId}-${settings.updatedAt ?? "initial"}-${settings.allowedSenderEmail ?? ""}`}
          onClean={handleCleanReceipts}
          onSave={handleSaveSettings}
          saving={saving}
          settings={settings}
        />
      ) : null}
    </div>
  );
}
