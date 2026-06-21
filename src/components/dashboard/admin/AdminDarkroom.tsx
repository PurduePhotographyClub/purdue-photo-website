import { useReducer } from "react";
import useSWR from "swr";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage
} from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";
import AdminDarkroomSchedule from "@/components/dashboard/admin/AdminDarkroomSchedule";

interface FilmRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rollsRequested: number;
  reason: string | null;
  status: "pending" | "fulfilled" | "denied";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface CreditEntry {
  userId: string;
  remaining: number;
  userName: string;
  updatedAt: string;
}

type Tab = "requests" | "credits" | "schedule";

interface AdminDarkroomState {
  activeTab: Tab;
  error: string;
  success: string;
  resolveId: string | null;
  resolveAction: "fulfill" | "deny";
  resolveNote: string;
  resolving: boolean;
  adjustUserId: string;
  adjustAmount: string;
  adjusting: boolean;
}

const initialAdminDarkroomState: AdminDarkroomState = {
  activeTab: "requests",
  error: "",
  success: "",
  resolveId: null,
  resolveAction: "fulfill",
  resolveNote: "",
  resolving: false,
  adjustUserId: "",
  adjustAmount: "",
  adjusting: false,
};

const adminDarkroomInputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";

interface AdminDarkroomTabsProps {
  activeTab: Tab;
  pendingCount: number;
  onTabChange: (tab: Tab) => void;
}

