import { useEffect, useMemo, useReducer, useRef } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Send,
  Users,
} from "lucide-react";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import {
  fetchApi,
  fetchJson,
  LIVE_SCHEDULE_SWR_OPTIONS,
  readErrorMessage,
  readJson,
  SCHEDULE_SWR_OPTIONS,
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

interface StudioMemberRequest {
  adminNote: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  discordChannelId: string | null;
  discordSyncStatus: "archived" | "failed" | "pending" | "synced";
  endsAt: string;
  id: string;
  memberNote: string | null;
  needsStudioManager: boolean;
  resolvedAt: string | null;
  startsAt: string;
  status: StudioRequestStatus;
}

interface StudioCalendarRequest {
  adminNote?: string | null;
  discordChannelId?: string | null;
  endsAt: string;
  id: string;
  isMine: boolean;
  memberNote?: string | null;
  needsStudioManager?: boolean;
  startsAt: string;
  status: "approved" | "pending";
}

interface StudioDashboardResponse {
  requests: StudioMemberRequest[];
  stats: StudioStats;
}

interface StudioScheduleResponse {
  requests: StudioCalendarRequest[];
  window: {
    end: string;
    start: string;
  };
}

interface StudioRequestMutationResponse {
  discordSyncWarning?: string | null;
  request?: StudioMemberRequest | null;
  reviewSyncWarning?: string | null;
}

interface StudioManagerProps {
  userRole: string;
  userTier: string | null;
}

type StudioRequestStatus = "approved" | "cancelled" | "pending" | "rejected";
type StudioManagerTab = "requests" | "schedule" | "stats";

interface DateParts {
  day: number;
  month: number;
  year: number;
}

interface StudioBookingForm {
  endsAtLocal: string;
  memberNote: string;
  needsStudioManager: boolean;
  startsAtLocal: string;
}

interface StudioManagerState {
  activeTab: StudioManagerTab;
  bookingDay: DateParts | null;
  bookingForm: StudioBookingForm;
  busyAction: string | null;
  error: string;
  success: string;
  syncWarning: string;
  todayDayKey: string;
  todayWeekStartKey: string;
  weekStartKey: string;
}

const CLUB_TIME_ZONE = "America/Indiana/Indianapolis";
const clubDateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
});
const clubWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIME_ZONE,
  weekday: "short",
});
const EMPTY_REQUESTS: StudioCalendarRequest[] = [];
const STUDIO_TABS: Array<{ label: string; value: StudioManagerTab }> = [
  { label: "Stats", value: "stats" },
  { label: "Schedule", value: "schedule" },
  { label: "Requests", value: "requests" },
];
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";

