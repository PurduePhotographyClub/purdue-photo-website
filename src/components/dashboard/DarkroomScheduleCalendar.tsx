import { useEffect, useMemo, useReducer } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Users,
} from "lucide-react";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import {
  fetchApi,
  fetchJson,
  LIVE_SCHEDULE_SWR_OPTIONS,
  readErrorMessage,
  readJson,
} from "@/lib/http";
import {
  addClubCalendarDays,
  clubDateKeyToParts,
  clubDatePartsToKey,
  clubDateTimeToUtcIso,
  CLUB_TIME_ZONE,
  getClubDateParts,
  startOfClubSunday,
  type ClubDateParts,
} from "@/lib/club-time";

interface DarkroomScheduleSlot {
  availableCapacity: number;
  capacity: number;
  discordChannelId?: string | null;
  discordSyncStatus?: "archived" | "failed" | "pending" | "synced";
  endsAt: string;
  id: string;
  isRegistered: boolean;
  registeredCount: number;
  startsAt: string;
  status: "cancelled" | "open";
  title: string;
}

interface DarkroomScheduleResponse {
  slots: DarkroomScheduleSlot[];
  window: {
    end: string;
    start: string;
  };
}

interface DarkroomScheduleMutationResponse {
  discordSyncWarning?: string | null;
  slot?: DarkroomScheduleSlot | null;
}

interface DarkroomScheduleCalendarProps {
  canSchedule: boolean;
}

interface DarkroomScheduleCalendarState {
  busySlotId: string | null;
  error: string;
  notice: string;
  syncWarning: string;
  todayKey: string;
  todayWeekStartKey: string;
  weekStartKey: string;
}

