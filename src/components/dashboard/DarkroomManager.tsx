import {
  useReducer,
  useEffect,
  useRef,
  useMemo,
  useCallback
} from "react";
import type { FormEvent, RefObject } from "react";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import DarkroomScheduleCalendar from "@/components/dashboard/DarkroomScheduleCalendar";
import { fetchApi, readErrorMessage, readJson } from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

interface Stats {
  totalDeveloped: number;
  c41: number;
  bw: number;
  slide: number;
  topStocks: { name: string; rolls: number }[];
  topDevelopers: { name: string; rolls: number }[];
  format35mm: number;
  format120: number;
}

interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  filmStockName: string;
  process: string;
  format: string;
  rollCount: number;
  isoShotAt: number | null;
  expired: boolean;
  pushPull: number;
  notes: string | null;
  createdAt: string;
}

interface FilmStockOption {
  id: string;
  name: string;
  brand: string | null;
  iso: number | null;
  process: string;
}

interface FilmRequestEntry {
  id: string;
  rollsRequested: number;
  reason: string | null;
  status: "pending" | "fulfilled" | "denied";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
}

interface DarkroomResponse {
  stats: Stats;
  recentLogs?: LogEntry[];
}

interface CreditsResponse {
  remaining?: number | null;
}

interface LogResponse {
  remainingCredits: number;
}

interface Props {
  userRole: string;
  userTier: string | null;
}

const medals = ["🥇", "🥈", "🥉"];

type Tab = "logs" | "requests" | "schedule";

interface DarkroomManagerState {
  activeTab: Tab;
  stats: Stats | null;
  recentLogs: LogEntry[];
  filmStocks: FilmStockOption[];
  credits: number | null;
  loading: boolean;
  error: string;
  success: string;
  filmStockId: string;
  filmSearch: string;
  showDropdown: boolean;
  format: "35mm" | "120";
  rollCount: number;
  isoShotAt: string;
  expired: boolean;
  pushPull: number;
  notes: string;
  submitting: boolean;
  showAddFilm: boolean;
  newFilmName: string;
  newFilmBrand: string;
  newFilmIso: string;
  newFilmProcess: string;
  addingFilm: boolean;
  deleteLogId: string | null;
  deletingLog: boolean;
  filmRequests: FilmRequestEntry[];
  requestRolls: number;
  requestReason: string;
  submittingRequest: boolean;
}

const initialDarkroomManagerState: DarkroomManagerState = {
  activeTab: "logs",
  stats: null,
  recentLogs: [],
  filmStocks: [],
  credits: null,
  loading: true,
  error: "",
  success: "",
  filmStockId: "",
  filmSearch: "",
  showDropdown: false,
  format: "35mm",
  rollCount: 1,
  isoShotAt: "",
  expired: false,
  pushPull: 0,
  notes: "",
  submitting: false,
  showAddFilm: false,
  newFilmName: "",
  newFilmBrand: "",
  newFilmIso: "",
  newFilmProcess: "C-41",
  addingFilm: false,
  deleteLogId: null,
  deletingLog: false,
  filmRequests: [],
  requestRolls: 5,
  requestReason: "",
  submittingRequest: false,
};

export default function DarkroomManager(props: Props) {
  const viewModel = useDarkroomManagerViewModel(props);

  if (viewModel.loading) {
    return <DarkroomLoadingSkeleton />;
  }

  return <DarkroomManagerContent viewModel={viewModel} />;
}

