import { useMemo, useReducer } from "react";
import type { FormEvent, ReactNode } from "react";
import useSWR from "swr";
import {
  CalendarPlus,
  CalendarRange,
  CircleStop,
  Pencil,
  RefreshCcw,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
  readJson
} from "@/lib/http";

interface DarkroomScheduleRegistrant {
  discordId: string | null;
  email: string | null;
  name: string;
  registeredAt: string;
  userId: string;
}

interface AdminDarkroomScheduleSlot {
  availableCapacity: number;
  capacity: number;
  discordChannelId: string | null;
  discordMessageId: string | null;
  discordSyncError: string | null;
  discordSyncStatus: "archived" | "failed" | "pending" | "synced";
  endsAt: string;
  id: string;
  registeredCount: number;
  registrants?: DarkroomScheduleRegistrant[];
  startsAt: string;
  status: "cancelled" | "open";
  title: string;
}

interface AdminDarkroomScheduleResponse {
  slots: AdminDarkroomScheduleSlot[];
}

interface AdminDarkroomScheduleMutationResponse {
  cleaned?: number;
  channelId?: string;
  discordSyncWarning?: string | null;
  failed?: number;
  messageId?: string;
  scanned?: number;
  slot?: AdminDarkroomScheduleSlot | null;
  slotCount?: number;
  truncated?: boolean;
}

interface WeeklyPostOption {
  label: string;
  slotCount: number;
  value: string;
}

interface ScheduleFormState {
  capacity: string;
  editingId: string | null;
  endsAt: string;
  startsAt: string;
  title: string;
}

interface AdminDarkroomScheduleState {
  busyAction: string | null;
  error: string;
  form: ScheduleFormState;
  postWeekStartIso: string;
  success: string;
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";
const actionButtonClass = "inline-flex min-h-9 items-center justify-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function createInitialAdminDarkroomScheduleState(): AdminDarkroomScheduleState {
  const initialTimes = getDefaultFormTimes();

  return {
    busyAction: null,
    error: "",
    form: {
      capacity: "4",
      editingId: null,
      endsAt: initialTimes.endsAt,
      startsAt: initialTimes.startsAt,
      title: "Open Darkroom",
    },
    postWeekStartIso: getDefaultPostWeekStartIso(),
    success: "",
  };
}

function adminDarkroomScheduleReducer(
  state: AdminDarkroomScheduleState,
  patch: Partial<AdminDarkroomScheduleState>,
): AdminDarkroomScheduleState {
  return { ...state, ...patch };
}

