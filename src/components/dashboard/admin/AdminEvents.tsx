import { useEffect, useMemo, useReducer, useRef } from "react";
import useSWR from "swr";
import { AlertTriangle, CalendarDays, Clock, MapPin, Pencil, Plus, Radio, RefreshCw, Save, Trash2, X } from "lucide-react";
import { clubDateTimeInputToUtcIso, toClubDateTimeLocalValue } from "@/lib/club-time";
import {
  formatEventDateTime,
  getEventDiscordActionLabel,
  getEventDiscordState,
  getEventStatus,
  getEventStart,
  normalizeEvent,
  removeEventRow,
  upsertEventRow,
  type WebsiteEvent,
} from "@/lib/events";
import { useEventClock } from "@/hooks/useEventClock";
import {
  ADMIN_EVENTS_SWR_OPTIONS,
  fetchApi,
  fetchFreshJson,
  readErrorMessage
} from "@/lib/http";

interface EventResponse extends Omit<WebsiteEvent, "discordSynced" | "discordSyncError" | "discordSyncStatus"> {
  discordSynced?: boolean;
  discordSyncError?: string;
  discordSyncStatus?: "failed" | "not_applicable" | "synced";
}

interface EventFormState {
  title: string;
  startsAt: string;
  endsAt: string;
  description: string;
  location: string;
}

const emptyForm: EventFormState = {
  title: "",
  startsAt: "",
  endsAt: "",
  description: "",
  location: "",
};

interface EventsUiState {
  creating: boolean;
  deleteConfirmId: string | null;
  deletingId: string | null;
  editState: EventFormState;
  editingId: string | null;
  error: string;
  formState: EventFormState;
  notice: string;
  submitting: boolean;
  syncingId: string | null;
}

type EventsUiAction =
  | { type: "clearMessages" }
  | { type: "eventCreated" }
  | { type: "eventUpdated" }
  | { type: "patch"; value: Partial<EventsUiState> };

const initialEventsUiState: EventsUiState = {
  creating: false,
  deleteConfirmId: null,
  deletingId: null,
  editState: emptyForm,
  editingId: null,
  error: "",
  formState: emptyForm,
  notice: "",
  submitting: false,
  syncingId: null,
};

function eventsUiReducer(state: EventsUiState, action: EventsUiAction): EventsUiState {
  switch (action.type) {
    case "clearMessages":
      return { ...state, error: "", notice: "" };
    case "eventCreated":
      return { ...state, creating: false, formState: emptyForm };
    case "eventUpdated":
      return { ...state, editingId: null, editState: emptyForm };
    case "patch":
      return { ...state, ...action.value };
  }
}

