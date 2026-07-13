import { useMemo, useReducer } from "react";
import useSWR from "swr";
import { useEventClock } from "@/hooks/useEventClock";
import { clubDateTimeInputToUtcIso, toClubDateTimeLocalValue } from "@/lib/club-time";
import {
  getEventStart,
  normalizeEvent,
  removeEventRow,
  upsertEventRow,
  type WebsiteEvent,
} from "@/lib/events";
import {
  ADMIN_EVENTS_SWR_OPTIONS,
  fetchApi,
  fetchFreshJson,
  readErrorMessage,
} from "@/lib/http";

interface EventResponse extends Omit<WebsiteEvent, "discordSynced" | "discordSyncError" | "discordSyncStatus"> {
  discordSynced?: boolean;
  discordSyncError?: string;
  discordSyncStatus?: "failed" | "not_applicable" | "synced";
}

export interface EventFormState {
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
  deleteConfirmId: string | null;
  deleteError: string;
  deletingId: string | null;
  editorMode: "create" | "edit" | null;
  editState: EventFormState;
  editingId: string | null;
  editorError: string;
  error: string;
  formState: EventFormState;
  notice: string;
  submitting: boolean;
  syncingId: string | null;
  warning: string;
}

type EventsUiAction =
  | { type: "clearMessages" }
  | { type: "eventCreated"; nextForm: EventFormState }
  | { type: "eventUpdated" }
  | { type: "patch"; value: Partial<EventsUiState> };

function createInitialEventsUiState(): EventsUiState {
  return {
    deleteConfirmId: null,
    deleteError: "",
    deletingId: null,
    editorMode: null,
    editState: emptyForm,
    editingId: null,
    editorError: "",
    error: "",
    formState: createInitialForm(),
    notice: "",
    submitting: false,
    syncingId: null,
    warning: "",
  };
}

function eventsUiReducer(state: EventsUiState, action: EventsUiAction): EventsUiState {
  switch (action.type) {
    case "clearMessages":
      return { ...state, deleteError: "", editorError: "", error: "", notice: "", warning: "" };
    case "eventCreated":
      return { ...state, editorError: "", editorMode: null, formState: action.nextForm };
    case "eventUpdated":
      return { ...state, editingId: null, editorError: "", editorMode: null, editState: emptyForm };
    case "patch":
      return { ...state, ...action.value };
  }
}

