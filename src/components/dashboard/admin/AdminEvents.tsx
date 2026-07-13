import type { FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import ModalDialog from "../../ModalDialog";
import {
  formatEventDateTime,
  getEventDiscordActionLabel,
  getEventStatus,
  type WebsiteEvent,
} from "@/lib/events";
import { useAdminEvents, type EventFormState } from "./admin-events/useAdminEvents";

export default function AdminEvents({ canDelete }: { canDelete: boolean }) {
  const controller = useAdminEvents();
  const {
    beginCreate,
    beginEdit,
    cancelDelete,
    clearMessages,
    closeEditor,
    createEvent,
    deleteConfirmId,
    deleteError,
    deleteEvent,
    deletingId,
    editorMode,
    editorError,
    editState,
    error,
    events,
    formState,
    hasLoadError,
    isLoading,
    notice,
    now,
    refreshEvents,
    requestDelete,
    setEditState,
    setFormState,
    submitting,
    syncEvent,
    syncingId,
    updateEvent,
    warning,
  } = controller;
  const pageError = editorMode ? "" : error || (hasLoadError ? "Failed to load events." : "");
  const deleteTarget = deleteConfirmId
    ? events.find((event) => event.id === deleteConfirmId)
    : undefined;

  return (
    <div className="space-y-6">
      <EventsToolbar count={events.length} onCreate={beginCreate} onRefresh={refreshEvents} />
      <AdminEventFeedback
        error={pageError}
        notice={notice}
        onDismiss={error || notice || warning ? clearMessages : undefined}
        onRetry={hasLoadError ? refreshEvents : undefined}
        warning={warning}
      />

      {isLoading ? (
        <EventsSkeleton />
      ) : (
        <EventsList
          canDelete={canDelete}
          events={events}
          now={now}
          onBeginEdit={beginEdit}
          onRequestDelete={requestDelete}
          onSync={syncEvent}
          syncBusy={syncingId !== null}
          syncingId={syncingId}
        />
      )}

      {editorMode && (
        <EventEditorDialog
          error={editorError}
          formState={editorMode === "edit" ? editState : formState}
          mode={editorMode}
          onChange={editorMode === "edit" ? setEditState : setFormState}
          onClose={closeEditor}
          onSubmit={editorMode === "edit" ? updateEvent : createEvent}
          submitting={submitting}
        />
      )}

      {deleteTarget && (
        <DeleteEventDialog
          deleteError={deleteError}
          deleting={deletingId === deleteTarget.id}
          event={deleteTarget}
          onCancel={cancelDelete}
          onConfirm={() => void deleteEvent(deleteTarget.id)}
        />
      )}
    </div>
  );
}

function EventsToolbar({ count, onCreate, onRefresh }: { count: number; onCreate: () => void; onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-neutral-200">{count} {count === 1 ? "event" : "events"}</p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-500">Create and update club events from one place. Changes sync to Discord automatically.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onRefresh} className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400">
          <RefreshCw size={13} /> Refresh
        </button>
        <button type="button" onClick={onCreate} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-4 text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white">
          <Plus size={13} /> New Event
        </button>
      </div>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading events">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse border border-neutral-800 bg-white/[0.02] motion-reduce:animate-none" />
      ))}
    </div>
  );
}

function EventsList({
  canDelete,
  events,
  now,
  onBeginEdit,
  onRequestDelete,
  onSync,
  syncBusy,
  syncingId,
}: {
  canDelete: boolean;
  events: WebsiteEvent[];
  now: Date;
  onBeginEdit: (event: WebsiteEvent) => void;
  onRequestDelete: (id: string) => void;
  onSync: (id: string) => Promise<void>;
  syncBusy: boolean;
  syncingId: string | null;
}) {
  if (events.length === 0) {
    return <p className="border border-neutral-800 bg-white/[0.02] p-5 text-xs tracking-wider text-neutral-500">No events to display.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <EventRow
          actionLabel={getEventDiscordActionLabel(event, now)}
          canDelete={canDelete}
          event={event}
          key={event.id}
          now={now}
          onBeginEdit={onBeginEdit}
          onRequestDelete={onRequestDelete}
          onSync={onSync}
          syncBusy={syncBusy}
          syncing={syncingId === event.id}
        />
      ))}
    </div>
  );
}

