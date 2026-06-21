import {
  useEffect,
  useMemo,
  useReducer,
  useRef
} from "react";
import useSWR from "swr";
import {
  CalendarCheck,
  Check,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
  readJson
} from "@/lib/http";

interface StudioStats {
  approvedSessions: number;
  pendingRequests: number;
  totalRequests: number;
  uniqueApprovedUsers: number;
  uniqueUsedUsers: number;
  upcomingApprovedSessions: number;
  usedSessions: number;
}

interface StudioRequest {
  adminNote: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  discordChannelId: string | null;
  discordMessageId: string | null;
  discordSyncError: string | null;
  discordSyncStatus: "archived" | "failed" | "pending" | "synced";
  endsAt: string;
  id: string;
  memberNote: string | null;
  needsStudioManager: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  startsAt: string;
  status: StudioRequestStatus;
  userEmail: string | null;
  userId: string;
  userName: string;
}

interface AdminStudioResponse {
  requests: StudioRequest[];
  stats: StudioStats;
}

interface StudioMutationResponse {
  discordSyncWarning?: string | null;
  request?: StudioRequest | null;
}

interface ClearResolvedResponse {
  deletedCount?: number;
  ok?: boolean;
}

type StudioAdminAction = "approve" | "cancel" | "reject";
type StudioRequestStatus = "approved" | "cancelled" | "pending" | "rejected";

interface AdminStudioState {
  adminNote: string;
  busyAction: string | null;
  clearResolvedConfirmOpen: boolean;
  error: string;
  modal: { action: StudioAdminAction; requestId: string } | null;
  success: string;
}

const initialAdminStudioState: AdminStudioState = {
  adminNote: "",
  busyAction: null,
  clearResolvedConfirmOpen: false,
  error: "",
  modal: null,
  success: "",
};

const CLUB_TIME_ZONE = "America/Indiana/Indianapolis";
const EMPTY_STUDIO_REQUESTS: StudioRequest[] = [];
const actionButtonClass = "inline-flex min-h-9 items-center justify-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";

