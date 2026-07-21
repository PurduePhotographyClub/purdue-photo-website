import type { FormEvent, ReactNode } from "react";
import {
  CalendarPlus,
  CalendarRange,
  CircleStop,
  Pencil,
  RefreshCcw,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { getPrivateRoomSyncLabel } from "@/lib/discord-private-room";

export interface DarkroomScheduleRegistrant {
  discordId: string | null;
  email: string | null;
  name: string;
  registeredAt: string;
  userId: string;
}

export interface AdminDarkroomScheduleSlot {
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

export interface WeeklyPostOption {
  label: string;
  slotCount: number;
  value: string;
}

export interface ScheduleFormState {
  capacity: string;
  endsAt: string;
  startsAt: string;
  title: string;
}

interface AdminDarkroomCreateFormProps {
  busy: boolean;
  form: ScheduleFormState;
  inputClass: string;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AdminDarkroomCreateForm({
  busy,
  form,
  inputClass,
  onChange,
  onSubmit,
}: AdminDarkroomCreateFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="border border-neutral-800 bg-white/[0.02] p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3 [color-scheme:dark]">
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
          Create Timeslot
        </p>
        <CalendarPlus className="size-4 text-neutral-600" aria-hidden="true" />
      </div>
      <p className="mb-5 max-w-2xl text-xs text-neutral-500">
        Create a new darkroom opening without affecting existing timeslots.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">
            Title
          </span>
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
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600">
            Capacity
          </span>
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
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600 [color-scheme:dark]">
            Starts
          </span>
          <input
            className={inputClass}
            onChange={(event) => onChange({ startsAt: event.target.value })}
            required
            type="datetime-local"
            value={form.startsAt}
          />
        </label>
        <label className="block [color-scheme:dark]">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-600 [color-scheme:dark]">
            Ends
          </span>
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
          {busy ? "Saving" : "Create Timeslot"}
        </button>
      </div>
    </form>
  );
}

interface AdminDarkroomSlotPanelsProps {
  actionButtonClass: string;
  archivedSlots: AdminDarkroomScheduleSlot[];
  busyAction: string | null;
  formatDateTime: (value: string) => string;
  formatTime: (value: string) => string;
  postWeekStartIso: string;
  upcomingSlots: AdminDarkroomScheduleSlot[];
  weeklyPostOptions: WeeklyPostOption[];
  onCancel: (slotId: string) => void;
  onEdit: (slot: AdminDarkroomScheduleSlot) => void;
  onEnd: (slotId: string) => void;
  onPostWeeklyJoinMessage: () => void;
  onRetrySync: (slotId: string) => void;
  onWeekChange: (weekStartIso: string) => void;
}

export function AdminDarkroomSlotPanels({
  actionButtonClass,
  archivedSlots,
  busyAction,
  formatDateTime,
  formatTime,
  postWeekStartIso,
  upcomingSlots,
  weeklyPostOptions,
  onCancel,
  onEdit,
  onEnd,
  onPostWeeklyJoinMessage,
  onRetrySync,
  onWeekChange,
}: AdminDarkroomSlotPanelsProps) {
  return (
    <>
      <ScheduleSlotSection
        action={
          <WeeklyJoinPostControl
            actionButtonClass={actionButtonClass}
            busy={busyAction === "weekly-message"}
            onPost={onPostWeeklyJoinMessage}
            onWeekChange={onWeekChange}
            options={weeklyPostOptions}
            selectedWeekStartIso={postWeekStartIso}
          />
        }
        actionButtonClass={actionButtonClass}
        busyAction={busyAction}
        emptyLabel="No upcoming timeslots."
        formatDateTime={formatDateTime}
        formatTime={formatTime}
        label={`Upcoming Timeslots (${upcomingSlots.length})`}
        slots={upcomingSlots}
        onCancel={onCancel}
        onEdit={onEdit}
        onEnd={onEnd}
        onRetrySync={onRetrySync}
      />
      {archivedSlots.length > 0 && (
        <ScheduleSlotSection
          actionButtonClass={actionButtonClass}
          busyAction={busyAction}
          emptyLabel="No archived timeslots."
          formatDateTime={formatDateTime}
          formatTime={formatTime}
          label={`Archived (${archivedSlots.length})`}
          slots={archivedSlots}
          onCancel={onCancel}
          onEdit={onEdit}
          onEnd={onEnd}
          onRetrySync={onRetrySync}
        />
      )}
    </>
  );
}

interface WeeklyJoinPostControlProps {
  actionButtonClass: string;
  busy: boolean;
  onPost: () => void;
  onWeekChange: (weekStartIso: string) => void;
  options: WeeklyPostOption[];
  selectedWeekStartIso: string;
}

function WeeklyJoinPostControl({
  actionButtonClass,
  busy,
  onPost,
  onWeekChange,
  options,
  selectedWeekStartIso,
}: WeeklyJoinPostControlProps) {
  return (
    <div className="flex w-full flex-col gap-2 border border-blue-950/60 bg-blue-950/10 p-3 [color-scheme:dark] sm:w-auto sm:flex-row sm:items-center">
      <label className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-64">
        <CalendarRange
          className="size-3 shrink-0 text-blue-300"
          aria-hidden="true"
        />
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

interface ScheduleSlotSectionProps {
  action?: ReactNode;
  actionButtonClass: string;
  busyAction: string | null;
  emptyLabel: string;
  formatDateTime: (value: string) => string;
  formatTime: (value: string) => string;
  label: string;
  onCancel: (slotId: string) => void;
  onEnd: (slotId: string) => void;
  onEdit: (slot: AdminDarkroomScheduleSlot) => void;
  onRetrySync: (slotId: string) => void;
  slots: AdminDarkroomScheduleSlot[];
}

function ScheduleSlotSection({
  action,
  actionButtonClass,
  busyAction,
  emptyLabel,
  formatDateTime,
  formatTime,
  label,
  onCancel,
  onEdit,
  onEnd,
  onRetrySync,
  slots,
}: ScheduleSlotSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
          {label}
        </p>
        {action}
      </div>
      {slots.length === 0 ? (
        <p className="text-xs text-neutral-700">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => (
            <ScheduleSlotRow
              actionButtonClass={actionButtonClass}
              busyAction={busyAction}
              formatDateTime={formatDateTime}
              formatTime={formatTime}
              key={slot.id}
              slot={slot}
              onCancel={onCancel}
              onEdit={onEdit}
              onEnd={onEnd}
              onRetrySync={onRetrySync}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ScheduleSlotRowProps {
  actionButtonClass: string;
  busyAction: string | null;
  formatDateTime: (value: string) => string;
  formatTime: (value: string) => string;
  onCancel: (slotId: string) => void;
  onEnd: (slotId: string) => void;
  onEdit: (slot: AdminDarkroomScheduleSlot) => void;
  onRetrySync: (slotId: string) => void;
  slot: AdminDarkroomScheduleSlot;
}

function ScheduleSlotRow({
  actionButtonClass,
  busyAction,
  formatDateTime,
  formatTime,
  onCancel,
  onEdit,
  onEnd,
  onRetrySync,
  slot,
}: ScheduleSlotRowProps) {
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
            <span
              className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${syncTone}`}
            >
              {getPrivateRoomSyncLabel(slot.discordSyncStatus)}
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
              <span className="border border-neutral-800 px-2 py-1">
                Thread ID {slot.discordChannelId}
              </span>
            )}
          </div>
          {slot.discordSyncError && (
            <p className="mt-2 max-w-3xl text-[10px] text-amber-400">
              {slot.discordSyncError}
            </p>
          )}
          {(slot.registrants ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(slot.registrants ?? []).map((registrant) => (
                <span
                  key={registrant.userId}
                  className="border border-neutral-800 bg-neutral-950 px-2 py-1 text-[10px] text-neutral-400"
                >
                  {registrant.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => onEdit(slot)}
            className={`${actionButtonClass} border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-100`}
          >
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