export default function StudioManager({
  userRole,
  userTier,
}: StudioManagerProps) {
  const canSchedule =
    userRole === "admin" || userRole === "officer" || userTier === "facilities";
  const [state, setState] = useReducer(
    studioManagerReducer,
    undefined,
    createInitialStudioManagerState,
  );
  const {
    activeTab,
    bookingDay,
    bookingForm,
    busyAction,
    error,
    success,
    syncWarning,
    todayDayKey,
    todayWeekStartKey,
    weekStartKey,
  } = state;
  const weekStartParts = useMemo(
    () => keyToDateParts(weekStartKey),
    [weekStartKey],
  );
  const todayParts = useMemo(() => keyToDateParts(todayDayKey), [todayDayKey]);
  const todayWeekStartParts = useMemo(
    () => keyToDateParts(todayWeekStartKey),
    [todayWeekStartKey],
  );
  const weekEndParts = useMemo(
    () => addCalendarDays(weekStartParts, 7),
    [weekStartParts],
  );
  const previousWeekStartParts = useMemo(
    () => addCalendarDays(weekStartParts, -7),
    [weekStartParts],
  );
  const isPreviousDisabled =
    compareDateParts(weekStartParts, todayWeekStartParts) <= 0;
  const scheduleUrl = `/api/studio/schedule?start=${encodeURIComponent(zonedTimeToUtcIso(weekStartParts, 0))}&end=${encodeURIComponent(zonedTimeToUtcIso(weekEndParts, 0))}`;
  const {
    data: dashboard,
    error: dashboardError,
    isLoading: dashboardLoading,
    mutate: mutateDashboard,
  } = useSWR<StudioDashboardResponse>(
    canSchedule ? "/api/studio" : null,
    fetchJson,
    SCHEDULE_SWR_OPTIONS,
  );
  const {
    data: schedule,
    error: scheduleError,
    isLoading: scheduleLoading,
    mutate: mutateSchedule,
  } = useSWR<StudioScheduleResponse>(
    canSchedule ? scheduleUrl : null,
    fetchJson,
    LIVE_SCHEDULE_SWR_OPTIONS,
  );
  const requests = schedule?.requests ?? EMPTY_REQUESTS;
  const requestsByDay = useMemo(() => groupRequestsByDay(requests), [requests]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addCalendarDays(weekStartParts, index),
      ),
    [weekStartParts],
  );

  useEffect(() => {
    const refreshClubDate = () => {
      const now = new Date();
      const nextTodayDayKey = datePartsToKey(getClubDateParts(now));
      if (nextTodayDayKey === todayDayKey) return;

      const nextTodayWeekStartKey = datePartsToKey(startOfClubSunday(now));
      setState({
        todayDayKey: nextTodayDayKey,
        todayWeekStartKey: nextTodayWeekStartKey,
        ...(weekStartKey === todayWeekStartKey
          ? { weekStartKey: nextTodayWeekStartKey }
          : {}),
      });
    };
    const timer = window.setInterval(refreshClubDate, 60_000);
    window.addEventListener("focus", refreshClubDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshClubDate);
    };
  }, [todayDayKey, todayWeekStartKey, weekStartKey]);

  if (!canSchedule) {
    return (
      <AccessUpsellPanel
        eyebrow="Studio calendar"
        title="Request studio time"
        description="Facilities members can request studio reservations from 6:00 AM through midnight."
        ctaLabel="Buy Facilities"
      />
    );
  }

  const refreshAll = async () => {
    await Promise.all([mutateDashboard(), mutateSchedule()]);
  };

  const handleSubmitRequest = async () => {
    if (!bookingDay) return;
    if (isDatePartsBefore(bookingDay, todayParts)) {
      setState({
        bookingDay: null,
        error: "Studio requests cannot be scheduled for past dates.",
        success: "",
        syncWarning: "",
      });
      return;
    }

    const startsAt = zonedTimeInputToUtcIso(
      bookingDay,
      bookingForm.startsAtLocal,
    );
    const endsAt = zonedTimeInputToUtcIso(bookingDay, bookingForm.endsAtLocal);
    if (Date.parse(endsAt) - Date.parse(startsAt) < 15 * 60 * 1_000) {
      setState({
        error:
          "Studio requests must end after they start and last at least 15 minutes.",
        success: "",
        syncWarning: "",
      });
      return;
    }

    setState({
      busyAction: "request",
      error: "",
      success: "",
      syncWarning: "",
    });

    try {
      const response = await fetchApi("/api/studio/requests", {
        body: JSON.stringify({
          endsAt,
          memberNote: bookingForm.memberNote || null,
          needsStudioManager: bookingForm.needsStudioManager,
          startsAt,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setState({
          error: await readErrorMessage(
            response,
            "Failed to submit studio request.",
          ),
        });
        return;
      }

      const result = await readJson<StudioRequestMutationResponse>(response);
      setState({
        bookingDay: null,
        bookingForm: createDefaultBookingForm(),
        success: "Studio request submitted for studio manager approval.",
        syncWarning:
          result.reviewSyncWarning ?? result.discordSyncWarning ?? "",
      });
      await refreshAll();
    } catch {
      setState({ error: "Failed to submit studio request." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setState({
      busyAction: `cancel:${requestId}`,
      error: "",
      success: "",
      syncWarning: "",
    });

    try {
      const response = await fetchApi(`/api/studio/requests/${requestId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setState({
          error: await readErrorMessage(
            response,
            "Failed to cancel studio request.",
          ),
        });
        return;
      }

      const result = await readJson<StudioRequestMutationResponse>(response);
      setState({
        success: "Studio request cancelled.",
        syncWarning:
          result.discordSyncWarning ?? result.reviewSyncWarning ?? "",
      });
      await refreshAll();
    } catch {
      setState({ error: "Failed to cancel studio request." });
    } finally {
      setState({ busyAction: null });
    }
  };

  return (
    <div className="space-y-6">
      {((!bookingDay && error) || dashboardError || scheduleError) && (
        <p
          role="alert"
          className="border border-red-900/30 bg-red-900/10 px-4 py-3 text-xs text-red-400"
        >
          {(!bookingDay && error) || "Failed to load studio data."}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="border border-green-900/30 bg-green-900/10 px-4 py-3 text-xs text-green-400"
        >
          {success}
        </p>
      )}
      {syncWarning && (
        <p
          role="status"
          className="border border-amber-900/40 bg-amber-950/15 px-4 py-3 text-xs text-amber-300"
        >
          {syncWarning}
        </p>
      )}

      <StudioTabs
        activeTab={activeTab}
        onChange={(nextTab) => setState({ activeTab: nextTab })}
      />

      {activeTab === "stats" &&
        (dashboardLoading ? (
          <StudioSkeleton />
        ) : (
          <StudioStatsGrid stats={dashboard?.stats} />
        ))}

      {activeTab === "schedule" && (
        <>
          <StudioToolbar
            previousDisabled={isPreviousDisabled}
            rangeLabel={`${formatClubMonthDay(weekStartParts)} - ${formatClubMonthDay(addCalendarDays(weekStartParts, 6))}`}
            onNext={() =>
              setState({
                weekStartKey: datePartsToKey(
                  addCalendarDays(weekStartParts, 7),
                ),
              })
            }
            onPrevious={() =>
              setState({
                weekStartKey: datePartsToKey(
                  compareDateParts(
                    previousWeekStartParts,
                    todayWeekStartParts,
                  ) < 0
                    ? todayWeekStartParts
                    : previousWeekStartParts,
                ),
              })
            }
            onToday={() => setState({ weekStartKey: todayWeekStartKey })}
          />

          {scheduleLoading ? (
            <StudioSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
              {days.map((day) => (
                <StudioDayColumn
                  busyAction={busyAction}
                  day={day}
                  isPast={isDatePartsBefore(day, todayParts)}
                  key={datePartsToKey(day)}
                  requests={requestsByDay.get(datePartsToKey(day)) ?? []}
                  todayDayKey={todayDayKey}
                  onCancel={handleCancelRequest}
                  onRequest={(requestDay) =>
                    setState({
                      bookingDay: requestDay,
                      bookingForm: createDefaultBookingForm(),
                      error: "",
                      success: "",
                      syncWarning: "",
                    })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "requests" &&
        (dashboardLoading ? (
          <StudioSkeleton />
        ) : (
          <StudioRequestHistory
            busyAction={busyAction}
            requests={dashboard?.requests ?? []}
            onCancel={handleCancelRequest}
          />
        ))}

      {bookingDay && (
        <StudioBookingModal
          busy={busyAction === "request"}
          day={bookingDay}
          error={error}
          form={bookingForm}
          onChange={(patch) =>
            setState({ bookingForm: { ...bookingForm, ...patch } })
          }
          onClose={() => setState({ bookingDay: null, error: "" })}
          onSubmit={handleSubmitRequest}
        />
      )}
    </div>
  );
}

function studioManagerReducer(
  state: StudioManagerState,
  patch: Partial<StudioManagerState>,
) {
  return {
    ...state,
    ...patch,
  };
}

function createInitialStudioManagerState(): StudioManagerState {
  const now = new Date();
  const todayDayKey = datePartsToKey(getClubDateParts(now));
  const todayWeekStartKey = datePartsToKey(startOfClubSunday(now));

  return {
    activeTab: "schedule",
    bookingDay: null,
    bookingForm: createDefaultBookingForm(),
    busyAction: null,
    error: "",
    success: "",
    syncWarning: "",
    todayDayKey,
    todayWeekStartKey,
    weekStartKey: todayWeekStartKey,
  };
}

function StudioStatsGrid({ stats }: { stats: StudioStats | undefined }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
      <StudioStatCard
        label="People Used Studio"
        value={stats?.uniqueUsedUsers ?? 0}
        helper="Approved completed sessions"
      />
      <StudioStatCard label="Studio Uses" value={stats?.usedSessions ?? 0} />
      <StudioStatCard
        label="Upcoming"
        value={stats?.upcomingApprovedSessions ?? 0}
      />
      <StudioStatCard label="Pending" value={stats?.pendingRequests ?? 0} />
    </div>
  );
}

function StudioStatCard({
  helper,
  label,
  value,
}: {
  helper?: string;
  label: string;
  value: number;
}) {
  return (
    <div className="border border-neutral-800 bg-white/[0.02] p-5">
      <p className="mb-1 text-[9px] uppercase tracking-[0.3em] text-neutral-600">
        {label}
      </p>
      <p
        className="text-3xl font-light text-neutral-100"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {value}
      </p>
      {helper && <p className="mt-1 text-[9px] text-neutral-700">{helper}</p>}
    </div>
  );
}

interface StudioToolbarProps {
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  previousDisabled: boolean;
  rangeLabel: string;
}

function StudioToolbar({
  onNext,
  onPrevious,
  onToday,
  previousDisabled,
  rangeLabel,
}: StudioToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border border-neutral-800 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center border border-neutral-800 text-neutral-400">
          <CalendarDays className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
            Studio Schedule
          </p>
          <p className="text-sm text-neutral-200">{rangeLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={previousDisabled}
          onClick={onPrevious}
          className="flex size-10 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="min-h-10 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex size-10 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
          aria-label="Next week"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface StudioTabsProps {
  activeTab: StudioManagerTab;
  onChange: (tab: StudioManagerTab) => void;
}

function StudioTabs({ activeTab, onChange }: StudioTabsProps) {
  return (
    <div
      aria-label="Studio manager views"
      className="flex flex-wrap gap-1 border-b border-neutral-800"
      role="group"
    >
      {STUDIO_TABS.map((tab) => (
        <button
          key={tab.value}
          aria-pressed={activeTab === tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`-mb-px border-b-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.15em] transition-colors ${
            activeTab === tab.value
              ? "border-neutral-400 text-neutral-200"
              : "border-transparent text-neutral-600 hover:text-neutral-400"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface StudioDayColumnProps {
  busyAction: string | null;
  day: DateParts;
  isPast: boolean;
  onCancel: (requestId: string) => void;
  onRequest: (day: DateParts) => void;
  requests: StudioCalendarRequest[];
  todayDayKey: string;
}

function StudioDayColumn({
  busyAction,
  day,
  isPast,
  onCancel,
  onRequest,
  requests,
  todayDayKey,
}: StudioDayColumnProps) {
  const isToday = datePartsToKey(day) === todayDayKey;
  const sortedRequests = requests.toSorted(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  const addLabel = isPast ? "Past date" : "Add request";

  return (
    <section
      className={`min-h-72 border bg-neutral-950/60 transition-colors ${isToday ? "border-blue-900/70" : "border-neutral-800"} ${isPast ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        disabled={isPast}
        onClick={() => onRequest(day)}
        className={`block w-full border-b border-neutral-800 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed ${isToday ? "bg-blue-950/20" : "bg-white/[0.02]"} ${isPast ? "" : "hover:bg-white/[0.04]"}`}
      >
        <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-600">
          {formatClubWeekday(day)}
        </p>
        <p
          className={`text-lg ${isToday ? "text-blue-200" : "text-neutral-200"}`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {formatClubMonthDay(day)}
        </p>
        <span className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-neutral-500">
          {addLabel}
        </span>
      </button>
      {sortedRequests.length === 0 ? (
        <button
          type="button"
          disabled={isPast}
          onClick={() => onRequest(day)}
          className="flex min-h-44 w-full items-center justify-center px-4 text-xs text-neutral-700 transition-colors hover:text-neutral-300 disabled:cursor-not-allowed disabled:hover:text-neutral-700"
        >
          {isPast ? "Past date." : "No studio requests. Click to add one."}
        </button>
      ) : (
        <div className="space-y-2 p-3">
          {sortedRequests.map((request) => (
            <StudioScheduleRequestItem
              busy={busyAction === `cancel:${request.id}`}
              key={request.id}
              request={request}
              onCancel={onCancel}
            />
          ))}
          {!isPast && (
            <button
              type="button"
              onClick={() => onRequest(day)}
              className={`${buttonClass} w-full border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200`}
            >
              Add Another Time
            </button>
          )}
        </div>
      )}
    </section>
  );
}

interface StudioScheduleRequestItemProps {
  busy: boolean;
  onCancel: (requestId: string) => void;
  request: StudioCalendarRequest;
}

function StudioScheduleRequestItem({
  busy,
  onCancel,
  request,
}: StudioScheduleRequestItemProps) {
  if (canCancelStudioRequest(request)) {
    return (
      <div
        className={`border p-3 ${request.status === "pending" ? "border-amber-900/60 bg-amber-950/10" : "border-green-800 bg-green-950/15"}`}
      >
        <StudioScheduleRequestHeader request={request} />
        {request.status === "approved" && request.discordChannelId && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-green-300">
            <Clock className="size-3" aria-hidden="true" />
            Discord ready
          </span>
        )}
        {request.needsStudioManager && (
          <p className="mt-2 text-[10px] text-blue-300">
            Studio manager help requested
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(request.id)}
          className={`${buttonClass} mt-3 w-full border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30`}
        >
          {busy
            ? "Cancelling"
            : request.status === "approved"
              ? "Cancel Reservation"
              : "Cancel Request"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`border p-3 ${request.isMine ? "border-green-800 bg-green-950/15" : "border-neutral-800 bg-neutral-900/60"}`}
    >
      <StudioScheduleRequestHeader request={request} />
      {request?.isMine &&
        request.status === "approved" &&
        request.discordChannelId && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-green-300">
            <Clock className="size-3" aria-hidden="true" />
            Discord ready
          </span>
        )}
      {request.needsStudioManager && (
        <p className="mt-2 text-[10px] text-blue-300">
          Studio manager help requested
        </p>
      )}
    </div>
  );
}

function StudioScheduleRequestHeader({
  request,
}: {
  request: StudioCalendarRequest;
}) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="text-xs text-neutral-200">
        {formatClubTime(request.startsAt)} - {formatClubTime(request.endsAt)}
      </span>
      <span className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">
        {getScheduleRequestStatusLabel(request)}
      </span>
    </span>
  );
}

interface StudioBookingModalProps {
  busy: boolean;
  day: DateParts;
  error: string;
  form: StudioBookingForm;
  onChange: (patch: Partial<StudioBookingForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function StudioBookingModal({
  busy,
  day,
  error,
  form,
  onChange,
  onClose,
  onSubmit,
}: StudioBookingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="studio-booking-dialog-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border border-neutral-800 bg-neutral-950 p-0 text-neutral-200 backdrop:bg-black/80"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <form
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-blue-300">
              Request Studio Time
            </p>
            <h3
              id="studio-booking-dialog-title"
              className="mt-1 text-xl text-neutral-100"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {formatClubWeekday(day)}, {formatClubMonthDay(day)}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            aria-label="Close studio booking dialog"
            onClick={onClose}
            className="text-[10px] uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-neutral-200 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 border border-red-900/30 bg-red-900/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block [color-scheme:dark]">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">
              Start
            </span>
            <input
              className={inputClass}
              max="23:45"
              min="06:00"
              onChange={(event) =>
                onChange({ startsAtLocal: event.target.value })
              }
              required
              step={900}
              type="time"
              value={form.startsAtLocal}
            />
          </label>
          <label className="block [color-scheme:dark]">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">
              End
            </span>
            <input
              className={inputClass}
              max="23:59"
              min="00:00"
              onChange={(event) =>
                onChange({ endsAtLocal: event.target.value })
              }
              required
              step={900}
              type="time"
              value={form.endsAtLocal}
            />
          </label>
        </div>

        <label className="mt-4 flex items-start gap-3 border border-neutral-800 bg-white/[0.02] p-3">
          <input
            checked={form.needsStudioManager}
            className="mt-0.5 size-4 accent-white"
            onChange={(event) =>
              onChange({ needsStudioManager: event.target.checked })
            }
            type="checkbox"
          />
          <span>
            <span className="block text-xs text-neutral-200">
              Studio manager help?
            </span>
            <span className="mt-1 block text-[10px] text-neutral-600">
              Check this if you want a studio manager to help with access,
              setup, or handoff.
            </span>
          </span>
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">
            Note for admin (optional)
          </span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            maxLength={500}
            onChange={(event) => onChange({ memberNote: event.target.value })}
            placeholder="Backdrop, lighting, or project details"
            value={form.memberNote}
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className={`${buttonClass} border-neutral-700 bg-white text-black hover:bg-neutral-200`}
          >
            <Send className="size-3" aria-hidden="true" />
            {busy ? "Submitting" : "Submit Request"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`${buttonClass} border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200`}
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

interface StudioRequestHistoryProps {
  busyAction: string | null;
  onCancel: (requestId: string) => void;
  requests: StudioMemberRequest[];
}

function StudioRequestHistory({
  busyAction,
  onCancel,
  requests,
}: StudioRequestHistoryProps) {
  const sortedRequests = requests.toSorted(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-neutral-600" aria-hidden="true" />
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
          Your Studio Requests
        </p>
      </div>
      {sortedRequests.length === 0 ? (
        <p className="text-xs text-neutral-700">No studio requests yet.</p>
      ) : (
        <div className="space-y-2">
          {sortedRequests.map((request) => (
            <StudioRequestCard
              busy={busyAction === `cancel:${request.id}`}
              key={request.id}
              request={request}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface StudioRequestCardProps {
  busy: boolean;
  onCancel: (requestId: string) => void;
  request: StudioMemberRequest;
}

function StudioRequestCard({
  busy,
  onCancel,
  request,
}: StudioRequestCardProps) {
  return (
    <article className="border border-neutral-800 bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-200">
              {formatClubDateTime(request.startsAt)} -{" "}
              {formatClubTime(request.endsAt)}
            </span>
            <StudioStatusBadge status={request.status} />
          </div>
          {request.memberNote && (
            <p className="text-[10px] text-neutral-500">
              Note: {request.memberNote}
            </p>
          )}
          {request.adminNote && (
            <p className="text-[10px] text-neutral-400">
              Admin note: {request.adminNote}
            </p>
          )}
          {request.discordSyncStatus === "failed" && (
            <p className="mt-1 text-[10px] text-amber-400">
              Discord sync needs admin retry.
            </p>
          )}
        </div>
        {canCancelStudioRequest(request) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(request.id)}
            className={`${buttonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30`}
          >
            {busy ? "Cancelling" : "Cancel"}
          </button>
        )}
      </div>
    </article>
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
    <span
      className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${tone}`}
    >
      {status}
    </span>
  );
}

function StudioSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse border border-neutral-800 bg-white/[0.02] p-4"
        >
          <div className="mb-4 h-4 w-1/2 bg-neutral-800" />
          <div className="h-14 bg-neutral-900" />
        </div>
      ))}
    </div>
  );
}

function createDefaultBookingForm(): StudioBookingForm {
  return {
    endsAtLocal: "07:00",
    memberNote: "",
    needsStudioManager: false,
    startsAtLocal: "06:00",
  };
}

function groupRequestsByDay(requests: StudioCalendarRequest[]) {
  const entries = requests.map((request) => {
    const key = datePartsToKey(getClubDateParts(new Date(request.startsAt)));
    return [key, request] as const;
  });

  return entries.reduce((groups, [key, request]) => {
    return new Map(groups).set(key, [...(groups.get(key) ?? []), request]);
  }, new Map<string, StudioCalendarRequest[]>());
}

function getScheduleRequestStatusLabel(request: StudioCalendarRequest) {
  if (request.isMine && request.status === "approved") return "Yours";
  if (request.isMine && request.status === "pending") return "Pending";
  return request.status === "approved" ? "Booked" : "Pending";
}

function canCancelStudioRequest(request: {
  endsAt: string;
  isMine?: boolean;
  status: StudioRequestStatus;
}) {
  return (
    request.isMine !== false &&
    (request.status === "pending" ||
      (request.status === "approved" &&
        Date.parse(request.endsAt) > Date.now()))
  );
}

function zonedTimeInputToUtcIso(parts: DateParts, time: string) {
  const [hour = 0, minute = 0] = time
    .split(":")
    .map((value) => Number.parseInt(value, 10));
  const targetDay = hour === 0 ? addCalendarDays(parts, 1) : parts;
  return zonedTimeToUtcIso(targetDay, hour, minute);
}

function startOfClubSunday(date: Date): DateParts {
  const parts = getClubDateParts(date);
  return addCalendarDays(parts, -getClubWeekdayIndex(date));
}

function addCalendarDays(parts: DateParts, days: number): DateParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function keyToDateParts(key: string): DateParts {
  const [year, month, day] = key
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  return { day: day || 1, month: month || 1, year: year || 1970 };
}

function datePartsToKey(parts: DateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function compareDateParts(left: DateParts, right: DateParts) {
  return (
    Date.UTC(left.year, left.month - 1, left.day) -
    Date.UTC(right.year, right.month - 1, right.day)
  );
}

function isDatePartsBefore(left: DateParts, right: DateParts) {
  return compareDateParts(left, right) < 0;
}

function zonedTimeToUtcIso(parts: DateParts, hour: number, minute = 0) {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    0,
    0,
  );
  let utcMs = targetAsUtc;

  for (let index = 0; index < 3; index += 1) {
    const actualParts = getClubDateTimeParts(new Date(utcMs));
    const actualAsUtc = Date.UTC(
      actualParts.year,
      actualParts.month - 1,
      actualParts.day,
      actualParts.hour,
      actualParts.minute,
      actualParts.second,
      0,
    );
    utcMs -= actualAsUtc - targetAsUtc;
  }

  return new Date(utcMs).toISOString();
}

function getClubDateParts(date: Date): DateParts {
  const parts = getClubDateTimeParts(date);
  return {
    day: parts.day,
    month: parts.month,
    year: parts.year,
  };
}

function getClubDateTimeParts(date: Date) {
  const parts = clubDateTimePartsFormatter.formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    second: Number(parts.find((part) => part.type === "second")?.value ?? 0),
    year: Number(parts.find((part) => part.type === "year")?.value ?? 1970),
  };
}

function getClubWeekdayIndex(date: Date) {
  const weekday = clubWeekdayFormatter.format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function formatClubDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CLUB_TIME_ZONE,
  });
}

function formatClubMonthDay(parts: DateParts) {
  return new Date(zonedTimeToUtcIso(parts, 12)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: CLUB_TIME_ZONE,
  });
}

function formatClubTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  });
}

function formatClubWeekday(parts: DateParts) {
  return new Date(zonedTimeToUtcIso(parts, 12)).toLocaleDateString("en-US", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "long",
  });
}