function AdminDarkroomTabs({ activeTab, pendingCount, onTabChange }: AdminDarkroomTabsProps) {
  return (
    <div className="flex gap-1 border-b border-neutral-800">
      {(["requests", "schedule", "credits"] as const).map((tab) => (
        <button type="button"
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-5 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px ${
            activeTab === tab
              ? "border-neutral-400 text-neutral-200"
              : "border-transparent text-neutral-600 hover:text-neutral-400"
          }`}
        >
          {tab === "requests" ? "Film Requests" : tab === "schedule" ? "Schedule" : "Roll Credits"}
          {tab === "requests" && pendingCount > 0 && (
            <span className="ml-2 text-[9px] text-amber-400">({pendingCount})</span>
          )}
        </button>
      ))}
    </div>
  );
}

interface FilmRequestsPanelProps {
  pendingRequests: FilmRequest[];
  resolvedRequests: FilmRequest[];
  onResolve: (requestId: string, action: "fulfill" | "deny") => void;
}

function FilmRequestsPanel({ pendingRequests, resolvedRequests, onResolve }: FilmRequestsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">
          Pending Requests ({pendingRequests.length})
        </p>
        {pendingRequests.length === 0 ? (
          <p className="text-xs text-neutral-700">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white/[0.02] border border-neutral-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-200">{req.userName}</span>
                    <span className="text-[10px] text-neutral-600">{req.userEmail}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => onResolve(req.id, "fulfill")}
                      className="px-3 py-1.5 text-[10px] tracking-wider uppercase bg-green-900/20 border border-green-800 text-green-400 hover:bg-green-900/40 transition-colors"
                    >
                      Accept
                    </button>
                    <button type="button"
                      onClick={() => onResolve(req.id, "deny")}
                      className="px-3 py-1.5 text-[10px] tracking-wider uppercase bg-red-900/20 border border-red-800 text-red-400 hover:bg-red-900/40 transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">{req.rollsRequested} roll{req.rollsRequested !== 1 ? "s" : ""} requested</span>
                  <span className="text-[10px] text-neutral-700">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                {req.reason && (
                  <p className="text-[10px] text-neutral-500 mt-1">Reason: {req.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {resolvedRequests.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">
            Resolved ({resolvedRequests.length})
          </p>
          <div className="space-y-2">
            {resolvedRequests.map((req) => (
              <div key={req.id} className="bg-white/[0.02] border border-neutral-800 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-300">{req.userName}</span>
                    <span className="text-xs text-neutral-500">{req.rollsRequested} roll{req.rollsRequested !== 1 ? "s" : ""}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 border uppercase tracking-wider ${
                      req.status === "fulfilled"
                        ? "border-green-800 text-green-400 bg-green-900/20"
                        : "border-red-800 text-red-400 bg-red-900/20"
                    }`}>
                      {req.status === "fulfilled" ? "accepted" : req.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-700">
                    {req.resolvedAt ? new Date(req.resolvedAt).toLocaleDateString() : ""}
                  </span>
                </div>
                {req.reason && <p className="text-[10px] text-neutral-600">Reason: {req.reason}</p>}
                {req.adminNote && <p className="text-[10px] text-neutral-500 italic">Note: {req.adminNote}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RollCreditsPanelProps {
  adjustAmount: string;
  adjusting: boolean;
  adjustUserId: string;
  credits: CreditEntry[];
  inputClass: string;
  onAdjust: (event: React.FormEvent) => void;
  onAmountChange: (value: string) => void;
  onUserChange: (value: string) => void;
}

function RollCreditsPanel({
  adjustAmount,
  adjusting,
  adjustUserId,
  credits,
  inputClass,
  onAdjust,
  onAmountChange,
  onUserChange,
}: RollCreditsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.02] border border-neutral-800 p-6">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-5">Manually Set Credits</p>
        <form onSubmit={onAdjust} className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="AdminDarkroom-member" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Member</label>
            <select id="AdminDarkroom-member"
              value={adjustUserId}
              onChange={(e) => onUserChange(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none"
            >
              <option value="">Select member</option>
              {credits.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.userName}, {c.remaining} rolls
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label htmlFor="AdminDarkroom-set-to" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Set To</label>
            <input id="AdminDarkroom-set-to" aria-label="0"
              type="number"
              min={0}
              max={999}
              value={adjustAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={adjusting || !adjustUserId || !adjustAmount}
            className="px-6 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {adjusting ? "Saving" : "Set Credits"}
          </button>
        </form>
      </div>

      <div>
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">
          All Member Credits ({credits.length})
        </p>
        {credits.length === 0 ? (
          <p className="text-xs text-neutral-700">No roll credits found.</p>
        ) : (
          <div className="space-y-2">
            {credits
              .toSorted((a, b) => a.userName.localeCompare(b.userName))
              .map((c) => (
                <div key={c.userId} className="bg-white/[0.02] border border-neutral-800 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-neutral-200">{c.userName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${c.remaining <= 3 ? "text-red-400" : c.remaining <= 5 ? "text-amber-400" : "text-neutral-200"}`}>
                      {c.remaining} rolls
                    </span>
                    <span className="text-[10px] text-neutral-700">
                      Updated {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ResolveRequestModalProps {
  inputClass: string;
  note: string;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onResolve: () => void;
  resolving: boolean;
  resolveAction: "fulfill" | "deny";
  target: FilmRequest;
}

function ResolveRequestModal({
  inputClass,
  note,
  onClose,
  onNoteChange,
  onResolve,
  resolving,
  resolveAction,
  target,
}: ResolveRequestModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <button type="button" aria-label="Close request resolution dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 bg-neutral-950 border border-neutral-800 p-6 max-w-sm w-full">
        <h3 className={`text-sm tracking-wider mb-4 ${resolveAction === "fulfill" ? "text-green-400" : "text-red-400"}`}>
          {resolveAction === "fulfill" ? "Accept" : "Deny"} Request
        </h3>
        <p className="text-xs text-neutral-400 mb-2">
          {target.userName}, {target.rollsRequested} roll{target.rollsRequested !== 1 ? "s" : ""}
        </p>
        {resolveAction === "fulfill" && (
          <p className="text-[10px] text-neutral-500 mb-4">
            This will add {target.rollsRequested} roll{target.rollsRequested !== 1 ? "s" : ""} to their credits.
          </p>
        )}
        <div className="mb-4">
          <label htmlFor="AdminDarkroom-note-optional" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Note (optional)</label>
          <input id="AdminDarkroom-note-optional" aria-label="Reason or message"
            type="text"
            placeholder="Reason or message"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={onResolve}
            disabled={resolving}
            className={`px-4 py-2 text-[10px] tracking-wider uppercase text-white transition-colors disabled:opacity-50 ${
              resolveAction === "fulfill" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {resolving ? "Processing" : resolveAction === "fulfill" ? "Accept" : "Deny"}
          </button>
          <button type="button"
            onClick={onClose}
            disabled={resolving}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDarkroom() {
  const [state, dispatchState] = useReducer(
    keyedStateReducer<AdminDarkroomState>,
    initialAdminDarkroomState,
  );
  const {
    activeTab,
    error,
    success,
    resolveId,
    resolveAction,
    resolveNote,
    resolving,
    adjustUserId,
    adjustAmount,
    adjusting,
  } = state;
  const setActiveTab = createKeyedStateSetter(dispatchState, "activeTab");
  const setError = createKeyedStateSetter(dispatchState, "error");
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setResolveId = createKeyedStateSetter(dispatchState, "resolveId");
  const setResolveAction = createKeyedStateSetter(dispatchState, "resolveAction");
  const setResolveNote = createKeyedStateSetter(dispatchState, "resolveNote");
  const setResolving = createKeyedStateSetter(dispatchState, "resolving");
  const setAdjustUserId = createKeyedStateSetter(dispatchState, "adjustUserId");
  const setAdjustAmount = createKeyedStateSetter(dispatchState, "adjustAmount");
  const setAdjusting = createKeyedStateSetter(dispatchState, "adjusting");

  const {
    data: requests = [],
    error: requestsError,
    isLoading: requestsLoading,
    mutate: mutateRequests,
  } = useSWR<FilmRequest[]>("/api/admin/darkroom", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const {
    data: credits = [],
    error: creditsError,
    isLoading: creditsLoading,
    mutate: mutateCredits,
  } = useSWR<CreditEntry[]>("/api/darkroom/credits?all=true", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const loading = requestsLoading || creditsLoading;
  const loadError = requestsError || creditsError;

  const refreshAll = async () => {
    await Promise.all([mutateRequests(), mutateCredits()]);
  };

  const handleResolve = async () => {
    if (!resolveId) return;
    setResolving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetchApi("/api/admin/darkroom", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: resolveId, action: resolveAction, adminNote: resolveNote || null }),
      });
      if (res.ok) {
        setSuccess(`Request ${resolveAction === "fulfill" ? "accepted" : "denied"}.`);
        setResolveId(null);
        setResolveNote("");
        void refreshAll();
      } else {
        setError(await readErrorMessage(res, "Failed to process request."));
      }
    } catch {
      setError("Failed to process request.");
    } finally {
      setResolving(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount) return;
    setAdjusting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetchApi("/api/darkroom/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adjustUserId, amount: parseInt(adjustAmount, 10) }),
      });
      if (res.ok) {
        setSuccess("Roll credits adjusted.");
        setAdjustUserId("");
        setAdjustAmount("");
        void refreshAll();
      } else {
        setError(await readErrorMessage(res, "Failed to adjust credits."));
      }
    } catch {
      setError("Failed to adjust credits.");
    } finally {
      setAdjusting(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");
  const resolveTarget = requests.find((r) => r.id === resolveId);
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError("");
    setSuccess("");
  };
  const openResolveModal = (requestId: string, action: "fulfill" | "deny") => {
    setResolveId(requestId);
    setResolveAction(action);
  };

  if (loading) return <p className="text-xs text-neutral-500">Loading</p>;

  return (
    <div className="space-y-6">
      {(error || loadError) && <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 px-4 py-3">{error || "Failed to load darkroom data."}</p>}
      {success && <p className="text-xs text-green-400 bg-green-900/10 border border-green-900/30 px-4 py-3">{success}</p>}

      <AdminDarkroomTabs activeTab={activeTab} pendingCount={pendingRequests.length} onTabChange={handleTabChange} />

      {activeTab === "schedule" ? (
        <AdminDarkroomSchedule />
      ) : activeTab === "requests" ? (
        <FilmRequestsPanel
          pendingRequests={pendingRequests}
          resolvedRequests={resolvedRequests}
          onResolve={openResolveModal}
        />
      ) : (
        <RollCreditsPanel
          adjustAmount={adjustAmount}
          adjusting={adjusting}
          adjustUserId={adjustUserId}
          credits={credits}
          inputClass={adminDarkroomInputClass}
          onAdjust={handleAdjust}
          onAmountChange={setAdjustAmount}
          onUserChange={setAdjustUserId}
        />
      )}

      {resolveId && resolveTarget && (
        <ResolveRequestModal
          inputClass={adminDarkroomInputClass}
          note={resolveNote}
          onClose={() => setResolveId(null)}
          onNoteChange={setResolveNote}
          onResolve={handleResolve}
          resolving={resolving}
          resolveAction={resolveAction}
          target={resolveTarget}
        />
      )}
    </div>
  );
}