function useDarkroomManagerViewModel({ userRole, userTier }: Props) {
  const [state, dispatchState] = useReducer(
    keyedStateReducer<DarkroomManagerState>,
    initialDarkroomManagerState,
  );
  const {
    activeTab,
    stats,
    recentLogs,
    filmStocks,
    credits,
    loading,
    error,
    success,
    filmStockId,
    filmSearch,
    showDropdown,
    format,
    rollCount,
    isoShotAt,
    expired,
    pushPull,
    notes,
    submitting,
    showAddFilm,
    newFilmName,
    newFilmBrand,
    newFilmIso,
    newFilmProcess,
    addingFilm,
    deleteLogId,
    deletingLog,
    filmRequests,
    requestRolls,
    requestReason,
    submittingRequest,
  } = state;
  const {
    setActiveTab,
    setStats,
    setRecentLogs,
    setFilmStocks,
    setCredits,
    setLoading,
    setError,
    setSuccess,
    setFilmStockId,
    setFilmSearch,
    setShowDropdown,
    setFormat,
    setRollCount,
    setIsoShotAt,
    setExpired,
    setPushPull,
    setNotes,
    setSubmitting,
    setShowAddFilm,
    setNewFilmName,
    setNewFilmBrand,
    setNewFilmIso,
    setNewFilmProcess,
    setAddingFilm,
    setDeleteLogId,
    setDeletingLog,
    setFilmRequests,
    setRequestRolls,
    setRequestReason,
    setSubmittingRequest,
  } = useMemo(() => ({
    setActiveTab: createKeyedStateSetter(dispatchState, "activeTab"),
    setStats: createKeyedStateSetter(dispatchState, "stats"),
    setRecentLogs: createKeyedStateSetter(dispatchState, "recentLogs"),
    setFilmStocks: createKeyedStateSetter(dispatchState, "filmStocks"),
    setCredits: createKeyedStateSetter(dispatchState, "credits"),
    setLoading: createKeyedStateSetter(dispatchState, "loading"),
    setError: createKeyedStateSetter(dispatchState, "error"),
    setSuccess: createKeyedStateSetter(dispatchState, "success"),
    setFilmStockId: createKeyedStateSetter(dispatchState, "filmStockId"),
    setFilmSearch: createKeyedStateSetter(dispatchState, "filmSearch"),
    setShowDropdown: createKeyedStateSetter(dispatchState, "showDropdown"),
    setFormat: createKeyedStateSetter(dispatchState, "format"),
    setRollCount: createKeyedStateSetter(dispatchState, "rollCount"),
    setIsoShotAt: createKeyedStateSetter(dispatchState, "isoShotAt"),
    setExpired: createKeyedStateSetter(dispatchState, "expired"),
    setPushPull: createKeyedStateSetter(dispatchState, "pushPull"),
    setNotes: createKeyedStateSetter(dispatchState, "notes"),
    setSubmitting: createKeyedStateSetter(dispatchState, "submitting"),
    setShowAddFilm: createKeyedStateSetter(dispatchState, "showAddFilm"),
    setNewFilmName: createKeyedStateSetter(dispatchState, "newFilmName"),
    setNewFilmBrand: createKeyedStateSetter(dispatchState, "newFilmBrand"),
    setNewFilmIso: createKeyedStateSetter(dispatchState, "newFilmIso"),
    setNewFilmProcess: createKeyedStateSetter(dispatchState, "newFilmProcess"),
    setAddingFilm: createKeyedStateSetter(dispatchState, "addingFilm"),
    setDeleteLogId: createKeyedStateSetter(dispatchState, "deleteLogId"),
    setDeletingLog: createKeyedStateSetter(dispatchState, "deletingLog"),
    setFilmRequests: createKeyedStateSetter(dispatchState, "filmRequests"),
    setRequestRolls: createKeyedStateSetter(dispatchState, "requestRolls"),
    setRequestReason: createKeyedStateSetter(dispatchState, "requestReason"),
    setSubmittingRequest: createKeyedStateSetter(dispatchState, "submittingRequest"),
  }), [dispatchState]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasStaffAccess = userRole === "admin" || userRole === "officer";
  const canLog = hasStaffAccess || userTier === "facilities";
  const canSchedule = hasStaffAccess || userTier === "facilities";

  const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";
  const selectClass = "bg-neutral-950 border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, stocksRes, creditsRes, requestsRes] = await Promise.all([
        fetchApi("/api/darkroom"),
        fetchApi("/api/darkroom/film-stocks"),
        canLog ? fetchApi("/api/darkroom/credits") : Promise.resolve(null),
        fetchApi("/api/darkroom/requests"),
      ]);

      if (!statsRes.ok) throw new Error("Stats failed");
      const statsData = await readJson<DarkroomResponse>(statsRes);
      setStats(statsData.stats);
      setRecentLogs(statsData.recentLogs || []);

      if (stocksRes.ok) {
        setFilmStocks(await readJson<FilmStockOption[]>(stocksRes));
      }

      if (creditsRes && creditsRes.ok) {
        const creditsData = await readJson<CreditsResponse>(creditsRes);
        setCredits(creditsData.remaining ?? null);
      }

      if (requestsRes.ok) {
        setFilmRequests(await readJson<FilmRequestEntry[]>(requestsRes));
      }
    } catch {
      setError("Failed to load darkroom data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [canLog, setCredits, setError, setFilmRequests, setFilmStocks, setLoading, setRecentLogs, setStats]);

  useEffect(() => {
    void fetchAll();
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [fetchAll, setShowDropdown]);

  const filteredStocks = useMemo(() => {
    if (!filmSearch.trim()) return filmStocks;
    const q = filmSearch.toLowerCase();
    return filmStocks.filter((s) => s.name.toLowerCase().includes(q));
  }, [filmSearch, filmStocks]);

  const handleSubmitLog = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!filmStockId) { setError("Please select a film stock."); return; }
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await fetchApi("/api/darkroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmStockId, format, rollCount, isoShotAt: isoShotAt || null, expired, pushPull, notes: notes || null }),
      });
      if (res.ok) {
        const data = await readJson<LogResponse>(res);
        setSuccess("Development logged successfully!");
        setCredits(data.remainingCredits);
        resetForm();
        fetchAll();
      } else {
        setError(await readErrorMessage(res, "Failed to submit log."));
      }
    } catch {
      setError("Failed to submit log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!deleteLogId) return;
    setDeletingLog(true);
    setError("");
    try {
      const res = await fetchApi(`/api/darkroom/${deleteLogId}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Log entry deleted.");
        setDeleteLogId(null);
        fetchAll();
      } else {
        setError(await readErrorMessage(res, "Failed to delete log."));
      }
    } catch {
      setError("Failed to delete log. Please try again.");
    } finally {
      setDeletingLog(false);
    }
  };

  const handleAddFilmStock = async () => {
    setError("");
    setAddingFilm(true);
    try {
      const res = await fetchApi("/api/darkroom/film-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFilmName, brand: newFilmBrand || null, iso: newFilmIso || null, process: newFilmProcess }),
      });
      if (res.ok) {
        const stock = await readJson<FilmStockOption>(res);
        setFilmStocks((prev) => [...prev, stock].sort((a, b) => a.name.localeCompare(b.name)));
        setFilmStockId(stock.id);
        setFilmSearch(stock.name);
        setNewFilmName("");
        setNewFilmBrand("");
        setNewFilmIso("");
        setShowAddFilm(false);
        setShowDropdown(false);
        setSuccess("Film stock added!");
      } else {
        setError(await readErrorMessage(res, "Failed to add film stock."));
      }
    } catch {
      setError("Failed to add film stock.");
    } finally {
      setAddingFilm(false);
    }
  };

  const resetForm = () => {
    setFilmStockId("");
    setFilmSearch("");
    setFormat("35mm");
    setRollCount(1);
    setIsoShotAt("");
    setExpired(false);
    setPushPull(0);
    setNotes("");
  };

  const selectedStock = filmStocks.find((s) => s.id === filmStockId);

  const handleSubmitRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmittingRequest(true);
    try {
      const res = await fetchApi("/api/darkroom/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollsRequested: requestRolls, reason: requestReason || null }),
      });
      if (res.ok) {
        setSuccess("Film request submitted! An officer will review it soon.");
        setRequestRolls(5);
        setRequestReason("");
        fetchAll();
      } else {
        setError(await readErrorMessage(res, "Failed to submit request."));
      }
    } catch {
      setError("Failed to submit request. Please try again.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const hasPendingRequest = filmRequests.some((r) => r.status === "pending");

  return {
    activeTab,
    addingFilm,
    canLog,
    canSchedule,
    credits,
    deleteLogId,
    deletingLog,
    dropdownRef,
    error,
    expired,
    filmRequests,
    filmSearch,
    filmStockId,
    filteredStocks,
    format,
    handleAddFilmStock,
    handleDeleteLog,
    handleSubmitLog,
    handleSubmitRequest,
    hasPendingRequest,
    inputClass,
    isoShotAt,
    loading,
    newFilmBrand,
    newFilmIso,
    newFilmName,
    newFilmProcess,
    notes,
    pushPull,
    recentLogs,
    requestReason,
    requestRolls,
    rollCount,
    selectedStock,
    selectClass,
    setActiveTab,
    setDeleteLogId,
    setError,
    setExpired,
    setFilmSearch,
    setFilmStockId,
    setFormat,
    setIsoShotAt,
    setNewFilmBrand,
    setNewFilmIso,
    setNewFilmName,
    setNewFilmProcess,
    setNotes,
    setPushPull,
    setRequestReason,
    setRequestRolls,
    setRollCount,
    setShowAddFilm,
    setShowDropdown,
    setSuccess,
    showAddFilm,
    showDropdown,
    stats,
    submitting,
    submittingRequest,
    success,
    userRole,
  };
}

function DarkroomManagerContent({ viewModel }: { viewModel: ReturnType<typeof useDarkroomManagerViewModel> }) {
  const {
    activeTab,
    addingFilm,
    canLog,
    canSchedule,
    credits,
    deleteLogId,
    deletingLog,
    dropdownRef,
    error,
    expired,
    filmRequests,
    filmSearch,
    filmStockId,
    filteredStocks,
    format,
    handleAddFilmStock,
    handleDeleteLog,
    handleSubmitLog,
    handleSubmitRequest,
    hasPendingRequest,
    inputClass,
    isoShotAt,
    newFilmBrand,
    newFilmIso,
    newFilmName,
    newFilmProcess,
    notes,
    pushPull,
    recentLogs,
    requestReason,
    requestRolls,
    rollCount,
    selectedStock,
    selectClass,
    setActiveTab,
    setDeleteLogId,
    setError,
    setExpired,
    setFilmSearch,
    setFilmStockId,
    setFormat,
    setIsoShotAt,
    setNewFilmBrand,
    setNewFilmIso,
    setNewFilmName,
    setNewFilmProcess,
    setNotes,
    setPushPull,
    setRequestReason,
    setRequestRolls,
    setRollCount,
    setShowAddFilm,
    setShowDropdown,
    setSuccess,
    showAddFilm,
    showDropdown,
    stats,
    submitting,
    submittingRequest,
    success,
    userRole,
  } = viewModel;

  return (
    <div className="space-y-8">
      <StatusMessages error={error} success={success} />
      <RollCreditsBanner
        activeTab={activeTab}
        credits={credits}
        onRequestRolls={() => {
          setActiveTab("requests");
          setError("");
          setSuccess("");
        }}
      />
      <DarkroomTabs
        activeTab={activeTab}
        hasPendingRequest={hasPendingRequest}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setError("");
          setSuccess("");
        }}
      />

      {activeTab === "schedule" ? (
        <DarkroomScheduleCalendar canSchedule={canSchedule} />
      ) : activeTab === "requests" ? (
        <FilmRequestsPanel
          canLog={canLog}
          filmRequests={filmRequests}
          hasPendingRequest={hasPendingRequest}
          inputClass={inputClass}
          requestReason={requestReason}
          requestRolls={requestRolls}
          submittingRequest={submittingRequest}
          onRequestReasonChange={setRequestReason}
          onRequestRollsChange={setRequestRolls}
          onSubmitRequest={handleSubmitRequest}
        />
      ) : (
        <>
          <DevelopmentStats stats={stats} />
          <DevelopmentLogPanel
            addingFilm={addingFilm}
            canLog={canLog}
            dropdownRef={dropdownRef}
            expired={expired}
            filmSearch={filmSearch}
            filmStockId={filmStockId}
            filteredStocks={filteredStocks}
            format={format}
            inputClass={inputClass}
            isoShotAt={isoShotAt}
            newFilmBrand={newFilmBrand}
            newFilmIso={newFilmIso}
            newFilmName={newFilmName}
            newFilmProcess={newFilmProcess}
            notes={notes}
            pushPull={pushPull}
            rollCount={rollCount}
            selectedStock={selectedStock}
            selectClass={selectClass}
            showAddFilm={showAddFilm}
            showDropdown={showDropdown}
            submitting={submitting}
            onAddFilmStock={handleAddFilmStock}
            onExpiredChange={setExpired}
            onFilmBrandChange={setNewFilmBrand}
            onFilmIsoChange={setNewFilmIso}
            onFilmNameChange={setNewFilmName}
            onFilmProcessChange={setNewFilmProcess}
            onFilmSearchChange={(value) => {
              setFilmSearch(value);
              setFilmStockId("");
              setShowDropdown(true);
            }}
            onFormatChange={setFormat}
            onHideAddFilm={() => setShowAddFilm(false)}
            onIsoShotAtChange={setIsoShotAt}
            onNotesChange={setNotes}
            onOpenAddFilm={() => {
              setShowAddFilm(true);
              setShowDropdown(false);
            }}
            onPushPullChange={setPushPull}
            onRollCountChange={setRollCount}
            onSelectStock={(stock) => {
              setFilmStockId(stock.id);
              setFilmSearch(stock.name);
              setShowDropdown(false);
            }}
            onShowDropdownChange={setShowDropdown}
            onSubmitLog={handleSubmitLog}
          />
          <RecentDevelopmentLogs
            canLog={canLog}
            recentLogs={recentLogs}
            userRole={userRole}
            onDeleteLog={setDeleteLogId}
          />
        </>
      )}
      <DeleteLogModal
        deleteLogId={deleteLogId}
        deletingLog={deletingLog}
        onCancel={() => setDeleteLogId(null)}
        onDelete={handleDeleteLog}
      />
    </div>
  );
}

function DarkroomLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] border border-neutral-800 p-6 animate-pulse">
          <div className="h-4 bg-neutral-800 rounded w-1/3 mb-4" />
          <div className="h-20 bg-neutral-800/50 rounded" />
        </div>
      ))}
    </div>
  );
}

function StatusMessages({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 px-4 py-3">{error}</p>}
      {success && <p className="text-xs text-green-400 bg-green-900/10 border border-green-900/30 px-4 py-3">{success}</p>}
    </>
  );
}

interface RollCreditsBannerProps {
  activeTab: Tab;
  credits: number | null;
  onRequestRolls: () => void;
}

function RollCreditsBanner({ activeTab, credits, onRequestRolls }: RollCreditsBannerProps) {
  if (credits === null) return null;

  return (
    <div className={`flex items-center justify-between p-5 border ${
      credits <= 3 ? "border-red-800 bg-red-900/10" : credits <= 5 ? "border-amber-800 bg-amber-900/10" : "border-neutral-800 bg-white/[0.02]"
    }`}>
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-1">Roll Credits</p>
          <p className={`text-3xl font-light ${
            credits <= 3 ? "text-red-400" : credits <= 5 ? "text-amber-400" : "text-neutral-100"
          }`} style={{ fontFamily: "'Playfair Display', serif" }}>{credits}</p>
        </div>
        <p className="text-[10px] text-neutral-600">
          {credits <= 3 ? "Running low, request more rolls below" : credits <= 5 ? "Consider requesting more before you run out": ""}
        </p>
      </div>
      {credits <= 5 && activeTab !== "requests" && (
        <button type="button"
          onClick={onRequestRolls}
          className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-neutral-700 text-neutral-400 hover:border-white hover:text-white transition-colors"
        >
          Request Rolls
        </button>
      )}
    </div>
  );
}

interface DarkroomTabsProps {
  activeTab: Tab;
  hasPendingRequest: boolean;
  onSelectTab: (tab: Tab) => void;
}

function DarkroomTabs({ activeTab, hasPendingRequest, onSelectTab }: DarkroomTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-800">
      {(["logs", "schedule", "requests"] as const).map((tab) => (
        <button type="button"
          key={tab}
          onClick={() => onSelectTab(tab)}
          className={`px-5 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px ${
            activeTab === tab
              ? "border-neutral-400 text-neutral-200"
              : "border-transparent text-neutral-600 hover:text-neutral-400"
          }`}
        >
          {tab === "logs" ? "Development" : tab === "schedule" ? "Schedule" : "Film Requests"}
          {tab === "requests" && hasPendingRequest && (
            <span className="ml-2 inline-block size-1.5 bg-amber-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}

interface FilmRequestsPanelProps {
  canLog: boolean;
  filmRequests: FilmRequestEntry[];
  hasPendingRequest: boolean;
  inputClass: string;
  requestReason: string;
  requestRolls: number;
  submittingRequest: boolean;
  onRequestReasonChange: (value: string) => void;
  onRequestRollsChange: (value: number) => void;
  onSubmitRequest: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

function FilmRequestsPanel({
  canLog,
  filmRequests,
  hasPendingRequest,
  inputClass,
  requestReason,
  requestRolls,
  submittingRequest,
  onRequestReasonChange,
  onRequestRollsChange,
  onSubmitRequest,
}: FilmRequestsPanelProps) {
  return (
    <div className="space-y-8">
      {canLog && !hasPendingRequest && (
        <div className="bg-white/[0.02] border border-neutral-800 p-6">
          <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-5">Request More Film Rolls</p>
          <form onSubmit={onSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="DarkroomManager-number-of-rolls" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Number of Rolls</label>
                <input id="DarkroomManager-number-of-rolls"
                  type="number"
                  min={1}
                  max={50}
                  value={requestRolls}
                  onChange={(e) => onRequestRollsChange(parseInt(e.target.value) || 1)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="DarkroomManager-reason-optional" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Reason (optional)</label>
                <input id="DarkroomManager-reason-optional" aria-label="Why do you need more rolls?"
                  type="text"
                  placeholder="Why do you need more rolls?"
                  value={requestReason}
                  onChange={(e) => onRequestReasonChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingRequest}
              className="px-6 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {submittingRequest ? "Submitting" : "Submit Request"}
            </button>
          </form>
        </div>
      )}

      {hasPendingRequest && (
        <div className="bg-amber-900/10 border border-amber-900/30 px-4 py-3">
          <p className="text-xs text-amber-400">You have a pending request. Please wait for it to be reviewed before submitting another.</p>
        </div>
      )}

      {!canLog && (
        <AccessUpsellPanel
          eyebrow="Darkroom unlock"
          title="Request film rolls"
          description="Darkroom access lets you request film rolls and keep your workflow moving through the club lab."
          ctaLabel="Buy Membership"
        />
      )}

      <div>
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">Your Requests</p>
        {filmRequests.length === 0 ? (
          <p className="text-xs text-neutral-700">No film requests yet.</p>
        ) : (
          <div className="space-y-2">
            {filmRequests.map((req) => (
              <FilmRequestCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilmRequestCard({ request }: { request: FilmRequestEntry }) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-200">{request.rollsRequested} roll{request.rollsRequested !== 1 ? "s" : ""}</span>
          <span className={`text-[9px] px-1.5 py-0.5 border uppercase tracking-wider ${
            request.status === "pending"
              ? "border-amber-800 text-amber-400 bg-amber-900/20"
              : request.status === "fulfilled"
              ? "border-green-800 text-green-400 bg-green-900/20"
              : "border-red-800 text-red-400 bg-red-900/20"
          }`}>
            {request.status === "fulfilled" ? "accepted" : request.status}
          </span>
        </div>
        <span className="text-[10px] text-neutral-700">{new Date(request.createdAt).toLocaleDateString()}</span>
      </div>
      {request.reason && (
        <p className="text-[10px] text-neutral-500 mb-1">Reason: {request.reason}</p>
      )}
      {request.adminNote && (
        <p className="text-[10px] text-neutral-400 italic">Note: {request.adminNote}</p>
      )}
      {request.resolvedAt && (
        <p className="text-[10px] text-neutral-700 mt-1">
          Resolved {new Date(request.resolvedAt).toLocaleDateString()}
          {request.resolvedByName && ` by ${request.resolvedByName}`}
        </p>
      )}
    </div>
  );
}

function DevelopmentStats({ stats }: { stats: Stats | null }) {
  const topStocks = stats?.topStocks ?? [];
  const topDevelopers = stats?.topDevelopers ?? [];
  const totalFormatRolls = (stats?.format35mm ?? 0) + (stats?.format120 ?? 0);
  const pct35 = totalFormatRolls > 0 ? Math.round(((stats?.format35mm ?? 0) / totalFormatRolls) * 100) : 0;
  const pct120 = totalFormatRolls > 0 ? 100 - pct35 : 0;

  return (
    <div>
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">Film Developed Since Fall 2025</p>

      <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Total Developed" value={stats?.totalDeveloped ?? 0} helper="C-41 + B&W + Slide" />
        <StatCard label="C-41" value={stats?.c41 ?? 0} />
        <StatCard label="B&W" value={stats?.bw ?? 0} />
        <StatCard label="E-6 / Slide" value={stats?.slide ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <LeaderboardCard
          emptyLabel="No data yet"
          label="Top 5 Film Stocks"
          rows={topStocks.map((stock, index) => ({
            key: stock.name,
            label: stock.name,
            prefix: `#${index + 1}`,
            value: `${stock.rolls} rolls`,
          }))}
        />
        <LeaderboardCard
          emptyLabel="No data yet"
          label="Top Developers"
          rows={topDevelopers.map((developer, index) => ({
            key: developer.name,
            label: developer.name,
            prefix: medals[index] || "  ",
            value: `${developer.rolls} rolls`,
          }))}
        />
        <FormatBreakdownCard
          pct120={pct120}
          pct35={pct35}
          stats={stats}
          totalFormatRolls={totalFormatRolls}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-5">
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-1">{label}</p>
      <p className="text-3xl text-neutral-100 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
      {helper && <p className="text-[9px] text-neutral-700 mt-1">{helper}</p>}
    </div>
  );
}