const EMPTY_SLOTS: DarkroomScheduleSlot[] = [];
const scheduleButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function DarkroomScheduleCalendar({
  canSchedule,
}: DarkroomScheduleCalendarProps) {
  const [state, setState] = useReducer(
    darkroomScheduleCalendarReducer,
    undefined,
    createInitialCalendarState,
  );
  const {
    busySlotId,
    error,
    notice,
    syncWarning,
    todayKey,
    todayWeekStartKey,
    weekStartKey,
  } = state;
  const weekStart = useMemo(
    () => clubDateKeyToParts(weekStartKey),
    [weekStartKey],
  );
  const weekEnd = useMemo(() => addClubCalendarDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addClubCalendarDays(weekStart, index),
      ),
    [weekStart],
  );
  const scheduleUrl = `/api/darkroom/schedule?start=${encodeURIComponent(clubDateTimeToUtcIso(weekStart, 0))}&end=${encodeURIComponent(clubDateTimeToUtcIso(weekEnd, 0))}`;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<DarkroomScheduleResponse>(
    canSchedule ? scheduleUrl : null,
    fetchJson,
    LIVE_SCHEDULE_SWR_OPTIONS,
  );
  const slots = data?.slots ?? EMPTY_SLOTS;
  const slotsByDay = useMemo(() => groupSlotsByDay(slots), [slots]);

  useEffect(() => {
    const refreshClubDate = () => {
      const now = new Date();
      const nextTodayKey = clubDatePartsToKey(getClubDateParts(now));
      if (nextTodayKey === todayKey) return;

      const nextTodayWeekStartKey = clubDatePartsToKey(startOfClubSunday(now));
      setState({
        todayKey: nextTodayKey,
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
  }, [todayKey, todayWeekStartKey, weekStartKey]);

  if (!canSchedule) {
    return (
      <AccessUpsellPanel
        eyebrow="Facilities calendar"
        title="Join darkroom time"
        description="Facilities members can join manager-approved darkroom slots and get a private Discord channel for their session."
        ctaLabel="Buy Facilities"
      />
    );
  }

  const handleRegistration = async (
    slot: DarkroomScheduleSlot,
    method: "DELETE" | "POST",
  ) => {
    setState({ busySlotId: slot.id, error: "", notice: "", syncWarning: "" });

    try {
      const response = await fetchApi(
        `/api/darkroom/schedule/${slot.id}/registration`,
        {
          method,
        },
      );

      if (!response.ok) {
        setState({
          error: await readErrorMessage(
            response,
            method === "POST"
              ? "Failed to join this slot."
              : "Failed to drop this slot.",
          ),
        });
        return;
      }

      const result = await readJson<DarkroomScheduleMutationResponse>(response);
      setState({
        notice:
          method === "POST"
            ? "Joined darkroom slot."
            : "Darkroom slot dropped.",
        syncWarning: result.discordSyncWarning ?? "",
      });
      await mutate();
    } catch {
      setState({
        error:
          method === "POST"
            ? "Failed to join this slot."
            : "Failed to drop this slot.",
      });
    } finally {
      setState({ busySlotId: null });
    }
  };

  return (
    <div className="space-y-5">
      <ScheduleToolbar
        rangeLabel={`${formatMonthDay(weekStart)} - ${formatMonthDay(addClubCalendarDays(weekStart, 6))}`}
        onNext={() =>
          setState({
            weekStartKey: clubDatePartsToKey(addClubCalendarDays(weekStart, 7)),
          })
        }
        onPrevious={() =>
          setState({
            weekStartKey: clubDatePartsToKey(
              addClubCalendarDays(weekStart, -7),
            ),
          })
        }
        onToday={() => setState({ weekStartKey: todayWeekStartKey })}
      />

      {(error || loadError) && (
        <p
          role="alert"
          className="border border-red-900/30 bg-red-900/10 px-4 py-3 text-xs text-red-400"
        >
          {error || "Failed to load the darkroom schedule."}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="border border-green-900/30 bg-green-900/10 px-4 py-3 text-xs text-green-400"
        >
          {notice}
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

      {isLoading ? (
        <ScheduleSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          {days.map((day) => (
            <ScheduleDayColumn
              busySlotId={busySlotId}
              day={day}
              key={clubDatePartsToKey(day)}
              slots={slotsByDay[clubDatePartsToKey(day)] ?? []}
              todayKey={todayKey}
              onDrop={(slot) => handleRegistration(slot, "DELETE")}
              onJoin={(slot) => handleRegistration(slot, "POST")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScheduleToolbarProps {
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  rangeLabel: string;
}

function ScheduleToolbar({
  onNext,
  onPrevious,
  onToday,
  rangeLabel,
}: ScheduleToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border border-neutral-800 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center border border-neutral-800 text-neutral-400">
          <CalendarDays className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
            Darkroom Schedule
          </p>
          <p className="text-sm text-neutral-200">{rangeLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="flex size-10 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
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

interface ScheduleDayColumnProps {
  busySlotId: string | null;
  day: ClubDateParts;
  onDrop: (slot: DarkroomScheduleSlot) => void;
  onJoin: (slot: DarkroomScheduleSlot) => void;
  slots: DarkroomScheduleSlot[];
  todayKey: string;
}

function ScheduleDayColumn({
  busySlotId,
  day,
  onDrop,
  onJoin,
  slots,
  todayKey,
}: ScheduleDayColumnProps) {
  const isToday = clubDatePartsToKey(day) === todayKey;

  return (
    <section className="min-h-48 border border-neutral-800 bg-neutral-950/60">
      <div
        className={`border-b border-neutral-800 px-4 py-3 ${isToday ? "bg-blue-950/20" : "bg-white/[0.02]"}`}
      >
        <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-600">
          {formatWeekday(day)}
        </p>
        <p
          className={`text-lg ${isToday ? "text-blue-200" : "text-neutral-200"}`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {formatMonthDay(day)}
        </p>
      </div>
      <div className="space-y-3 p-3">
        {slots.length === 0 ? (
          <p className="border border-dashed border-neutral-800 px-3 py-5 text-center text-[10px] text-neutral-700">
            No slots
          </p>
        ) : (
          slots.map((slot) => (
            <ScheduleSlotCard
              busy={busySlotId === slot.id}
              key={slot.id}
              slot={slot}
              onDrop={onDrop}
              onJoin={onJoin}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface ScheduleSlotCardProps {
  busy: boolean;
  onDrop: (slot: DarkroomScheduleSlot) => void;
  onJoin: (slot: DarkroomScheduleSlot) => void;
  slot: DarkroomScheduleSlot;
}

function ScheduleSlotCard({
  busy,
  onDrop,
  onJoin,
  slot,
}: ScheduleSlotCardProps) {
  const isFull = slot.availableCapacity <= 0;
  const isPastDeadline = new Date(slot.endsAt) <= new Date();
  const percentFull = Math.min(
    100,
    Math.round((slot.registeredCount / Math.max(1, slot.capacity)) * 100),
  );
  const cardClass = isPastDeadline
    ? "border-neutral-900/80 bg-neutral-950/25 opacity-55 saturate-50"
    : slot.isRegistered
      ? "border-blue-700 bg-blue-950/15"
      : "border-neutral-800 bg-white/[0.025]";
  const titleClass = isPastDeadline ? "text-neutral-500" : "text-neutral-100";
  const badgeClass = isPastDeadline
    ? "border-neutral-800 bg-neutral-950/50 text-neutral-500"
    : "border-blue-800 bg-blue-950/40 text-blue-200";
  const progressClass = isPastDeadline
    ? "bg-neutral-700"
    : isFull
      ? "bg-red-500"
      : slot.isRegistered
        ? "bg-blue-400"
        : "bg-green-500";
  const actionClass = isPastDeadline
    ? "border-neutral-800 text-neutral-600"
    : slot.isRegistered
      ? "border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30"
      : "border-neutral-700 bg-white text-black hover:bg-neutral-200";

  return (
    <article className={`border p-4 transition-colors ${cardClass}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm ${titleClass}`}>{slot.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-500">
            <Clock className="size-3" aria-hidden="true" />
            {formatTimeRange(slot.startsAt, slot.endsAt)}
          </p>
        </div>
        {slot.isRegistered && (
          <span
            className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${badgeClass}`}
          >
            Yours
          </span>
        )}
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <Users className="size-3" aria-hidden="true" />
            {slot.registeredCount}/{slot.capacity}
          </span>
          <span>{slot.availableCapacity} open</span>
        </div>
        <div className="h-1.5 overflow-hidden bg-neutral-800">
          <div
            className={`h-full ${progressClass}`}
            style={{ width: `${percentFull}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {slot.isRegistered ? (
          <button
            type="button"
            disabled={busy || isPastDeadline}
            onClick={() => onDrop(slot)}
            className={`${scheduleButtonClass} ${actionClass}`}
          >
            {isPastDeadline ? "Ended" : busy ? "Dropping" : "Drop Slot"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || isFull || isPastDeadline}
            onClick={() => onJoin(slot)}
            className={`${scheduleButtonClass} ${actionClass}`}
          >
            {isPastDeadline
              ? "Ended"
              : busy
                ? "Joining"
                : isFull
                  ? "Full"
                  : "Join"}
          </button>
        )}
        {slot.discordChannelId && slot.isRegistered && !isPastDeadline && (
          <span className="inline-flex min-h-8 items-center justify-center gap-2 border border-neutral-800 px-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            <MessageCircle className="size-3" aria-hidden="true" />
            Discord Ready
          </span>
        )}
        {slot.discordSyncStatus === "failed" && (
          <span className="text-[10px] text-amber-400">
            Discord sync needs manager retry.
          </span>
        )}
      </div>
    </article>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse border border-neutral-800 bg-white/[0.02] p-4"
        >
          <div className="mb-4 h-4 w-1/3 bg-neutral-800" />
          <div className="h-24 bg-neutral-900" />
        </div>
      ))}
    </div>
  );
}

function groupSlotsByDay(slots: DarkroomScheduleSlot[]) {
  return slots.reduce<Record<string, DarkroomScheduleSlot[]>>(
    (grouped, slot) => {
      const key = clubDatePartsToKey(getClubDateParts(new Date(slot.startsAt)));
      return {
        ...grouped,
        [key]: [...(grouped[key] ?? []), slot],
      };
    },
    {},
  );
}

function darkroomScheduleCalendarReducer(
  state: DarkroomScheduleCalendarState,
  patch: Partial<DarkroomScheduleCalendarState>,
) {
  return {
    ...state,
    ...patch,
  };
}

function createInitialCalendarState(): DarkroomScheduleCalendarState {
  const today = new Date();
  const todayWeekStartKey = clubDatePartsToKey(startOfClubSunday(today));

  return {
    busySlotId: null,
    error: "",
    notice: "",
    syncWarning: "",
    todayKey: clubDatePartsToKey(getClubDateParts(today)),
    todayWeekStartKey,
    weekStartKey: todayWeekStartKey,
  };
}

function formatMonthDay(parts: ClubDateParts) {
  return new Date(clubDateTimeToUtcIso(parts, 12)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: CLUB_TIME_ZONE,
  });
}

function formatWeekday(parts: ClubDateParts) {
  return new Date(clubDateTimeToUtcIso(parts, 12)).toLocaleDateString("en-US", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "long",
  });
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const options = {
    hour: "numeric",
    minute: "2-digit",
  } satisfies Intl.DateTimeFormatOptions;
  return `${new Date(startsAt).toLocaleTimeString("en-US", { ...options, timeZone: CLUB_TIME_ZONE })} - ${new Date(endsAt).toLocaleTimeString("en-US", { ...options, timeZone: CLUB_TIME_ZONE })}`;
}