function EventRow({
  actionLabel,
  canDelete,
  event,
  now,
  onBeginEdit,
  onRequestDelete,
  onSync,
  syncBusy,
  syncing,
}: {
  actionLabel: string | null;
  canDelete: boolean;
  event: WebsiteEvent;
  now: Date;
  onBeginEdit: (event: WebsiteEvent) => void;
  onRequestDelete: (id: string) => void;
  onSync: (id: string) => Promise<void>;
  syncBusy: boolean;
  syncing: boolean;
}) {
  return (
    <article className="border border-neutral-800 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <EventStatus event={event} now={now} />
          <p className="mt-2 text-sm text-neutral-200">{event.title}</p>
          <div className="mt-2 flex flex-col gap-1 text-[10px] tracking-wider text-neutral-500 sm:flex-row sm:items-center sm:gap-4">
            <span className="flex items-center gap-1.5"><CalendarDays size={11} />{formatEventDateTime(event)}</span>
            {event.location && <span className="flex items-center gap-1.5"><MapPin size={11} />{event.location}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actionLabel && (
            <button type="button" aria-label={`${actionLabel} for ${event.title}`} onClick={() => void onSync(event.id)} disabled={syncBusy} className="inline-flex min-h-11 items-center gap-2 border border-amber-900/70 px-3 text-[10px] uppercase tracking-[0.12em] text-amber-300 transition-colors hover:border-amber-700 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50">
              <RefreshCw className={syncing ? "animate-spin motion-reduce:animate-none" : ""} size={13} />
              {syncing ? "Syncing" : actionLabel}
            </button>
          )}
          <button type="button" aria-label={`Edit ${event.title}`} onClick={() => onBeginEdit(event)} disabled={syncing} className="inline-flex size-11 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:opacity-40" title="Edit event"><Pencil size={14} /></button>
          {canDelete && <button type="button" aria-label={`Delete ${event.title}`} onClick={() => onRequestDelete(event.id)} disabled={syncing} className="inline-flex size-11 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-red-900 hover:text-red-400 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-40" title="Delete event"><Trash2 size={14} /></button>}
        </div>
      </div>
    </article>
  );
}

function AdminEventFeedback({ error, notice, onDismiss, onRetry, warning }: { error: string; notice: string; onDismiss?: () => void; onRetry?: () => void; warning: string }) {
  return (
    <div className="space-y-2">
      {error && <div role="alert" className="flex items-center justify-between gap-3 border border-red-900/40 bg-red-950/15 px-4 py-3 text-xs text-red-400"><span>{error}</span><FeedbackActions label="Dismiss event error" onDismiss={onDismiss} onRetry={onRetry} tone="red" /></div>}
      {notice && <div role="status" className="flex items-center justify-between gap-3 border border-green-900/40 bg-green-950/15 px-4 py-3 text-xs text-green-400"><span className="flex items-center gap-2"><CheckCircle2 size={14} />{notice}</span><FeedbackActions label="Dismiss event success" onDismiss={onDismiss} tone="green" /></div>}
      {warning && <div role="status" className="flex items-center justify-between gap-3 border border-amber-900/40 bg-amber-950/15 px-4 py-3 text-xs text-amber-300"><span className="flex items-center gap-2"><AlertTriangle size={14} />{warning}</span><FeedbackActions label="Dismiss event warning" onDismiss={onDismiss} tone="amber" /></div>}
    </div>
  );
}

function FeedbackActions({ label, onDismiss, onRetry, tone }: { label: string; onDismiss?: () => void; onRetry?: () => void; tone: "amber" | "green" | "red" }) {
  const toneClass = tone === "red" ? "text-red-600 hover:text-red-300" : tone === "green" ? "text-green-700 hover:text-green-300" : "text-amber-700 hover:text-amber-200";
  return (
    <div className="flex items-center gap-2">
      {onRetry && <button type="button" onClick={onRetry} className="min-h-11 px-3 text-[10px] uppercase tracking-[0.15em] text-red-300 hover:text-white">Retry</button>}
      {onDismiss && <button type="button" onClick={onDismiss} className={`inline-flex min-h-11 min-w-11 items-center justify-center ${toneClass}`} aria-label={label}><X size={14} /></button>}
    </div>
  );
}

function DeleteEventDialog({ deleteError, deleting, event, onCancel, onConfirm }: { deleteError: string; deleting: boolean; event: WebsiteEvent; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ModalDialog ariaLabel="Confirm event deletion" onClose={onCancel} preventClose={deleting} className="flex items-end justify-center bg-black/85 p-2 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Close delete event dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !deleting && onCancel()} />
      <div className="relative z-10 max-h-[calc(100dvh-0.5rem)] w-full max-w-md overflow-y-auto border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/70 sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 p-4 sm:p-5"><div><p className="text-[9px] uppercase tracking-[0.24em] text-red-500">Delete Event</p><h2 className="mt-1 text-base text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{event.title}</h2></div><DialogClose label="Close delete event dialog" onClose={onCancel} disabled={deleting} /></header>
        <div className="space-y-4 p-4 sm:p-5"><p className="text-xs leading-5 text-neutral-500">This permanently removes the event from the website and Discord. This action cannot be undone.</p>{deleteError && <p role="alert" className="border border-red-900/80 bg-red-950/30 p-3 text-xs leading-relaxed text-red-200">{deleteError}</p>}</div>
        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
          <SecondaryButton disabled={deleting} onClick={onCancel}>Cancel</SecondaryButton>
          <button type="button" onClick={onConfirm} disabled={deleting} className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-900 bg-red-950/30 px-5 text-[10px] uppercase tracking-[0.15em] text-red-300 transition-colors hover:bg-red-950 disabled:opacity-50">{deleting ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Trash2 size={13} />}{deleting ? "Deleting" : "Delete Event"}</button>
        </footer>
      </div>
    </ModalDialog>
  );
}