export default function AdminDarkroomSchedule() {
  const [state, setState] = useReducer(
    adminDarkroomScheduleReducer,
    undefined,
    createInitialAdminDarkroomScheduleState,
  );
  const { busyAction, error, form, postWeekStartIso, success } = state;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<AdminDarkroomScheduleResponse>("/api/admin/darkroom/schedule", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const slots = data?.slots ?? [];
  const now = new Date();
  const upcomingSlots = slots.filter((slot) => slot.status === "open" && new Date(slot.endsAt) > now);
  const archivedSlots = slots.filter((slot) =>
    slot.status === "cancelled" ||
    slot.discordSyncStatus === "archived" ||
    new Date(slot.endsAt) <= now
  );
  const hasArchivedChannels = archivedSlots.some((slot) => !!slot.discordChannelId);
  const weeklyPostOptions = useMemo(
    () => buildWeeklyPostOptions(upcomingSlots, postWeekStartIso),
    [postWeekStartIso, upcomingSlots],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ busyAction: "save", error: "", success: "" });

    try {
      const endpoint = form.editingId
        ? `/api/admin/darkroom/schedule/${form.editingId}`
        : "/api/admin/darkroom/schedule";
      const response = await fetchApi(endpoint, {
        body: JSON.stringify({
          capacity: Number.parseInt(form.capacity, 10),
          endsAt: new Date(form.endsAt).toISOString(),
          startsAt: new Date(form.startsAt).toISOString(),
          title: form.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: form.editingId ? "PATCH" : "POST",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to save timeslot.") });
        return;
      }

      const result = await readJson<AdminDarkroomScheduleMutationResponse>(response);
      setState({ success: result.discordSyncWarning || (form.editingId ? "Timeslot updated." : "Timeslot created.") });
      resetForm();
      await mutate();
    } catch {
      setState({ error: "Failed to save timeslot." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleCancel = async (slotId: string) => {
    setState({ busyAction: `cancel:${slotId}`, error: "", success: "" });

    try {
      const response = await fetchApi(`/api/admin/darkroom/schedule/${slotId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to cancel timeslot.") });
        return;
      }

      const result = await readJson<AdminDarkroomScheduleMutationResponse>(response);
      setState({ success: result.discordSyncWarning || "Timeslot cancelled." });
      await mutate();
    } catch {
      setState({ error: "Failed to cancel timeslot." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleEndSession = async (slotId: string) => {
    setState({ busyAction: `end:${slotId}`, error: "", success: "" });

    try {
      const response = await fetchApi(`/api/admin/darkroom/schedule/${slotId}`, {
        body: JSON.stringify({ action: "end" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to end session.") });
        return;
      }

      const result = await readJson<AdminDarkroomScheduleMutationResponse>(response);
      setState({ success: result.discordSyncWarning || "Session ended." });
      await mutate();
    } catch {
      setState({ error: "Failed to end session." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleRetrySync = async (slotId: string) => {
    setState({ busyAction: `sync:${slotId}`, error: "", success: "" });

    try {
      const response = await fetchApi(`/api/admin/darkroom/schedule/${slotId}/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to sync timeslot with Discord.") });
        return;
      }

      setState({ success: "Discord sync completed." });
      await mutate();
    } catch {
      setState({ error: "Failed to sync timeslot with Discord." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleCleanupArchived = async () => {
    setState({ busyAction: "cleanup-archived", error: "", success: "" });

    try {
      const response = await fetchApi("/api/admin/darkroom/schedule/cleanup-archived", {
        method: "POST",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to clean up archived channels.") });
        return;
      }

      const result = await readJson<AdminDarkroomScheduleMutationResponse>(response);
      const failedCopy = result.failed && result.failed > 0 ? ` ${result.failed} failed.` : "";
      setState({ success: `Cleaned ${result.cleaned ?? 0} archived channel${result.cleaned === 1 ? "" : "s"}.${failedCopy}` });
      await mutate();
    } catch {
      setState({ error: "Failed to clean up archived channels." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handlePostWeeklyJoinMessage = async () => {
    setState({ busyAction: "weekly-message", error: "", success: "" });

    try {
      const weekStart = new Date(postWeekStartIso);
      const displayWeekEnd = addDays(weekStart, 7);
      const queryWeekEnd = new Date(addDays(weekStart, 8).getTime() - 1);
      const response = await fetchApi("/api/admin/darkroom/schedule/weekly-message", {
        body: JSON.stringify({
          displayEnd: displayWeekEnd.toISOString(),
          end: queryWeekEnd.toISOString(),
          start: weekStart.toISOString(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setState({ error: await readErrorMessage(response, "Failed to post weekly join message.") });
        return;
      }

      const result = await readJson<AdminDarkroomScheduleMutationResponse>(response);
      const slotCopy = `${result.slotCount ?? 0} slot${result.slotCount === 1 ? "" : "s"}`;
      const truncatedCopy = result.truncated ? " Discord shows the first 25 slots; the website calendar has the full week." : "";
      setState({ success: `Weekly join message posted for ${formatWeekRange(weekStart)} with ${slotCopy}.${truncatedCopy}` });
    } catch {
      setState({ error: "Failed to post weekly join message." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const startEditing = (slot: AdminDarkroomScheduleSlot) => {
    setState({
      error: "",
      form: {
        capacity: String(slot.capacity),
        editingId: slot.id,
        endsAt: toDateTimeLocalValue(new Date(slot.endsAt)),
        startsAt: toDateTimeLocalValue(new Date(slot.startsAt)),
        title: slot.title,
      },
      success: "",
    });
  };

  const resetForm = () => {
    const nextTimes = getDefaultFormTimes();
    setState({
      form: {
        capacity: "4",
        editingId: null,
        endsAt: nextTimes.endsAt,
        startsAt: nextTimes.startsAt,
        title: "Open Darkroom",
      },
    });
  };

  if (isLoading) {
    return <p className="text-xs text-neutral-500">Loading schedule</p>;
  }

  return (
    <div className="space-y-6">
      {(error || loadError) && (
        <p className="border border-red-900/30 bg-red-900/10 px-4 py-3 text-xs text-red-400">
          {error || "Failed to load darkroom schedule."}
        </p>
      )}
      {success && (
        <p className="border border-green-900/30 bg-green-900/10 px-4 py-3 text-xs text-green-400">
          {success}
        </p>
      )}

      <ScheduleForm
        busy={busyAction === "save"}
        form={form}
        onCancelEdit={resetForm}
        onChange={(patch) => setState({ form: { ...form, ...patch } })}
        onSubmit={handleSubmit}
      />

      <ScheduleSlotSection
        busyAction={busyAction}
        emptyLabel="No upcoming timeslots."
        label={`Upcoming Timeslots (${upcomingSlots.length})`}
        slots={upcomingSlots}
        action={(
          <WeeklyJoinPostControl
            busy={busyAction === "weekly-message"}
            onPost={handlePostWeeklyJoinMessage}
            onWeekChange={(weekStartIso) => setState({ postWeekStartIso: weekStartIso })}
            options={weeklyPostOptions}
            selectedWeekStartIso={postWeekStartIso}
          />
        )}
        onCancel={handleCancel}
        onEnd={handleEndSession}
        onEdit={startEditing}
        onRetrySync={handleRetrySync}
      />

      {archivedSlots.length > 0 && (
        <ScheduleSlotSection
          busyAction={busyAction}
          emptyLabel="No archived timeslots."
          label={`Archived (${archivedSlots.length})`}
          slots={archivedSlots}
          action={hasArchivedChannels ? (
            <button
              type="button"
              disabled={busyAction === "cleanup-archived"}
              onClick={handleCleanupArchived}
              className={`${actionButtonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30`}
            >
              <Trash2 className="size-3" aria-hidden="true" />
              {busyAction === "cleanup-archived" ? "Cleaning" : "Clean Archived"}
            </button>
          ) : undefined}
          onCancel={handleCancel}
          onEnd={handleEndSession}
          onEdit={startEditing}
          onRetrySync={handleRetrySync}
        />
      )}
    </div>
  );
}

interface WeeklyJoinPostControlProps {
  busy: boolean;
  onPost: () => void;
  onWeekChange: (weekStartIso: string) => void;
  options: WeeklyPostOption[];
  selectedWeekStartIso: string;
}

function WeeklyJoinPostControl({
  busy,
  onPost,
  onWeekChange,
  options,
  selectedWeekStartIso,
}: WeeklyJoinPostControlProps) {
  return (
    <div className="flex w-full flex-col gap-2 border border-blue-950/60 bg-blue-950/10 p-3 [color-scheme:dark] sm:w-auto sm:flex-row sm:items-center">
      <label className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-64">
        <CalendarRange className="size-3 shrink-0 text-blue-300" aria-hidden="true" />
        <span className="sr-only">Weekly join message week</span>
        <select
          className="min-h-9 min-w-0 flex-1 bg-transparent px-2 text-xs text-neutral-200 outline-none"
          disabled={busy}
          onChange={(event) => onWeekChange(event.target.value)}
          value={selectedWeekStartIso}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={onPost}
        className={`${actionButtonClass} shrink-0 border-blue-900/60 text-blue-300 hover:border-blue-700 hover:bg-blue-950/20`}
      >
        <Send className="size-3" aria-hidden="true" />
        {busy ? "Posting" : "Post Weekly Join"}
      </button>
    </div>
  );
}

interface ScheduleFormProps {
  busy: boolean;
  form: ScheduleFormState;
  onCancelEdit: () => void;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function ScheduleForm({ busy, form, onCancelEdit, onChange, onSubmit }: ScheduleFormProps) {
  return (
    <form onSubmit={onSubmit} className="border border-neutral-800 bg-white/[0.02] p-6">
      <div className="mb-5 flex items-center justify-between gap-3 [color-scheme:dark]">
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
          {form.editingId ? "Edit Timeslot" : "Create Timeslot"}
        </p>
        <CalendarPlus className="size-4 text-neutral-600" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">Title</span>
          <input
            className={inputClass}
            maxLength={80}
            onChange={(event) => onChange({ title: event.target.value })}
            required
            type="text"
            value={form.title}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">Capacity</span>
          <input
            className={inputClass}
            max={24}
            min={1}
            onChange={(event) => onChange({ capacity: event.target.value })}
            required
            type="number"
            value={form.capacity}
          />
        </label>
        <label className="block [color-scheme:dark]">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600 [color-scheme:dark]">Starts</span>
          <input
            className={inputClass}
            onChange={(event) => onChange({ startsAt: event.target.value })}
            required
            type="datetime-local"
            value={form.startsAt}
          />
        </label>
        <label className="block [color-scheme:dark]">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600 [color-scheme:dark]">Ends</span>
          <input
            className={inputClass}
            onChange={(event) => onChange({ endsAt: event.target.value })}
            required
            type="datetime-local"
            value={form.endsAt}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          className="min-h-10 bg-white px-5 text-[10px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50 [color-scheme:dark]"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving" : form.editingId ? "Update Timeslot" : "Create Timeslot"}
        </button>
        {form.editingId && (
          <button
            className="min-h-10 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
            disabled={busy}
            onClick={onCancelEdit}
            type="button"
          >
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}

interface ScheduleSlotSectionProps {
  action?: ReactNode;
  busyAction: string | null;
  emptyLabel: string;
  label: string;
  onCancel: (slotId: string) => void;
  onEnd: (slotId: string) => void;
  onEdit: (slot: AdminDarkroomScheduleSlot) => void;
  onRetrySync: (slotId: string) => void;
  slots: AdminDarkroomScheduleSlot[];
}

function ScheduleSlotSection({
  action,
  busyAction,
  emptyLabel,
  label,
  onCancel,
  onEnd,
  onEdit,
  onRetrySync,
  slots,
}: ScheduleSlotSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">{label}</p>
        {action}
      </div>
      {slots.length === 0 ? (
        <p className="text-xs text-neutral-700">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => (
            <ScheduleSlotRow
              busyAction={busyAction}
              key={slot.id}
              slot={slot}
              onCancel={onCancel}
              onEnd={onEnd}
              onEdit={onEdit}
              onRetrySync={onRetrySync}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ScheduleSlotRowProps {
  busyAction: string | null;
  onCancel: (slotId: string) => void;
  onEnd: (slotId: string) => void;
  onEdit: (slot: AdminDarkroomScheduleSlot) => void;
  onRetrySync: (slotId: string) => void;
  slot: AdminDarkroomScheduleSlot;
}

function ScheduleSlotRow({ busyAction, onCancel, onEnd, onEdit, onRetrySync, slot }: ScheduleSlotRowProps) {
  const syncTone = getSyncTone(slot.discordSyncStatus);
  const now = new Date();
  const isPastDeadline = new Date(slot.endsAt) <= now;
  const isStarted = new Date(slot.startsAt) <= now;

  return (
    <article className="border border-neutral-800 bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm text-neutral-100">{slot.title}</h3>
            <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${syncTone}`}>
              {slot.discordSyncStatus}
            </span>
            {slot.status === "cancelled" && (
              <span className="border border-red-900 bg-red-950/20 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-red-300">
                Cancelled
              </span>
            )}
            {isPastDeadline && (
              <span className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-neutral-400">
                Ended
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-neutral-500">
            {formatDateTime(slot.startsAt)} - {formatTime(slot.endsAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5 border border-neutral-800 px-2 py-1">
              <Users className="size-3" aria-hidden="true" />
              {slot.registeredCount}/{slot.capacity}
            </span>
            {slot.discordChannelId && (
              <span className="border border-neutral-800 px-2 py-1">Channel {slot.discordChannelId}</span>
            )}
          </div>
          {slot.discordSyncError && (
            <p className="mt-2 max-w-3xl text-[10px] text-amber-400">{slot.discordSyncError}</p>
          )}
          {(slot.registrants ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(slot.registrants ?? []).map((registrant) => (
                <span key={registrant.userId} className="border border-neutral-800 bg-neutral-950 px-2 py-1 text-[10px] text-neutral-400">
                  {registrant.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button type="button" onClick={() => onEdit(slot)} className={`${actionButtonClass} border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-100`}>
            <Pencil className="size-3" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            disabled={busyAction === `sync:${slot.id}`}
            onClick={() => onRetrySync(slot.id)}
            className={`${actionButtonClass} border-blue-900/60 text-blue-300 hover:border-blue-700 hover:bg-blue-950/20`}
          >
            <RefreshCcw className="size-3" aria-hidden="true" />
            {busyAction === `sync:${slot.id}` ? "Syncing" : "Retry Sync"}
          </button>
          {slot.status !== "cancelled" && isStarted && !isPastDeadline && (
            <button
              type="button"
              disabled={busyAction === `end:${slot.id}`}
              onClick={() => onEnd(slot.id)}
              className={`${actionButtonClass} border-amber-900/60 text-amber-300 hover:border-amber-700 hover:bg-amber-950/20`}
            >
              <CircleStop className="size-3" aria-hidden="true" />
              {busyAction === `end:${slot.id}` ? "Ending" : "End Session"}
            </button>
          )}
          {slot.status !== "cancelled" && !isPastDeadline && (
            <button
              type="button"
              disabled={busyAction === `cancel:${slot.id}`}
              onClick={() => onCancel(slot.id)}
              className={`${actionButtonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30`}
            >
              <XCircle className="size-3" aria-hidden="true" />
              {busyAction === `cancel:${slot.id}` ? "Cancelling" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function getSyncTone(status: AdminDarkroomScheduleSlot["discordSyncStatus"]) {
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

function buildWeeklyPostOptions(slots: AdminDarkroomScheduleSlot[], selectedWeekStartIso: string): WeeklyPostOption[] {
  const currentWeekStart = startOfUtcSunday(new Date());
  const weekStarts = new Set<string>([
    selectedWeekStartIso,
    currentWeekStart.toISOString(),
    addDays(currentWeekStart, 7).toISOString(),
    addDays(currentWeekStart, 14).toISOString(),
    addDays(currentWeekStart, 21).toISOString(),
  ]);

  slots.forEach((slot) => {
    weekStarts.add(startOfUtcSunday(new Date(slot.startsAt)).toISOString());
  });

  return Array.from(weekStarts)
    .toSorted()
    .map((weekStartIso) => {
      const weekStart = new Date(weekStartIso);
      const slotCount = countSlotsForWeek(slots, weekStart);

      return {
        label: `${formatWeekRange(weekStart)} (${slotCount} slot${slotCount === 1 ? "" : "s"})`,
        slotCount,
        value: weekStartIso,
      };
    });
}

function countSlotsForWeek(slots: AdminDarkroomScheduleSlot[], weekStart: Date) {
  const startMs = weekStart.getTime();
  const endMs = addDays(weekStart, 8).getTime();

  return slots.filter((slot) => {
    const slotStartMs = Date.parse(slot.startsAt);
    return slot.status === "open" && slotStartMs >= startMs && slotStartMs < endMs;
  }).length;
}

function getDefaultPostWeekStartIso() {
  return startOfUtcSunday(new Date()).toISOString();
}

function startOfUtcSunday(date: Date) {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(utcMidnight).getUTCDay();
  return new Date(utcMidnight - (day * DAY_MS));
}

function startOfLocalSunday(date: Date) {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(localMidnight, -localMidnight.getDay());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + (days * DAY_MS));
}

function getDefaultFormTimes() {
  const now = new Date();
  const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  return {
    endsAt: toDateTimeLocalValue(new Date(nextHour.getTime() + (2 * 60 * 60 * 1_000))),
    startsAt: toDateTimeLocalValue(nextHour),
  };
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWeekRange(weekStart: Date) {
  return `${formatMonthDay(weekStart)} - ${formatMonthDay(addDays(weekStart, 7))}`;
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
