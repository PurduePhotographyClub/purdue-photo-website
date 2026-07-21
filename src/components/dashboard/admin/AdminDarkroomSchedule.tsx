import { useMemo, useReducer } from "react";
import type { FormEvent } from "react";
import useSWR from "swr";
import {
  fetchApi,
  fetchJson,
  SCHEDULE_SWR_OPTIONS,
  readErrorMessage,
  readJson,
} from "@/lib/http";
import {
  addClubCalendarDays,
  clubDateTimeInputToUtcIso,
  clubDateTimeToUtcIso,
  CLUB_TIME_ZONE,
  getClubDateParts,
  startOfClubSunday,
  toClubDateTimeLocalValue,
  type ClubDateParts,
} from "@/lib/club-time";
import AdminDarkroomEditDialog from "./AdminDarkroomEditDialog";
import {
  AdminDarkroomCreateForm,
  AdminDarkroomSlotPanels,
  type AdminDarkroomScheduleSlot,
  type ScheduleFormState,
  type WeeklyPostOption,
} from "./AdminDarkroomSchedulePanels";

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

interface EditDialogState {
  error: string;
  form: ScheduleFormState;
  slot: AdminDarkroomScheduleSlot;
}

interface AdminDarkroomScheduleState {
  busyAction: string | null;
  createForm: ScheduleFormState;
  editState: EditDialogState | null;
  error: string;
  postWeekStartIso: string;
  success: string;
  syncWarning: string;
}

const inputClass =
  "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";
const actionButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function AdminDarkroomFeedback({ error, success, syncWarning }: { error: string; success: string; syncWarning: string }) {
  return (
    <>
      {error && <p className="border border-red-900/30 bg-red-900/10 px-4 py-3 text-xs text-red-400">{error}</p>}
      {success && <p role="status" className="border border-green-900/30 bg-green-900/10 px-4 py-3 text-xs text-green-400">{success}</p>}
      {syncWarning && <p role="status" className="border border-amber-900/40 bg-amber-950/15 px-4 py-3 text-xs text-amber-300">{syncWarning}</p>}
    </>
  );
}

function createInitialAdminDarkroomScheduleState(): AdminDarkroomScheduleState {
  return {
    busyAction: null,
    createForm: createDefaultScheduleFormState(),
    editState: null,
    error: "",
    postWeekStartIso: getDefaultPostWeekStartIso(),
    success: "",
    syncWarning: "",
  };
}

function adminDarkroomScheduleReducer(
  state: AdminDarkroomScheduleState,
  patch: Partial<AdminDarkroomScheduleState>,
): AdminDarkroomScheduleState {
  return { ...state, ...patch };
}