export default function AdminEvents({ canDelete }: { canDelete: boolean }) {
  const [uiState, dispatch] = useReducer(eventsUiReducer, initialEventsUiState);
  const {
    creating,
    deleteConfirmId,
    deletingId,
    editState,
    editingId,
    error,
    formState,
    notice,
    submitting,
    syncingId,
  } = uiState;
  const { data: eventRows, error: loadError, isLoading, mutate } = useSWR<Record<string, unknown>[]>(
    "/api/events?limit=100",
    fetchFreshJson,
    ADMIN_EVENTS_SWR_OPTIONS,
  );
  const now = useEventClock();

  const events = useMemo(
    () => (eventRows || [])
      .map(normalizeEvent)
      .sort((a, b) => getEventStart(b).getTime() - getEventStart(a).getTime()),
    [eventRows]
  );

  const setError = (value: string) => dispatch({ type: "patch", value: { error: value } });
  const setNotice = (value: string) => dispatch({ type: "patch", value: { notice: value } });
  const setSubmitting = (value: boolean) => dispatch({ type: "patch", value: { submitting: value } });
  const setFormState = (value: EventFormState) => dispatch({ type: "patch", value: { formState: value } });
  const setEditState = (value: EventFormState) => dispatch({ type: "patch", value: { editState: value } });

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const eventWindow = readEventWindow(formState);
      if (!eventWindow.ok) {
        setError(eventWindow.error);
        return;
      }

      const form = new FormData();
      form.append("title", formState.title);
      form.append("date", eventWindow.startsAt);
      form.append("endsAt", eventWindow.endsAt);
      if (formState.description) form.append("description", formState.description);
      if (formState.location) form.append("location", formState.location);

      const res = await fetchApi("/api/events", { method: "POST", body: form });
      const data = await res.json().catch(() => null) as EventResponse | { error?: string } | null;

      if (res.ok && data && "id" in data) {
        const response = data as EventResponse;
        await mutate(
          (current) => upsertEventRow(current, response as unknown as Record<string, unknown>),
          { revalidate: false },
        );
        dispatch({ type: "eventCreated" });

        if (response?.discordSyncError) {
          setError(response.discordSyncError);
          setNotice("Event saved on the website. Use Retry Discord sync when the service is available.");
        } else if (response?.discordEventId) {
          setNotice("Event saved and added to Discord events.");
        } else {
          setNotice("Event saved. This event is outside Discord's schedulable window.");
        }
      } else {
        setError(data && "error" in data && data.error ? data.error : "Failed to create event.");
      }
    } catch {
      setError("Unable to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const beginEdit = (event: WebsiteEvent) => {
    dispatch({
      type: "patch",
      value: {
        editingId: event.id,
        editState: {
          title: event.title,
          startsAt: toEventInputValue(event.date),
          endsAt: toEventInputValue(event.endsAt),
          description: event.description ?? "",
          location: event.location ?? "",
        },
      },
    });
  };

  const updateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const eventWindow = readEventWindow(editState);
      if (!eventWindow.ok) {
        setError(eventWindow.error);
        return;
      }

      const res = await fetchApi(`/api/events/${editingId}`, {
        body: JSON.stringify({
          date: eventWindow.startsAt,
          description: editState.description || null,
          endsAt: eventWindow.endsAt,
          location: editState.location || null,
          title: editState.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await res.json().catch(() => null) as EventResponse | { error?: string } | null;

      if (res.ok && data && "id" in data) {
        const response = data as EventResponse;
        await mutate(
          (current) => upsertEventRow(current, response as unknown as Record<string, unknown>),
          { revalidate: false },
        );
        dispatch({ type: "eventUpdated" });
        if (response?.discordSyncError) {
          setError(response.discordSyncError);
          setNotice("Event updated on the website. Discord still needs attention.");
        } else if (response?.discordEventId) {
          setNotice("Event updated and synced to Discord.");
        } else {
          setNotice("Event updated.");
        }
      } else {
        setError(data && "error" in data && data.error ? data.error : "Failed to update event.");
      }
    } catch {
      setError("Unable to update event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEvent = async (id: string) => {
    setError("");
    setNotice("");
    dispatch({ type: "patch", value: { deletingId: id } });
    try {
      const res = await fetchApi(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotice("Event deleted.");
        await mutate((current) => removeEventRow(current, id), { revalidate: false });
        dispatch({ type: "patch", value: { deleteConfirmId: null } });
      } else {
        setError(await readErrorMessage(res, "Failed to delete event."));
      }
    } catch {
      setError("Unable to delete event. Please try again.");
    } finally {
      dispatch({ type: "patch", value: { deletingId: null } });
    }
  };

  const syncEvent = async (id: string) => {
    setError("");
    setNotice("");
    dispatch({ type: "patch", value: { syncingId: id } });
    try {
      const res = await fetchApi(`/api/events/${id}/sync`, { method: "POST" });
      const data = await res.json().catch(() => null) as EventResponse | { error?: string } | null;
      if (data && "id" in data) {
        await mutate(
          (current) => upsertEventRow(current, data as unknown as Record<string, unknown>),
          { revalidate: false },
        );
      }
      if (!res.ok) {
        setError(data && "error" in data && data.error ? data.error : "Discord sync failed.");
        return;
      }
      if (!data || !("id" in data)) {
        setError("Discord sync returned an invalid response.");
        return;
      }

      const response = data as EventResponse;
      if (response.discordEventId) {
        setNotice("Discord event synchronized.");
      } else {
        setNotice("This event no longer needs a Discord event.");
      }
    } catch {
      setError("Unable to reach Discord sync. Please try again.");
    } finally {
      dispatch({ type: "patch", value: { syncingId: null } });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading events">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse border border-neutral-800 bg-white/[0.02] motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-neutral-200">{events.length} {events.length === 1 ? "event" : "events"}</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-500">
            Times are entered and displayed in Purdue time (Eastern Time). Website changes sync to Discord automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void mutate()}
            className="inline-flex min-h-11 items-center gap-2 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          {!creating && (
            <button
              type="button"
              onClick={() => dispatch({ type: "patch", value: { creating: true, formState: createInitialForm() } })}
              className="inline-flex min-h-11 items-center gap-2 bg-white px-4 text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Plus size={13} /> New Event
            </button>
          )}
        </div>
      </div>

      {(error || loadError) && (
        <div role="alert" className="flex flex-col gap-3 border border-red-950/80 bg-red-950/20 p-4 text-xs text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "Failed to load events."}</span>
          {loadError && (
            <button type="button" onClick={() => void mutate()} className="min-h-11 border border-red-900 px-3 text-[10px] uppercase tracking-[0.15em] hover:border-red-700">
              Retry
            </button>
          )}
        </div>
      )}
      {notice && <p role="status" className="border border-neutral-800 bg-white/[0.02] p-4 text-xs text-neutral-300">{notice}</p>}

      {creating ? (
        <EventForm
          formState={formState}
          onCancel={() => dispatch({ type: "patch", value: { creating: false } })}
          onChange={setFormState}
          onSubmit={createEvent}
          submitting={submitting}
          title="New Event"
        />
      ) : null}

      <EventsList
        canDelete={canDelete}
        deleteConfirmId={deleteConfirmId}
        deletingId={deletingId}
        editState={editState}
        error={error}
        editingId={editingId}
        events={events}
        now={now}
        onBeginEdit={beginEdit}
        onCancelDelete={() => dispatch({ type: "patch", value: { deleteConfirmId: null } })}
        onCancelEdit={() => dispatch({ type: "patch", value: { editingId: null } })}
        onChangeEdit={setEditState}
        onDelete={deleteEvent}
        onRequestDelete={(id) => dispatch({ type: "patch", value: { deleteConfirmId: id } })}
        onSubmitEdit={updateEvent}
        onSync={syncEvent}
        submitting={submitting}
        syncingId={syncingId}
      />
    </div>
  );
}

function EventsList({
  canDelete,
  deleteConfirmId,
  deletingId,
  editState,
  error,
  editingId,
  events,
  now,
  onBeginEdit,
  onCancelDelete,
  onCancelEdit,
  onChangeEdit,
  onDelete,
  onRequestDelete,
  onSubmitEdit,
  onSync,
  submitting,
  syncingId,
}: {
  canDelete: boolean;
  deleteConfirmId: string | null;
  deletingId: string | null;
  editState: EventFormState;
  error: string;
  editingId: string | null;
  events: WebsiteEvent[];
  now: Date;
  onBeginEdit: (event: WebsiteEvent) => void;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onChangeEdit: (value: EventFormState) => void;
  onDelete: (id: string) => Promise<void>;
  onRequestDelete: (id: string) => void;
  onSubmitEdit: (event: React.FormEvent) => void;
  onSync: (id: string) => Promise<void>;
  submitting: boolean;
  syncingId: string | null;
}) {
  if (events.length === 0) {
    return (
      <div className="border border-neutral-800 bg-white/[0.02] p-5">
        <p className="text-xs tracking-wider text-neutral-500">No events to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const actionLabel = getEventDiscordActionLabel(event, now);
        const discordState = getEventDiscordState(event, now);
        return (
          <article key={event.id} className="border border-neutral-800 bg-white/[0.02] p-4 sm:p-5">
            {editingId === event.id ? (
              <EventForm
                formState={editState}
                onCancel={onCancelEdit}
                onChange={onChangeEdit}
                onSubmit={onSubmitEdit}
                submitting={submitting}
                title="Edit Event"
              />
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <EventStatus event={event} now={now} />
                    <DiscordStatusBadge event={event} now={now} state={discordState} />
                  </div>
                  <p className="text-sm text-neutral-200">{event.title}</p>
                  <div className="mt-2 flex flex-col gap-1 text-[10px] tracking-wider text-neutral-500 sm:flex-row sm:items-center sm:gap-4">
                    <span className="flex items-center gap-1.5"><CalendarDays size={11} />{formatEventDateTime(event)}</span>
                    {event.location && <span className="flex items-center gap-1.5"><MapPin size={11} />{event.location}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {actionLabel && (
                    <button
                      type="button"
                      aria-label={`${actionLabel} for ${event.title}`}
                      onClick={() => void onSync(event.id)}
                      disabled={syncingId === event.id}
                      className="inline-flex min-h-11 items-center gap-2 border border-amber-900/70 px-3 text-[10px] uppercase tracking-[0.12em] text-amber-300 transition-colors hover:border-amber-700 disabled:opacity-50"
                    >
                      <RefreshCw className={syncingId === event.id ? "animate-spin motion-reduce:animate-none" : ""} size={13} />
                      {syncingId === event.id ? "Syncing" : actionLabel}
                    </button>
                  )}
                  <button type="button" aria-label={`Edit ${event.title}`} onClick={() => onBeginEdit(event)} className="inline-flex size-11 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-white" title="Edit event">
                    <Pencil size={14} />
                  </button>
                  {canDelete && (
                    <button type="button" aria-label={`Delete ${event.title}`} onClick={() => onRequestDelete(event.id)} className="inline-flex size-11 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-red-900 hover:text-red-400" title="Delete event">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
      {deleteConfirmId && (() => {
        const event = events.find((candidate) => candidate.id === deleteConfirmId);
        return event ? (
          <DeleteEventDialog
            deleting={deletingId === event.id}
            error={error}
            event={event}
            onCancel={onCancelDelete}
            onConfirm={() => void onDelete(event.id)}
          />
        ) : null;
      })()}
    </div>
  );
}

function DeleteEventDialog({
  deleting,
  error,
  event,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  error: string;
  event: WebsiteEvent;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-event-dialog-title"
      aria-describedby="delete-event-dialog-description"
      aria-label="Confirm event deletion"
      onCancel={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-red-950/80 bg-neutral-950 p-0 text-neutral-100 shadow-2xl shadow-black/60 backdrop:bg-black/80"
    >
      <div className="border-b border-red-950/80 bg-red-950/20 px-5 py-4">
        <p className="text-[9px] uppercase tracking-[0.24em] text-red-300">Destructive action</p>
        <h2 id="delete-event-dialog-title" className="mt-2 text-lg text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
          Delete event?
        </h2>
      </div>
      <div className="p-5">
        <p id="delete-event-dialog-description" className="text-xs leading-relaxed text-neutral-300">
          Delete “{event.title}” from the website and Discord? This cannot be undone.
        </p>
        {error && <p role="alert" className="mt-4 border border-red-900/80 bg-red-950/30 p-3 text-xs leading-relaxed text-red-200">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={deleting} className="min-h-11 border border-neutral-700 px-4 text-[10px] uppercase tracking-[0.12em] text-neutral-300 transition-colors hover:border-neutral-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-300 disabled:opacity-50">
            Keep event
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="min-h-11 bg-red-200 px-4 text-[10px] uppercase tracking-[0.12em] text-red-950 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-red-200 disabled:opacity-50">
            {deleting ? "Deleting" : "Delete everywhere"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function DiscordStatusBadge({ event, now, state }: { event: WebsiteEvent; now: Date; state: ReturnType<typeof getEventDiscordState> }) {
  if (state === "needs_attention") {
    return <span className="inline-flex items-center gap-1 border border-amber-900/70 bg-amber-950/20 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-amber-300"><AlertTriangle size={10} /> Discord needs attention</span>;
  }
  if (state === "synced") {
    return <span className="inline-flex items-center gap-1 border border-neutral-700 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-400"><Radio size={10} /> Discord synced</span>;
  }
  if (state === "linked") {
    return <span className="inline-flex items-center gap-1 border border-neutral-700 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-400"><Radio size={10} /> Discord linked</span>;
  }
  return (
    <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-600">
      {getEventStatus(event, now) === "past" ? "Website archive" : "Website only"}
    </span>
  );
}

function EventForm({
  formState,
  onCancel,
  onChange,
  onSubmit,
  submitting,
  title,
}: {
  formState: EventFormState;
  onCancel: () => void;
  onChange: (value: EventFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  title: string;
}) {
  const inputClass = "w-full min-h-11 bg-transparent border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none [color-scheme:dark]";

  return (
    <div className="border border-neutral-800 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wider text-neutral-400">{title}</h3>
        <button type="button" aria-label="Cancel editing event" onClick={onCancel} className="inline-flex size-11 items-center justify-center text-neutral-500 transition-colors hover:text-white" title="Cancel">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Event title</span>
          <input aria-label="Title"
            type="text"
            placeholder="Photo walk, critique, workshop…"
            value={formState.title}
            onChange={(e) => onChange({ ...formState, title: e.target.value })}
            maxLength={100}
            required
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-400"><Clock size={11} /> Starts · Purdue time</span>
            <input
              type="datetime-local"
              value={formState.startsAt}
              onChange={(e) => onChange({ ...formState, startsAt: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-400"><Clock size={11} /> Ends · Purdue time</span>
            <input
              type="datetime-local"
              value={formState.endsAt}
              onChange={(e) => onChange({ ...formState, endsAt: e.target.value })}
              required
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-[10px] leading-relaxed text-neutral-500">Eastern Time is used for both the website and Discord, even if you are managing events while traveling.</p>
        <label className="block space-y-1">
          <span className="flex justify-between gap-4 text-[10px] uppercase tracking-[0.2em] text-neutral-400"><span>Description</span><span className="text-neutral-600">{formState.description.length}/1000</span></span>
          <textarea aria-label="Description"
            placeholder="What should members bring or expect?"
            value={formState.description}
            onChange={(e) => onChange({ ...formState, description: e.target.value })}
            maxLength={1000}
            rows={4}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Location</span>
          <input aria-label="Location"
            type="text"
            placeholder="Room, building, or meeting point"
            value={formState.location}
            onChange={(e) => onChange({ ...formState, location: e.target.value })}
            maxLength={100}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-white px-4 text-[10px] uppercase tracking-[0.1em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50 sm:w-auto"
        >
          <Save size={13} /> {submitting ? "Saving" : "Save Event"}
        </button>
      </form>
    </div>
  );
}

function EventStatus({ event, now }: { event: WebsiteEvent; now: Date }) {
  const status = getEventStatus(event, now);
  if (status === "live") {
    return <span className="bg-amber-300 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-black">Happening</span>;
  }

  if (status === "upcoming") {
    return <span className="border border-neutral-700 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-300">Upcoming</span>;
  }

  return <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-600">Past</span>;
}

function readEventWindow(form: EventFormState):
  | { endsAt: string; ok: true; startsAt: string }
  | { error: string; ok: false } {
  const startsAt = clubDateTimeInputToUtcIso(form.startsAt);
  if (!startsAt) {
    return { error: "Choose a valid event start in Purdue time.", ok: false };
  }

  const endsAt = clubDateTimeInputToUtcIso(form.endsAt);
  if (!endsAt) {
    return { error: "Choose a valid event end in Purdue time.", ok: false };
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    return { error: "Event end time must be after the start time.", ok: false };
  }

  return { endsAt, ok: true, startsAt };
}

function toEventInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toClubDateTimeLocalValue(date);
}

function createInitialForm(): EventFormState {
  const halfHourMs = 30 * 60 * 1000;
  const startMs = Math.ceil((Date.now() + halfHourMs) / halfHourMs) * halfHourMs;
  const start = new Date(startMs);
  const end = new Date(startMs + 2 * 60 * 60 * 1000);

  return {
    ...emptyForm,
    endsAt: toClubDateTimeLocalValue(end),
    startsAt: toClubDateTimeLocalValue(start),
  };
}
