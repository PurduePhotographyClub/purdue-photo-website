import { useMemo, useReducer } from "react";
import useSWR from "swr";
import { CalendarDays, Clock, MapPin, Pencil, Plus, Radio, Save, Trash2, X } from "lucide-react";
import {
  formatEventDateTime,
  getEventEnd,
  getEventStart,
  normalizeEvent,
  parseEventDate,
  type WebsiteEvent,
} from "@/lib/events";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage
} from "@/lib/http";

interface EventResponse extends WebsiteEvent {
  discordSyncError?: string;
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
  editState: EventFormState;
  editingId: string | null;
  error: string;
  formState: EventFormState;
  notice: string;
  submitting: boolean;
}

type EventsUiAction =
  | { type: "clearMessages" }
  | { type: "eventCreated" }
  | { type: "eventUpdated" }
  | { type: "patch"; value: Partial<EventsUiState> };

const initialEventsUiState: EventsUiState = {
  creating: false,
  editState: emptyForm,
  editingId: null,
  error: "",
  formState: emptyForm,
  notice: "",
  submitting: false,
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

export default function AdminEvents() {
  const [uiState, dispatch] = useReducer(eventsUiReducer, initialEventsUiState);
  const { creating, editState, editingId, error, formState, notice, submitting } = uiState;
  const { data: eventRows, error: loadError, isLoading, mutate } = useSWR<Record<string, unknown>[]>("/api/events", fetchJson, PUBLIC_API_SWR_OPTIONS);

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
      const startIso = localInputToIso(formState.startsAt);
      const endIso = localInputToIso(formState.endsAt);
      if (!startIso) {
        setError("Choose an event start time.");
        return;
      }

      const form = new FormData();
      form.append("title", formState.title);
      form.append("date", startIso);
      if (endIso) form.append("endsAt", endIso);
      if (formState.description) form.append("description", formState.description);
      if (formState.location) form.append("location", formState.location);

      const res = await fetchApi("/api/events", { method: "POST", body: form });
      const data = await res.json().catch(() => null) as EventResponse | { error?: string } | null;

      if (res.ok) {
        dispatch({ type: "eventCreated" });
        void mutate();

        const response = data as EventResponse | null;
        if (response?.discordSyncError) {
          setError(response.discordSyncError);
          setNotice("Event saved on the website.");
        } else if (response?.discordEventId) {
          setNotice("Event saved and added to Discord events.");
        } else {
          setNotice("Event saved.");
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
          startsAt: toLocalInputValue(event.date),
          endsAt: toLocalInputValue(event.endsAt),
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
      const startIso = localInputToIso(editState.startsAt);
      const endIso = localInputToIso(editState.endsAt);
      if (!startIso) {
        setError("Choose an event start time.");
        return;
      }

      const res = await fetchApi(`/api/events/${editingId}`, {
        body: JSON.stringify({
          date: startIso,
          description: editState.description || null,
          endsAt: endIso,
          location: editState.location || null,
          title: editState.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await res.json().catch(() => null) as EventResponse | { error?: string } | null;

      if (res.ok) {
        dispatch({ type: "eventUpdated" });
        const response = data as EventResponse | null;
        if (response?.discordSyncError) {
          setError(response.discordSyncError);
          setNotice("Event updated on the website.");
        } else if (response?.discordEventId) {
          setNotice("Event updated and synced to Discord.");
        } else {
          setNotice("Event updated.");
        }
        void mutate();
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
    try {
      const res = await fetchApi(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotice("Event deleted.");
        void mutate();
      } else {
        setError(await readErrorMessage(res, "Failed to delete event."));
      }
    } catch {
      setError("Unable to delete event. Please try again.");
    }
  };

  if (isLoading) return <p className="text-xs text-neutral-500">Loading</p>;

  return (
    <div className="space-y-6">
      {(error || loadError) && <p className="border border-red-950/80 bg-red-950/20 p-3 text-xs text-red-300">{error || "Failed to load events."}</p>}
      {notice && <p className="border border-neutral-800 bg-white/[0.02] p-3 text-xs text-neutral-300">{notice}</p>}

      {creating ? (
          <EventForm
            formState={formState}
            onCancel={() => dispatch({ type: "patch", value: { creating: false } })}
            onChange={setFormState}
            onSubmit={createEvent}
          submitting={submitting}
          title="New Event"
        />
      ) : (
        <button type="button"
          onClick={() => dispatch({ type: "patch", value: { creating: true } })}
          className="inline-flex items-center gap-2 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white"
        >
          <Plus size={13} /> New Event
        </button>
      )}

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="border border-neutral-800 bg-white/[0.02] p-5">
            <p className="text-xs tracking-wider text-neutral-500">No events to display.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="border border-neutral-800 bg-white/[0.02] p-4">
              {editingId === event.id ? (
                <EventForm
                  formState={editState}
                  onCancel={() => dispatch({ type: "patch", value: { editingId: null } })}
                  onChange={setEditState}
                  onSubmit={updateEvent}
                  submitting={submitting}
                  title="Edit Event"
                />
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <EventStatus event={event} />
                      {event.discordEventId && (
                        <span className="inline-flex items-center gap-1 border border-neutral-700 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                          <Radio size={10} /> Discord
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-200">{event.title}</p>
                    <div className="mt-2 flex flex-col gap-1 text-[10px] tracking-wider text-neutral-500 sm:flex-row sm:items-center sm:gap-4">
                      <span className="flex items-center gap-1.5"><CalendarDays size={11} />{formatEventDateTime(event)}</span>
                      {event.location && <span className="flex items-center gap-1.5"><MapPin size={11} />{event.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => beginEdit(event)}
                      className="inline-flex size-9 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-white"
                      title="Edit event"
                    >
                      <Pencil size={14} />
                    </button>
                    <button type="button"
                      onClick={() => deleteEvent(event.id)}
                      className="inline-flex size-9 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-red-900 hover:text-red-400"
                      title="Delete event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
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
  const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none [color-scheme:dark]";

  return (
    <div className="border border-neutral-800 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wider text-neutral-400">{title}</h3>
        <button type="button" onClick={onCancel} className="text-neutral-600 transition-colors hover:text-white" title="Cancel">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input aria-label="Title"
          type="text"
          placeholder="Title"
          value={formState.title}
          onChange={(e) => onChange({ ...formState, title: e.target.value })}
          required
          className={inputClass}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500"><Clock size={11} /> Starts</span>
            <input
              type="datetime-local"
              value={formState.startsAt}
              onChange={(e) => onChange({ ...formState, startsAt: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500"><Clock size={11} /> Ends</span>
            <input
              type="datetime-local"
              value={formState.endsAt}
              onChange={(e) => onChange({ ...formState, endsAt: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <textarea aria-label="Description"
          placeholder="Description"
          value={formState.description}
          onChange={(e) => onChange({ ...formState, description: e.target.value })}
          rows={3}
          className={inputClass}
        />
        <input aria-label="Location"
          type="text"
          placeholder="Location"
          value={formState.location}
          onChange={(e) => onChange({ ...formState, location: e.target.value })}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-white px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          <Save size={13} /> {submitting ? "Saving" : "Save Event"}
        </button>
      </form>
    </div>
  );
}

function EventStatus({ event }: { event: WebsiteEvent }) {
  const now = new Date();
  const startsAt = getEventStart(event);
  const endsAt = getEventEnd(event);

  if (startsAt <= now && endsAt >= now) {
    return <span className="bg-amber-300 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-black">Happening</span>;
  }

  if (endsAt >= now) {
    return <span className="border border-neutral-700 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-300">Upcoming</span>;
  }

  return <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-600">Past</span>;
}

function localInputToIso(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function toLocalInputValue(value: string | null) {
  const parsed = parseEventDate(value);
  if (!parsed) {
    return "";
  }

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}