async function postWeeklyJoinMessage(
  postWeekStartIso: string,
  setState: (patch: Partial<AdminDarkroomScheduleState>) => void,
  mutate: () => Promise<unknown>,
) {
  setState({ busyAction: "weekly-message", error: "", success: "", syncWarning: "" });

  try {
    const weekStart = getClubDateParts(new Date(postWeekStartIso));
    const displayWeekEnd = addClubCalendarDays(weekStart, 6);
    const queryWeekEnd = clubDateTimeToUtcIso(addClubCalendarDays(weekStart, 7), 0);
    const response = await fetchApi("/api/admin/darkroom/schedule/weekly-message", {
      body: JSON.stringify({
        displayEnd: clubDateTimeToUtcIso(displayWeekEnd, 0),
        end: queryWeekEnd,
        start: clubDateTimeToUtcIso(weekStart, 0),
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
    const truncatedCopy = result.truncated
      ? " Discord shows the first 25 slots; the website calendar has the full week."
      : "";
    setState({
      success: `Weekly join message posted for ${formatWeekRange(weekStart)} with ${slotCopy}.${truncatedCopy}`,
    });
  } catch {
    setState({ error: "Failed to post weekly join message." });
  } finally {
    setState({ busyAction: null });
  }
}

function startEditingSlot(
  slot: AdminDarkroomScheduleSlot,
  setState: (patch: Partial<AdminDarkroomScheduleState>) => void,
) {
  setState({
    editState: {
      error: "",
      form: createScheduleFormStateFromSlot(slot),
      slot,
    },
    error: "",
    success: "",
    syncWarning: "",
  });
}

function resetDarkroomCreateForm(
  setState: (patch: Partial<AdminDarkroomScheduleState>) => void,
) {
  setState({
    createForm: createDefaultScheduleFormState(),
  });
}

interface DarkroomSlotActionOptions {
  busyAction: string;
  errorMessage: string;
  requestInit: RequestInit;
  successMessage: string;
  syncWarningFromResponse?: boolean;
}

async function runDarkroomSlotAction(
  slotId: string,
  options: DarkroomSlotActionOptions,
  setState: (patch: Partial<AdminDarkroomScheduleState>) => void,
  mutate: () => Promise<unknown>,
) {
  setState({
    busyAction: `${options.busyAction}:${slotId}`,
    error: "",
    success: "",
    syncWarning: "",
  });

  try {
    const response = await fetchApi(
      `/api/admin/darkroom/schedule/${slotId}${options.busyAction === "sync" ? "/sync" : ""}`,
      options.requestInit,
    );
    if (!response.ok) {
      setState({ error: await readErrorMessage(response, options.errorMessage) });
      return;
    }

    const result = options.syncWarningFromResponse
      ? await readJson<AdminDarkroomScheduleMutationResponse>(response)
      : null;
    setState({
      success: options.successMessage,
      syncWarning: result?.discordSyncWarning ?? "",
    });
    await mutate();
  } catch {
    setState({ error: options.errorMessage });
  } finally {
    setState({ busyAction: null });
  }
}

export default function AdminDarkroomSchedule() {
  const [state, setState] = useReducer(
    adminDarkroomScheduleReducer,
    undefined,
    createInitialAdminDarkroomScheduleState,
  );
  const {
    busyAction,
    createForm,
    editState,
    error,
    postWeekStartIso,
    success,
    syncWarning,
  } =
    state;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<AdminDarkroomScheduleResponse>(
    "/api/admin/darkroom/schedule",
    fetchJson,
    SCHEDULE_SWR_OPTIONS,
  );
  const slots = data?.slots ?? [];
  const now = new Date();
  const upcomingSlots = slots.filter(
    (slot) => slot.status === "open" && new Date(slot.endsAt) > now,
  );
  const archivedSlots = slots.filter(
    (slot) =>
      slot.status === "cancelled" ||
      slot.discordSyncStatus === "archived" ||
      new Date(slot.endsAt) <= now,
  );
  const weeklyPostOptions = useMemo(
    () => buildWeeklyPostOptions(upcomingSlots, postWeekStartIso),
    [postWeekStartIso, upcomingSlots],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ busyAction: "create", error: "", success: "", syncWarning: "" });

    try {
      const startsAt = clubDateTimeInputToUtcIso(createForm.startsAt);
      const endsAt = clubDateTimeInputToUtcIso(createForm.endsAt);
      if (!startsAt || !endsAt) {
        setState({ error: "Choose valid club-local start and end times." });
        return;
      }
      const response = await fetchApi("/api/admin/darkroom/schedule", {
        body: JSON.stringify({
          capacity: Number.parseInt(createForm.capacity, 10),
          endsAt,
          startsAt,
          title: createForm.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setState({
          error: await readErrorMessage(response, "Failed to create timeslot."),
        });
        return;
      }

      const result =
        await readJson<AdminDarkroomScheduleMutationResponse>(response);
      setState({
        success: "Timeslot created.",
        syncWarning: result.discordSyncWarning ?? "",
      });
      resetDarkroomCreateForm(setState);
      await mutate();
    } catch {
      setState({ error: "Failed to create timeslot." });
    } finally {
      setState({ busyAction: null });
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editState) return;

    setState({ busyAction: `edit:${editState.slot.id}`, error: "", success: "", syncWarning: "" });

    try {
      const startsAt = clubDateTimeInputToUtcIso(editState.form.startsAt);
      const endsAt = clubDateTimeInputToUtcIso(editState.form.endsAt);
      if (!startsAt || !endsAt) {
        setState({
          busyAction: null,
          editState: { ...editState, error: "Choose valid club-local start and end times." },
        });
        return;
      }

      const response = await fetchApi(
        `/api/admin/darkroom/schedule/${editState.slot.id}`,
        {
          body: JSON.stringify({
            capacity: Number.parseInt(editState.form.capacity, 10),
            endsAt,
            startsAt,
            title: editState.form.title,
          }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
      );

      if (!response.ok) {
        setState({
          busyAction: null,
          editState: {
            ...editState,
            error: await readErrorMessage(response, "Failed to update timeslot."),
          },
        });
        return;
      }

      const result =
        await readJson<AdminDarkroomScheduleMutationResponse>(response);
      setState({
        editState: null,
        success: "Timeslot updated.",
        syncWarning: result.discordSyncWarning ?? "",
      });
      await mutate();
    } catch {
      setState({
        busyAction: null,
        editState: { ...editState, error: "Failed to update timeslot." },
      });
      return;
    }

    setState({ busyAction: null });
  };

  const handleCancel = (slotId: string) => runDarkroomSlotAction(slotId, {
    busyAction: "cancel",
    errorMessage: "Failed to cancel timeslot.",
    requestInit: { method: "DELETE" },
    successMessage: "Timeslot cancelled.",
    syncWarningFromResponse: true,
  }, setState, mutate);

  const handleEndSession = (slotId: string) => runDarkroomSlotAction(slotId, {
    busyAction: "end",
    errorMessage: "Failed to end session.",
    requestInit: {
      body: JSON.stringify({ action: "end" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    successMessage: "Session ended.",
    syncWarningFromResponse: true,
  }, setState, mutate);

  const handleRetrySync = (slotId: string) => runDarkroomSlotAction(slotId, {
    busyAction: "sync",
    errorMessage: "Failed to sync timeslot with Discord.",
    requestInit: { method: "POST" },
    successMessage: "Discord sync completed.",
  }, setState, mutate);

  const handlePostWeeklyJoinMessage = () => postWeeklyJoinMessage(postWeekStartIso, setState, mutate);

  const openEditDialog = (slot: AdminDarkroomScheduleSlot) => startEditingSlot(slot, setState);
  const closeEditDialog = () => setState({ busyAction: null, editState: null });

  if (isLoading) {
    return <p className="text-xs text-neutral-500">Loading schedule</p>;
  }

  return (
    <div className="space-y-6">
      <AdminDarkroomFeedback
        error={error || (loadError ? "Failed to load darkroom schedule." : "")}
        success={success}
        syncWarning={syncWarning}
      />

      <AdminDarkroomCreateForm
        busy={busyAction === "create"}
        form={createForm}
        inputClass={inputClass}
        onChange={(patch) => setState({ createForm: { ...createForm, ...patch } })}
        onSubmit={handleSubmit}
      />

      <AdminDarkroomSlotPanels
        archivedSlots={archivedSlots}
        actionButtonClass={actionButtonClass}
        busyAction={busyAction}
        formatDateTime={formatDateTime}
        formatTime={formatTime}
        postWeekStartIso={postWeekStartIso}
        upcomingSlots={upcomingSlots}
        weeklyPostOptions={weeklyPostOptions}
        onCancel={handleCancel}
        onEdit={openEditDialog}
        onEnd={handleEndSession}
        onPostWeeklyJoinMessage={handlePostWeeklyJoinMessage}
        onRetrySync={handleRetrySync}
        onWeekChange={(weekStartIso) => setState({ postWeekStartIso: weekStartIso })}
      />
      {editState && (
        <AdminDarkroomEditDialog
          busy={busyAction === `edit:${editState.slot.id}`}
          error={editState.error}
          form={editState.form}
          inputClass={inputClass}
          onChange={(patch) =>
            setState({
              editState: {
                ...editState,
                form: { ...editState.form, ...patch },
              },
            })
          }
          onClose={closeEditDialog}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}

function buildWeeklyPostOptions(
  slots: AdminDarkroomScheduleSlot[],
  selectedWeekStartIso: string,
): WeeklyPostOption[] {
  const currentWeekStart = startOfClubSunday(new Date());
  const weekStarts = new Set<string>([
    selectedWeekStartIso,
    clubDateTimeToUtcIso(currentWeekStart, 0),
    clubDateTimeToUtcIso(addClubCalendarDays(currentWeekStart, 7), 0),
    clubDateTimeToUtcIso(addClubCalendarDays(currentWeekStart, 14), 0),
    clubDateTimeToUtcIso(addClubCalendarDays(currentWeekStart, 21), 0),
  ]);

  slots.forEach((slot) => {
    weekStarts.add(
      clubDateTimeToUtcIso(startOfClubSunday(new Date(slot.startsAt)), 0),
    );
  });

  return Array.from(weekStarts)
    .toSorted()
    .map((weekStartIso) => {
      const weekStart = getClubDateParts(new Date(weekStartIso));
      const slotCount = countSlotsForWeek(slots, weekStart);

      return {
        label: `${formatWeekRange(weekStart)} (${slotCount} slot${slotCount === 1 ? "" : "s"})`,
        slotCount,
        value: weekStartIso,
      };
    });
}

function countSlotsForWeek(
  slots: AdminDarkroomScheduleSlot[],
  weekStart: ClubDateParts,
) {
  const startMs = Date.parse(clubDateTimeToUtcIso(weekStart, 0));
  const endMs = Date.parse(
    clubDateTimeToUtcIso(addClubCalendarDays(weekStart, 7), 0),
  );

  return slots.filter((slot) => {
    const slotStartMs = Date.parse(slot.startsAt);
    return (
      slot.status === "open" && slotStartMs >= startMs && slotStartMs < endMs
    );
  }).length;
}

function getDefaultPostWeekStartIso() {
  return clubDateTimeToUtcIso(startOfClubSunday(new Date()), 0);
}

function createScheduleFormStateFromSlot(slot: AdminDarkroomScheduleSlot): ScheduleFormState {
  return {
    capacity: String(slot.capacity),
    endsAt: toClubDateTimeLocalValue(new Date(slot.endsAt)),
    startsAt: toClubDateTimeLocalValue(new Date(slot.startsAt)),
    title: slot.title,
  };
}

function createDefaultScheduleFormState(): ScheduleFormState {
  const nextTimes = getDefaultFormTimes();

  return {
    capacity: "4",
    endsAt: nextTimes.endsAt,
    startsAt: nextTimes.startsAt,
    title: "Open Darkroom",
  };
}

function getDefaultFormTimes() {
  const now = new Date();
  const nextHour = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + 1,
    0,
  );
  return {
    endsAt: toClubDateTimeLocalValue(
      new Date(nextHour.getTime() + 2 * 60 * 60 * 1_000),
    ),
    startsAt: toClubDateTimeLocalValue(nextHour),
  };
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

function formatWeekRange(weekStart: ClubDateParts) {
  return `${formatMonthDay(weekStart)} - ${formatMonthDay(addClubCalendarDays(weekStart, 6))}`;
}

function formatMonthDay(parts: ClubDateParts) {
  return new Date(clubDateTimeToUtcIso(parts, 12)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: CLUB_TIME_ZONE,
  });
}