function EventEditorDialog({ error, formState, mode, onChange, onClose, onSubmit, submitting }: { error: string; formState: EventFormState; mode: "create" | "edit"; onChange: (value: EventFormState) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; submitting: boolean }) {
  const title = mode === "edit" ? "Edit Event" : "Create Event";
  return (
    <ModalDialog ariaLabel={title} onClose={onClose} preventClose={submitting} className="flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label={`Close ${title.toLowerCase()} dialog`} className="absolute inset-0 cursor-default" onMouseDown={() => !submitting && onClose()} />
      <div className="relative z-10 max-h-[calc(100dvh-0.5rem)] w-full max-w-2xl overflow-y-auto border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/70 sm:max-h-[calc(100dvh-3rem)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-950 p-4 sm:p-5"><div><p className="text-[9px] uppercase tracking-[0.24em] text-neutral-600">Event Calendar</p><h2 className="mt-1 text-xl text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h2></div><DialogClose label={`Close ${title.toLowerCase()} dialog`} onClose={onClose} disabled={submitting} /></header>
        <EventForm error={error} formState={formState} mode={mode} onCancel={onClose} onChange={onChange} onSubmit={onSubmit} submitting={submitting} />
      </div>
    </ModalDialog>
  );
}

function DialogClose({ disabled, label, onClose }: { disabled: boolean; label: string; onClose: () => void }) {
  return <button type="button" onClick={onClose} disabled={disabled} className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-50" aria-label={label}><X size={17} /></button>;
}

function EventForm({ error, formState, mode, onCancel, onChange, onSubmit, submitting }: { error: string; formState: EventFormState; mode: "create" | "edit"; onCancel: () => void; onChange: (value: EventFormState) => void; onSubmit: (event: FormEvent) => void; submitting: boolean }) {
  const inputClass = "min-h-11 w-full border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none [color-scheme:dark]";
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4 p-4 sm:p-5">
        <EventTextField label="Event title" value={formState.title} onChange={(title) => onChange({ ...formState, title })} placeholder="Photo walk, critique, workshop…" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField label="Starts" value={formState.startsAt} onChange={(startsAt) => onChange({ ...formState, startsAt })} inputClass={inputClass} />
          <DateTimeField label="Ends" value={formState.endsAt} onChange={(endsAt) => onChange({ ...formState, endsAt })} inputClass={inputClass} />
        </div>
        <label className="block space-y-1.5"><span className="flex justify-between gap-4 text-[10px] uppercase tracking-[0.18em] text-neutral-500"><span>Description</span><span className="text-neutral-700">{formState.description.length}/1000</span></span><textarea aria-label="Description" placeholder="What should members bring or expect?" value={formState.description} onChange={(event) => onChange({ ...formState, description: event.target.value })} maxLength={1000} rows={4} className={`${inputClass} resize-y`} /></label>
        <EventTextField label="Location" value={formState.location} onChange={(location) => onChange({ ...formState, location })} placeholder="Room, building, or meeting point" />
        {error && <p role="alert" className="border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-relaxed text-red-300">{error}</p>}
      </div>
      <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
        <SecondaryButton disabled={submitting} onClick={onCancel}>Cancel</SecondaryButton>
        <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.12em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : mode === "edit" ? <Save size={13} /> : <Plus size={13} />}{submitting ? "Saving" : mode === "edit" ? "Save Changes" : "Create Event"}</button>
      </footer>
    </form>
  );
}

function EventTextField({ label, onChange, placeholder, required = false, value }: { label: string; onChange: (value: string) => void; placeholder: string; required?: boolean; value: string }) {
  return <label className="block space-y-1.5"><span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</span><input aria-label={label} type="text" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} maxLength={100} required={required} className="min-h-11 w-full border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none" /></label>;
}

function DateTimeField({ inputClass, label, onChange, value }: { inputClass: string; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1.5"><span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-neutral-500"><Clock size={11} />{label}</span><input aria-label={`Event ${label.toLowerCase()}`} type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} required className={inputClass} /></label>;
}

function SecondaryButton({ children, disabled, onClick }: { children: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-50">{children}</button>;
}

function EventStatus({ event, now }: { event: WebsiteEvent; now: Date }) {
  const status = getEventStatus(event, now);
  if (status === "live") return <span className="bg-amber-300 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-black">Happening</span>;
  if (status === "upcoming") return <span className="border border-neutral-700 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-300">Upcoming</span>;
  return <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-600">Past</span>;
}