interface LeaderboardCardProps {
  emptyLabel: string;
  label: string;
  rows: { key: string; label: string; prefix: string; value: string }[];
}

function LeaderboardCard({ emptyLabel, label, rows }: LeaderboardCardProps) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-5">
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">{label}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-700">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between items-center py-1.5 border-b border-neutral-800/50 last:border-0">
              <span className="text-xs text-neutral-400"><span className="text-neutral-600 mr-2">{row.prefix}</span>{row.label}</span>
              <span className="text-xs text-neutral-500">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FormatBreakdownCardProps {
  pct120: number;
  pct35: number;
  stats: Stats | null;
  totalFormatRolls: number;
}

function FormatBreakdownCard({ pct120, pct35, stats, totalFormatRolls }: FormatBreakdownCardProps) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-5">
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">35mm vs Medium Format</p>
      {totalFormatRolls === 0 ? (
        <p className="text-xs text-neutral-700">No data yet</p>
      ) : (
        <div className="space-y-3">
          <FormatProgress label="35mm" pct={pct35} rolls={stats?.format35mm ?? 0} tone="light" />
          <FormatProgress label="120 Medium Format" pct={pct120} rolls={stats?.format120 ?? 0} tone="medium" />
        </div>
      )}
    </div>
  );
}

function FormatProgress({ label, pct, rolls, tone }: { label: string; pct: number; rolls: number; tone: "light" | "medium" }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
        <span>{label}</span>
        <span>{rolls} ({pct}%)</span>
      </div>
      <div className="h-2 bg-neutral-800 overflow-hidden">
        <div className={`h-full transition-all ${tone === "light" ? "bg-neutral-400" : "bg-neutral-600"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface DevelopmentLogPanelProps {
  addingFilm: boolean;
  canLog: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  expired: boolean;
  filmSearch: string;
  filmStockId: string;
  filteredStocks: FilmStockOption[];
  format: DarkroomManagerState["format"];
  inputClass: string;
  isoShotAt: string;
  newFilmBrand: string;
  newFilmIso: string;
  newFilmName: string;
  newFilmProcess: string;
  notes: string;
  pushPull: number;
  rollCount: number;
  selectedStock: FilmStockOption | undefined;
  selectClass: string;
  showAddFilm: boolean;
  showDropdown: boolean;
  submitting: boolean;
  onAddFilmStock: () => void | Promise<void>;
  onExpiredChange: (value: boolean) => void;
  onFilmBrandChange: (value: string) => void;
  onFilmIsoChange: (value: string) => void;
  onFilmNameChange: (value: string) => void;
  onFilmProcessChange: (value: string) => void;
  onFilmSearchChange: (value: string) => void;
  onFormatChange: (value: DarkroomManagerState["format"]) => void;
  onHideAddFilm: () => void;
  onIsoShotAtChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onOpenAddFilm: () => void;
  onPushPullChange: (value: number) => void;
  onRollCountChange: (value: number) => void;
  onSelectStock: (stock: FilmStockOption) => void;
  onShowDropdownChange: (value: boolean) => void;
  onSubmitLog: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

function DevelopmentLogPanel({
  addingFilm,
  canLog,
  dropdownRef,
  expired,
  filmSearch,
  filmStockId,
  filteredStocks,
  format,
  inputClass,
  isoShotAt,
  newFilmBrand,
  newFilmIso,
  newFilmName,
  newFilmProcess,
  notes,
  pushPull,
  rollCount,
  selectedStock,
  selectClass,
  showAddFilm,
  showDropdown,
  submitting,
  onAddFilmStock,
  onExpiredChange,
  onFilmBrandChange,
  onFilmIsoChange,
  onFilmNameChange,
  onFilmProcessChange,
  onFilmSearchChange,
  onFormatChange,
  onHideAddFilm,
  onIsoShotAtChange,
  onNotesChange,
  onOpenAddFilm,
  onPushPullChange,
  onRollCountChange,
  onSelectStock,
  onShowDropdownChange,
  onSubmitLog,
}: DevelopmentLogPanelProps) {
  if (!canLog) {
    return (
      <AccessUpsellPanel
        eyebrow="Facilities unlock"
        title="Log film development"
        description="Facilities access unlocks roll credits, development logs, and darkroom activity tracking for your film work."
        ctaLabel="Buy Facilities"
      />
    );
  }

  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">Log Development</p>
      </div>

      <form onSubmit={onSubmitLog} className="space-y-4">
        <FilmStockPicker
          dropdownRef={dropdownRef}
          filmSearch={filmSearch}
          filteredStocks={filteredStocks}
          inputClass={inputClass}
          showDropdown={showDropdown}
          onAddNew={onOpenAddFilm}
          onSearchChange={onFilmSearchChange}
          onSelectStock={onSelectStock}
          onShowDropdownChange={onShowDropdownChange}
        />

        {showAddFilm && (
          <AddFilmStockForm
            addingFilm={addingFilm}
            inputClass={inputClass}
            newFilmBrand={newFilmBrand}
            newFilmIso={newFilmIso}
            newFilmName={newFilmName}
            newFilmProcess={newFilmProcess}
            selectClass={selectClass}
            onAddFilmStock={onAddFilmStock}
            onCancel={onHideAddFilm}
            onFilmBrandChange={onFilmBrandChange}
            onFilmIsoChange={onFilmIsoChange}
            onFilmNameChange={onFilmNameChange}
            onFilmProcessChange={onFilmProcessChange}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Format</p>
            <div className="flex gap-2">
              {(["35mm", "120"] as const).map((option) => (
                <button type="button" key={option} onClick={() => onFormatChange(option)}
                  className={`flex-1 py-2.5 text-xs tracking-wider uppercase border transition-colors ${format === option ? "border-neutral-400 text-neutral-200 bg-white/5" : "border-neutral-800 text-neutral-600 hover:text-neutral-400"}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="DarkroomManager-log-number-of-rolls" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Number of Rolls</label>
            <input id="DarkroomManager-log-number-of-rolls" type="number" min={1} max={50} value={rollCount} onChange={(e) => onRollCountChange(parseInt(e.target.value) || 1)} className={inputClass} />
            <p className="text-[10px] text-neutral-700 mt-1">This will use {rollCount} roll credit{rollCount !== 1 ? "s" : ""}.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="DarkroomManager-iso-shot-at" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">ISO Shot At</label>
            <input id="DarkroomManager-iso-shot-at" type="number" placeholder={selectedStock?.iso ? `Default: ${selectedStock.iso}` : "Optional"} value={isoShotAt} onChange={(e) => onIsoShotAtChange(e.target.value)} className={inputClass} />
          </div>
          <div>
            <p className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Expired Film</p>
            <button type="button" onClick={() => onExpiredChange(!expired)}
              className={`w-full py-2.5 text-xs tracking-wider uppercase border transition-colors ${expired ? "border-amber-700 text-amber-400 bg-amber-950/20" : "border-neutral-800 text-neutral-600 hover:text-neutral-400"}`}>
              {expired ? "Yes, Expired" : "No"}
            </button>
          </div>
          <div>
            <label htmlFor="DarkroomManager-push-pull" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Push/Pull (half-stops)</label>
            <div className="flex items-center gap-3">
              <input id="DarkroomManager-push-pull" type="range" min={-5} max={5} value={pushPull} onChange={(e) => onPushPullChange(parseInt(e.target.value))} className="flex-1 accent-neutral-400" />
              <span className={`text-sm w-8 text-center ${pushPull === 0 ? "text-neutral-600" : pushPull > 0 ? "text-green-400" : "text-blue-400"}`}>
                {pushPull > 0 ? `+${pushPull}` : pushPull}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="DarkroomManager-notes-optional" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Notes (optional)</label>
          <input id="DarkroomManager-notes-optional" aria-label="Any extra details" type="text" placeholder="Any extra details" value={notes} onChange={(e) => onNotesChange(e.target.value)} className={inputClass} />
        </div>

        <button type="submit" disabled={submitting || !filmStockId}
          className="px-6 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50">
          {submitting ? "Submitting" : "Submit Log"}
        </button>
      </form>
    </div>
  );
}