export function useAdminEvents() {
  const [uiState, dispatch] = useReducer(eventsUiReducer, undefined, createInitialEventsUiState);
  const { data: eventRows, error: loadError, isLoading, mutate } = useSWR<Record<string, unknown>[]>(
    "/api/events?limit=100",
    fetchFreshJson,
    ADMIN_EVENTS_SWR_OPTIONS,
  );
  const now = useEventClock();
  const events = useMemo(
    () => (eventRows || [])
      .map(normalizeEvent)
      .toSorted((first, second) => getEventStart(second).getTime() - getEventStart(first).getTime()),
    [eventRows],
  );

  const patchState = (value: Partial<EventsUiState>) => dispatch({ type: "patch", value });
  const clearMessages = () => dispatch({ type: "clearMessages" });
  const setFormState = (formState: EventFormState) => patchState({ formState });
  const setEditState = (editState: EventFormState) => patchState({ editState });

  const beginCreate = () => {
    patchState({
      editorMode: "create",
      editingId: null,
      editorError: "",
      formState: createInitialForm(),
      notice: "",
      warning: "",
    });
  };

  const closeEditor = () => {
    if (uiState.submitting) return;
    patchState({ editingId: null, editorError: "", editorMode: null });
  };

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    patchState({ submitting: true });

    try {
      const eventWindow = readEventWindow(uiState.formState);
      if (!eventWindow.ok) {
        patchState({ editorError: eventWindow.error });
        return;
      }

      const form = new FormData();
      form.append("title", uiState.formState.title);
      form.append("date", eventWindow.startsAt);
      form.append("endsAt", eventWindow.endsAt);
      if (uiState.formState.description) form.append("description", uiState.formState.description);
      if (uiState.formState.location) form.append("location", uiState.formState.location);

      const response = await fetchApi("/api/events", { method: "POST", body: form });
      const data = await readEventResponse(response);
      if (!response.ok || !data || !("id" in data)) {
        patchState({ editorError: getResponseError(data, "Failed to create event.") });
        return;
      }

      const savedEvent = data as EventResponse;
      await mutate(
        (current) => upsertEventRow(current, savedEvent as unknown as Record<string, unknown>),
        { revalidate: false },
      );
      dispatch({ type: "eventCreated", nextForm: createInitialForm() });
      patchState(getSaveFeedback(savedEvent, "create"));
    } catch {
      patchState({ editorError: "Unable to create event. Please try again." });
    } finally {
      patchState({ submitting: false });
    }
  };

  const beginEdit = (event: WebsiteEvent) => {
    patchState({
      editorMode: "edit",
      editingId: event.id,
      editorError: "",
      notice: "",
      warning: "",
      editState: {
        title: event.title,
        startsAt: toEventInputValue(event.date),
        endsAt: toEventInputValue(event.endsAt),
        description: event.description ?? "",
        location: event.location ?? "",
      },
    });
  };

  const updateEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uiState.editingId) return;

    clearMessages();
    patchState({ submitting: true });
    try {
      const eventWindow = readEventWindow(uiState.editState);
      if (!eventWindow.ok) {
        patchState({ editorError: eventWindow.error });
        return;
      }

      const response = await fetchApi(`/api/events/${uiState.editingId}`, {
        body: JSON.stringify({
          date: eventWindow.startsAt,
          description: uiState.editState.description || null,
          endsAt: eventWindow.endsAt,
          location: uiState.editState.location || null,
          title: uiState.editState.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await readEventResponse(response);
      if (!response.ok || !data || !("id" in data)) {
        patchState({ editorError: getResponseError(data, "Failed to update event.") });
        return;
      }

      const savedEvent = data as EventResponse;
      await mutate(
        (current) => upsertEventRow(current, savedEvent as unknown as Record<string, unknown>),
        { revalidate: false },
      );
      dispatch({ type: "eventUpdated" });
      patchState(getSaveFeedback(savedEvent, "update"));
    } catch {
      patchState({ editorError: "Unable to update event. Please try again." });
    } finally {
      patchState({ submitting: false });
    }
  };

  const deleteEvent = async (id: string) => {
    patchState({ deleteError: "", deletingId: id, notice: "", warning: "" });
    try {
      const response = await fetchApi(`/api/events/${id}`, { method: "DELETE" });
      if (!response.ok) {
        patchState({ deleteError: await readErrorMessage(response, "Failed to delete event.") });
        return;
      }

      await mutate((current) => removeEventRow(current, id), { revalidate: false });
      patchState({ deleteConfirmId: null, deleteError: "", notice: "Event deleted." });
    } catch {
      patchState({ deleteError: "Unable to delete event. Please try again." });
    } finally {
      patchState({ deletingId: null });
    }
  };

  const syncEvent = async (id: string) => {
    if (uiState.syncingId) return;
    clearMessages();
    patchState({ syncingId: id });
    try {
      const response = await fetchApi(`/api/events/${id}/sync`, { method: "POST" });
      const data = await readEventResponse(response);
      if (data && "id" in data) {
        await mutate(
          (current) => upsertEventRow(current, data as unknown as Record<string, unknown>),
          { revalidate: false },
        );
      }
      if (!response.ok) {
        patchState({ error: getResponseError(data, "Discord sync failed.") });
        return;
      }
      if (!data || !("id" in data)) {
        patchState({ error: "Discord sync returned an invalid response." });
        return;
      }

      patchState({
        notice: (data as EventResponse).discordEventId
          ? "Discord event synchronized."
          : "This event no longer needs a Discord event.",
      });
    } catch {
      patchState({ error: "Unable to reach Discord sync. Please try again." });
    } finally {
      patchState({ syncingId: null });
    }
  };

  const requestDelete = (id: string) => patchState({
    deleteConfirmId: id,
    deleteError: "",
    error: "",
    notice: "",
    warning: "",
  });
  const cancelDelete = () => patchState({ deleteConfirmId: null, deleteError: "" });
  const refreshEvents = () => void mutate();

  return {
    ...uiState,
    beginCreate,
    beginEdit,
    cancelDelete,
    clearMessages,
    closeEditor,
    createEvent,
    deleteEvent,
    events,
    hasLoadError: Boolean(loadError),
    isLoading,
    now,
    refreshEvents,
    requestDelete,
    setEditState,
    setFormState,
    syncEvent,
    updateEvent,
  };
}

async function readEventResponse(response: Response) {
  return response.json().catch(() => null) as Promise<EventResponse | { error?: string } | null>;
}

function getResponseError(data: EventResponse | { error?: string } | null, fallback: string) {
  return data && "error" in data && data.error ? data.error : fallback;
}

function getSaveFeedback(event: EventResponse, operation: "create" | "update") {
  if (event.discordSyncError) {
    return {
      notice: operation === "create"
        ? "Event saved on the website. Use Retry Discord sync when the service is available."
        : "Event updated on the website. Discord still needs attention.",
      warning: event.discordSyncError,
    };
  }
  if (event.discordEventId) {
    return { notice: operation === "create" ? "Event saved and added to Discord events." : "Event updated and synced to Discord." };
  }
  return { notice: operation === "create" ? "Event saved. This event is outside Discord's schedulable window." : "Event updated." };
}

function readEventWindow(form: EventFormState):
  | { endsAt: string; ok: true; startsAt: string }
  | { error: string; ok: false } {
  const startsAt = clubDateTimeInputToUtcIso(form.startsAt);
  if (!startsAt) return { error: "Choose a valid event start.", ok: false };

  const endsAt = clubDateTimeInputToUtcIso(form.endsAt);
  if (!endsAt) return { error: "Choose a valid event end.", ok: false };
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { error: "Event end time must be after the start time.", ok: false };
  }
  return { endsAt, ok: true, startsAt };
}

function toEventInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toClubDateTimeLocalValue(date);
}

function createInitialForm(): EventFormState {
  const halfHourMs = 30 * 60 * 1000;
  const startMs = Math.ceil((Date.now() + halfHourMs) / halfHourMs) * halfHourMs;
  return {
    ...emptyForm,
    endsAt: toClubDateTimeLocalValue(new Date(startMs + 2 * 60 * 60 * 1000)),
    startsAt: toClubDateTimeLocalValue(new Date(startMs)),
  };
}