export default function AdminStudio() {
  const [state, setState] = useReducer(adminStudioReducer, initialAdminStudioState);
  const {
    adminNote,
    busyAction,
    clearResolvedConfirmOpen,
    error,
    modal,
    success,
  } = state;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<AdminStudioResponse>("/api/admin/studio", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const requests = data?.requests ?? EMPTY_STUDIO_REQUESTS;
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending").toSorted(sortByStartsAtAsc),
    [requests],
  );
  const upcomingApproved = useMemo(
    () => requests
      .filter((request) => request.status === "approved" && Date.parse(request.endsAt) > Date.now())
      .toSorted(sortByStartsAtAsc),
    [requests],
  );
  const resolvedRequests = useMemo(
    () => requests
      .filter((request) => request.status !== "pending" && !(request.status === "approved" && Date.parse(request.endsAt) > Date.now()))
      .toSorted((a, b) => Date.parse(b.resolvedAt ?? b.createdAt) - Date.parse(a.resolvedAt ?? a.createdAt)),
    [requests],
  );
  const modalError = modal || clearResolvedConfirmOpen ? error : "";
  const pageError = loadError ? "Failed to load studio data." : modalError ? "" : error;

  const openModal = (requestId: string, action: StudioAdminAction) => {
    setState({
      adminNote: "",
      error: "",
      modal: { action, requestId },
      success: "",
    });
  };

  const closeActionModal = () => {
    setState({
      adminNote: "",
      error: "",
      modal: null,
    });
  };

  const openClearResolvedModal = () => {
    if (resolvedRequests.length === 0) {
      return;
    }

    setState({
      clearResolvedConfirmOpen: true,
      error: "",
      success: "",
    });
  };

  const closeClearResolvedModal = () => {
    setState({
      clearResolvedConfirmOpen: false,
      error: "",
    });
  };

  const handleAction = async () => {
    if (!modal) return;
    setState({
      busyAction: `${modal.action}:${modal.requestId}`,
      error: "",
      success: "",
    });

    try {
      const response = await fetchApi(`/api/admin/studio/${modal.requestId}`, {
        body: JSON.stringify({
          action: modal.action,
          adminNote: adminNote || null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to update studio request.") });
        return;
      }

      const result = await readJson<StudioMutationResponse>(response);
      setState({
        adminNote: "",
        modal: null,
        success: result.discordSyncWarning || getActionSuccessMessage(modal.action),
      });
      await mutate();
    } catch {
      setState({ error: "Failed to update studio request." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleRetrySync = async (requestId: string) => {
    setState({
      busyAction: `sync:${requestId}`,
      error: "",
      success: "",
    });

    try {
      const response = await fetchApi(`/api/admin/studio/${requestId}/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to sync studio request.") });
        return;
      }

      setState({ success: "Discord sync completed." });
      await mutate();
    } catch {
      setState({ error: "Failed to sync studio request." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleClearResolved = async () => {
    if (resolvedRequests.length === 0) {
      return;
    }

    setState({
      busyAction: "clear-resolved",
      error: "",
      success: "",
    });

    try {
      const response = await fetchApi("/api/admin/studio", {
        method: "DELETE",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to clear resolved studio requests.") });
        return;
      }

      const result = await readJson<ClearResolvedResponse>(response);
      const deletedCount = result.deletedCount ?? 0;
      setState({
        clearResolvedConfirmOpen: false,
        success: `Cleared ${deletedCount} resolved studio request${deletedCount === 1 ? "" : "s"}.`,
      });
      await mutate();
    } catch {
      setState({ error: "Failed to clear resolved studio requests." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const modalRequest = requests.find((request) => request.id === modal?.requestId);

  if (isLoading) {
    return <p className="text-xs text-neutral-500">Loading studio requests</p>;
  }

  return (
    <div className="space-y-6">
      {pageError && (
        <p className="border border-red-900/30 bg-red-900/10 px-4 py-3 text-xs text-red-400">
          {pageError}
        </p>
      )}
      {success && (
        <p className="border border-green-900/30 bg-green-900/10 px-4 py-3 text-xs text-green-400">
          {success}
        </p>
      )}

      <AdminStudioStats stats={data?.stats} />

      <StudioRequestSection
        actionKind="pending"
        busyAction={busyAction}
        emptyLabel="No pending studio requests."
        label={`Pending Requests (${pendingRequests.length})`}
        requests={pendingRequests}
        onAction={openModal}
        onRetrySync={handleRetrySync}
      />

      <StudioRequestSection
        actionKind="approved"
        busyAction={busyAction}
        emptyLabel="No upcoming approved studio reservations."
        label={`Approved Upcoming (${upcomingApproved.length})`}
        requests={upcomingApproved}
        onAction={openModal}
        onRetrySync={handleRetrySync}
      />

      <StudioRequestSection
        actionKind="resolved"
        busyAction={busyAction}
        clearResolved={{
          busy: busyAction === "clear-resolved",
          disabled: resolvedRequests.length === 0,
          onClear: openClearResolvedModal,
        }}
        emptyLabel="No resolved studio requests."
        label={`Resolved (${resolvedRequests.length})`}
        requests={resolvedRequests}
        onAction={openModal}
        onRetrySync={handleRetrySync}
      />

      {modal && modalRequest && (
        <StudioActionModal
          action={modal.action}
          busy={busyAction === `${modal.action}:${modal.requestId}`}
          error={modalError}
          note={adminNote}
          request={modalRequest}
          onClose={closeActionModal}
          onNoteChange={(value) => setState({ adminNote: value })}
          onSubmit={handleAction}
        />
      )}

      {clearResolvedConfirmOpen && (
        <ClearResolvedModal
          busy={busyAction === "clear-resolved"}
          count={resolvedRequests.length}
          error={modalError}
          onClose={closeClearResolvedModal}
          onSubmit={handleClearResolved}
        />
      )}
    </div>
  );
}

function adminStudioReducer(
  state: AdminStudioState,
  patch: Partial<AdminStudioState>,
) {
  return {
    ...state,
    ...patch,
  };
}

function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return dialogRef;
}

function AdminStudioStats({ stats }: { stats: StudioStats | undefined }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
      <AdminStudioStat label="People Used Studio" value={stats?.uniqueUsedUsers ?? 0} />
      <AdminStudioStat label="Completed Uses" value={stats?.usedSessions ?? 0} />
      <AdminStudioStat label="Upcoming" value={stats?.upcomingApprovedSessions ?? 0} />
      <AdminStudioStat label="Pending" value={stats?.pendingRequests ?? 0} />
    </div>
  );
}

function AdminStudioStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-neutral-800 bg-white/[0.02] p-5">
      <p className="mb-1 text-[9px] uppercase tracking-[0.3em] text-neutral-600">{label}</p>
      <p className="text-3xl font-light text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
    </div>
  );
}

interface StudioRequestSectionProps {
  actionKind: "approved" | "pending" | "resolved";
  busyAction: string | null;
  clearResolved?: {
    busy: boolean;
    disabled: boolean;
    onClear: () => void;
  };
  emptyLabel: string;
  label: string;
  onAction: (requestId: string, action: StudioAdminAction) => void;
  onRetrySync: (requestId: string) => void;
  requests: StudioRequest[];
}

function StudioRequestSection({
  actionKind,
  busyAction,
  clearResolved,
  emptyLabel,
  label,
  onAction,
  onRetrySync,
  requests,
}: StudioRequestSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">{label}</p>
        {clearResolved && (
          <button
            type="button"
            className={`${actionButtonClass} border-neutral-800 text-neutral-500 hover:border-red-900/70 hover:text-red-300`}
            disabled={clearResolved.busy || clearResolved.disabled}
            onClick={clearResolved.onClear}
          >
            <Trash2 className="size-3" aria-hidden="true" />
            {clearResolved.busy ? "Clearing" : "Clear Resolved"}
          </button>
        )}
      </div>
      {requests.length === 0 ? (
        <p className="text-xs text-neutral-700">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <StudioRequestRow
              actionKind={actionKind}
              busyAction={busyAction}
              key={request.id}
              request={request}
              onAction={onAction}
              onRetrySync={onRetrySync}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface StudioRequestRowProps {
  actionKind: "approved" | "pending" | "resolved";
  busyAction: string | null;
  onAction: (requestId: string, action: StudioAdminAction) => void;
  onRetrySync: (requestId: string) => void;
  request: StudioRequest;
}

function StudioRequestRow({ actionKind, busyAction, onAction, onRetrySync, request }: StudioRequestRowProps) {
  return (
    <article className="border border-neutral-800 bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-sm text-neutral-100">{request.userName}</h3>
            {actionKind !== "pending" && <StudioStatusBadge status={request.status} />}
            <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${getSyncTone(request.discordSyncStatus)}`}>
              {request.discordSyncStatus}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">{request.userEmail}</p>
          <p className="mt-2 text-xs text-neutral-300">
            {formatDateTime(request.startsAt)} - {formatTime(request.endsAt)}
          </p>
          {request.memberNote && <p className="mt-2 text-[10px] text-neutral-500">Member note: {request.memberNote}</p>}
          {request.needsStudioManager && <p className="mt-2 text-[10px] text-blue-300">Studio manager help requested</p>}
          {request.adminNote && <p className="mt-1 text-[10px] text-neutral-400">Admin note: {request.adminNote}</p>}
          {request.discordChannelId && (
            <div className="mt-2 text-[10px] text-neutral-600">
              <p className="text-neutral-400">Discord channel: #{buildStudioChannelName(request)}</p>
              <p>ID {request.discordChannelId}</p>
            </div>
          )}
          {request.discordSyncError && (
            <p className="mt-2 max-w-3xl text-[10px] text-amber-400">{request.discordSyncError}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {actionKind === "pending" && (
            <>
              <button type="button" onClick={() => onAction(request.id, "approve")} className={`${actionButtonClass} border-green-900/60 text-green-300 hover:border-green-700 hover:bg-green-950/20`}>
                <Check className="size-3" aria-hidden="true" />
                Approve
              </button>
              <button type="button" onClick={() => onAction(request.id, "reject")} className={`${actionButtonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30`}>
                <X className="size-3" aria-hidden="true" />
                Reject
              </button>
            </>
          )}
          {actionKind === "approved" && (
            <>
              <button
                type="button"
                disabled={busyAction === `sync:${request.id}`}
                onClick={() => onRetrySync(request.id)}
                className={`${actionButtonClass} border-blue-900/60 text-blue-300 hover:border-blue-700 hover:bg-blue-950/20`}
              >
                <RefreshCcw className="size-3" aria-hidden="true" />
                {busyAction === `sync:${request.id}` ? "Syncing" : "Retry Sync"}
              </button>
              <button type="button" onClick={() => onAction(request.id, "cancel")} className={`${actionButtonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30`}>
                <X className="size-3" aria-hidden="true" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

interface StudioActionModalProps {
  action: StudioAdminAction;
  busy: boolean;
  error: string;
  note: string;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  request: StudioRequest;
}

function StudioActionModal({ action, busy, error, note, onClose, onNoteChange, onSubmit, request }: StudioActionModalProps) {
  const dialogRef = useModalDialog();

  return (
    <dialog
      aria-labelledby="studio-action-modal-title"
      className="fixed inset-0 z-[120] m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-4 text-left text-neutral-100 backdrop:bg-black/80 open:flex open:items-center open:justify-center"
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }

        onClose();
      }}
      ref={dialogRef}
    >
      <button type="button" aria-label="Close studio action dialog" className="absolute inset-0 cursor-default" disabled={busy} onClick={onClose} tabIndex={-1} />
      <div className="relative z-10 w-full max-w-sm border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-4 flex items-center gap-3">
          <CalendarCheck className="size-4 text-neutral-500" aria-hidden="true" />
          <h3 className="text-sm tracking-wider text-neutral-100" id="studio-action-modal-title">{getActionTitle(action)} Studio Request</h3>
        </div>
        <p className="mb-1 text-xs text-neutral-300">{request.userName}</p>
        <p className="mb-4 text-[10px] text-neutral-500">{formatDateTime(request.startsAt)} - {formatTime(request.endsAt)}</p>
        {error && (
          <p className="mb-4 border border-red-900/30 bg-red-900/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </p>
        )}
        <label className="mb-4 block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">Admin note (optional)</span>
          <input
            className={inputClass}
            maxLength={500}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder={action === "approve" ? "Setup, cleanup, or access note" : "Reason or message"}
            type="text"
            value={note}
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="button" disabled={busy} onClick={onSubmit} className={`${actionButtonClass} bg-white text-black hover:bg-neutral-200`}>
            {busy ? "Working" : getActionTitle(action)}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={`${actionButtonClass} border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200`}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface ClearResolvedModalProps {
  busy: boolean;
  count: number;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}

function ClearResolvedModal({ busy, count, error, onClose, onSubmit }: ClearResolvedModalProps) {
  const requestLabel = `resolved studio request${count === 1 ? "" : "s"}`;
  const dialogRef = useModalDialog();

  return (
    <dialog
      aria-describedby="clear-resolved-modal-description"
      aria-labelledby="clear-resolved-modal-title"
      className="fixed inset-0 z-[120] m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-4 text-left text-neutral-100 backdrop:bg-black/80 open:flex open:items-center open:justify-center"
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }

        onClose();
      }}
      ref={dialogRef}
    >
      <button type="button" aria-label="Close clear resolved dialog" className="absolute inset-0 cursor-default" disabled={busy} onClick={onClose} tabIndex={-1} />
      <div className="relative z-10 w-full max-w-sm border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Trash2 className="size-4 text-red-300" aria-hidden="true" />
          <h3 className="text-sm tracking-wider text-neutral-100" id="clear-resolved-modal-title">Clear Resolved Requests</h3>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-neutral-300" id="clear-resolved-modal-description">
          Clear {count} {requestLabel} from the admin list?
        </p>
        {error && (
          <p className="mb-4 border border-red-900/30 bg-red-900/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button type="button" disabled={busy} onClick={onSubmit} className={`${actionButtonClass} bg-white text-black hover:bg-neutral-200`}>
            {busy ? "Clearing" : "Clear"}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={`${actionButtonClass} border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200`}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}

function StudioStatusBadge({ status }: { status: StudioRequestStatus }) {
  const tone = {
    approved: "border-green-800 bg-green-950/20 text-green-300",
    cancelled: "border-neutral-700 bg-neutral-900 text-neutral-400",
    pending: "border-amber-800 bg-amber-950/20 text-amber-300",
    rejected: "border-red-800 bg-red-950/20 text-red-300",
  }[status];

  return (
    <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${tone}`}>
      {status}
    </span>
  );
}

function getSyncTone(status: StudioRequest["discordSyncStatus"]) {
  switch (status) {
    case "archived":
      return "border-neutral-700 bg-neutral-900/80 text-neutral-400";
    case "failed":
      return "border-amber-800 bg-amber-950/20 text-amber-300";
    case "synced":
      return "border-green-800 bg-green-950/20 text-green-300";
    default:
      return "border-neutral-700 bg-neutral-900 text-neutral-400";
  }
}

function getActionTitle(action: StudioAdminAction) {
  return action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Cancel";
}

function getActionSuccessMessage(action: StudioAdminAction) {
  return action === "approve"
    ? "Studio request approved."
    : action === "reject"
      ? "Studio request rejected."
      : "Studio request cancelled.";
}

function sortByStartsAtAsc(a: StudioRequest, b: StudioRequest) {
  return Date.parse(a.startsAt) - Date.parse(b.startsAt);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CLUB_TIME_ZONE,
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  });
}

function buildStudioChannelName(request: StudioRequest) {
  const startsAt = new Date(request.startsAt);
  const weekday = startsAt.toLocaleString("en-US", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "short",
  }).toLowerCase();
  const month = startsAt.toLocaleString("en-US", {
    month: "short",
    timeZone: CLUB_TIME_ZONE,
  }).toLowerCase();
  const day = startsAt.toLocaleString("en-US", {
    day: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  });
  const hour = startsAt.toLocaleString("en-US", {
    hour: "numeric",
    hour12: true,
    timeZone: CLUB_TIME_ZONE,
  }).toLowerCase().replace(/\s/g, "");
  const prefix = request.status === "cancelled" ? "cancelled-studio" : "studio";

  return sanitizeDiscordChannelName(`${prefix}-${weekday}-${month}-${day}-${hour}-${request.userName}`);
}

function sanitizeDiscordChannelName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "studio-reservation";
}