interface FilmStockPickerProps {
  dropdownRef: RefObject<HTMLDivElement | null>;
  filmSearch: string;
  filteredStocks: FilmStockOption[];
  inputClass: string;
  showDropdown: boolean;
  onAddNew: () => void;
  onSearchChange: (value: string) => void;
  onSelectStock: (stock: FilmStockOption) => void;
  onShowDropdownChange: (value: boolean) => void;
}

function FilmStockPicker({
  dropdownRef,
  filmSearch,
  filteredStocks,
  inputClass,
  showDropdown,
  onAddNew,
  onSearchChange,
  onSelectStock,
  onShowDropdownChange,
}: FilmStockPickerProps) {
  return (
    <div ref={dropdownRef} className="relative">
      <label htmlFor="DarkroomManager-film-stock" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Film Stock</label>
      <input id="DarkroomManager-film-stock" aria-label="Start typing to search"
        type="text"
        placeholder="Start typing to search"
        value={filmSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => onShowDropdownChange(true)}
        className={inputClass}
      />
      {showDropdown && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-800 shadow-lg">
          {filteredStocks.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-600">No matches</p>
          ) : (
            filteredStocks.map((stock) => (
              <button
                key={stock.id}
                type="button"
                onClick={() => onSelectStock(stock)}
                className="block w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 transition-colors"
              >
                {stock.name} <span className="text-neutral-600 ml-1">({stock.process})</span>
              </button>
            ))
          )}
          <button
            type="button"
            onClick={onAddNew}
            className="block w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-950/20 border-t border-neutral-800 transition-colors"
          >
            + Add new film stock
          </button>
        </div>
      )}
    </div>
  );
}

interface AddFilmStockFormProps {
  addingFilm: boolean;
  inputClass: string;
  newFilmBrand: string;
  newFilmIso: string;
  newFilmName: string;
  newFilmProcess: string;
  selectClass: string;
  onAddFilmStock: () => void | Promise<void>;
  onCancel: () => void;
  onFilmBrandChange: (value: string) => void;
  onFilmIsoChange: (value: string) => void;
  onFilmNameChange: (value: string) => void;
  onFilmProcessChange: (value: string) => void;
}

function AddFilmStockForm({
  addingFilm,
  inputClass,
  newFilmBrand,
  newFilmIso,
  newFilmName,
  newFilmProcess,
  selectClass,
  onAddFilmStock,
  onCancel,
  onFilmBrandChange,
  onFilmIsoChange,
  onFilmNameChange,
  onFilmProcessChange,
}: AddFilmStockFormProps) {
  return (
    <div className="border border-dashed border-neutral-700 p-4 space-y-3">
      <p className="text-[10px] tracking-wider uppercase text-neutral-500">Add New Film Stock</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input aria-label="Film name" type="text" placeholder="Film name (e.g. Kodak Gold 200)" value={newFilmName} onChange={(e) => onFilmNameChange(e.target.value)} required className={inputClass} />
        <input aria-label="Brand" type="text" placeholder="Brand (optional)" value={newFilmBrand} onChange={(e) => onFilmBrandChange(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input aria-label="ISO" type="number" placeholder="ISO (optional)" value={newFilmIso} onChange={(e) => onFilmIsoChange(e.target.value)} className={inputClass} />
        <select aria-label="Film process" value={newFilmProcess} onChange={(e) => onFilmProcessChange(e.target.value)} className={selectClass}>
          <option value="C-41">C-41</option>
          <option value="B&W">B&W</option>
          <option value="E-6 Slide">E-6 Slide</option>
        </select>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onAddFilmStock} disabled={addingFilm || !newFilmName.trim()} className="px-4 py-2 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50">
          {addingFilm ? "Adding" : "Add Film"}
        </button>
        <button type="button" onClick={onCancel} className="text-[10px] text-neutral-600 hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  );
}

interface RecentDevelopmentLogsProps {
  canLog: boolean;
  recentLogs: LogEntry[];
  userRole: string;
  onDeleteLog: (logId: string) => void;
}

function RecentDevelopmentLogs({ canLog, recentLogs, userRole, onDeleteLog }: RecentDevelopmentLogsProps) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">Recent Logs</p>
      {recentLogs.length === 0 ? (
        <p className="text-xs text-neutral-700">No development logs yet.</p>
      ) : (
        <div className="space-y-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="bg-white/[0.02] border border-neutral-800 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-neutral-200">{log.filmStockName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 border border-neutral-800 text-neutral-500">{log.process}</span>
                  <span className="text-[10px] text-neutral-400">{log.format}</span>
                  <span className="text-[10px] text-neutral-400">×{log.rollCount}</span>
                  {log.expired && <span className="text-[10px] text-amber-500">Expired</span>}
                  {log.pushPull !== 0 && <span className="text-[10px] text-neutral-400">{log.pushPull > 0 ? `+${log.pushPull}` : log.pushPull}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-neutral-400">{log.userName}</span>
                  <span className="text-[12px] text-neutral-400">·</span>
                  <span className="text-[12px] text-neutral-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {(userRole === "admin" || userRole === "officer" || (canLog && log.userId === "self")) && (
                <button type="button" onClick={() => onDeleteLog(log.id)} className="text-[10px] text-red-200 hover:text-red-400 transition-colors flex-shrink-0">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DeleteLogModalProps {
  deleteLogId: string | null;
  deletingLog: boolean;
  onCancel: () => void;
  onDelete: () => void | Promise<void>;
}

function DeleteLogModal({ deleteLogId, deletingLog, onCancel, onDelete }: DeleteLogModalProps) {
  if (!deleteLogId) return null;

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <button type="button" aria-label="Close delete log dialog" className="absolute inset-0 cursor-default" onMouseDown={onCancel} />
      <div className="relative z-10 bg-neutral-950 border border-red-900/30 p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm tracking-wider text-red-400">Delete Log</h3>
          <button type="button" aria-label="Close delete log dialog" disabled={deletingLog} onClick={onCancel} className="text-neutral-600 hover:text-neutral-400 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-neutral-400 mb-6">
          Delete this log entry? Roll credits mapped to this development will be immediately restored.
        </p>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={onDelete}
            disabled={deletingLog}
            className="px-4 py-2 bg-red-600 text-[10px] tracking-wider uppercase text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deletingLog ? "Deleting" : "Permanently Delete"}
          </button>
          <button type="button"
            onClick={onCancel}
            disabled={deletingLog}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
