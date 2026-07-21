import type { FormEvent } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";

interface ScheduleFormState {
  capacity: string;
  endsAt: string;
  startsAt: string;
  title: string;
}

interface AdminDarkroomEditDialogProps {
  busy: boolean;
  error: string;
  form: ScheduleFormState;
  inputClass: string;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function AdminDarkroomEditDialog({
  busy,
  error,
  form,
  inputClass,
  onChange,
  onClose,
  onSubmit,
}: AdminDarkroomEditDialogProps) {
  return (
    <ModalDialog
      ariaLabel="Edit darkroom timeslot"
      className="flex items-end justify-center bg-black/80 p-2 sm:items-center sm:p-6"
      onClose={onClose}
      preventClose={busy}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close darkroom timeslot editor"
        className="absolute inset-0 cursor-default"
        onMouseDown={() => !busy && onClose()}
      />
      <form
        onSubmit={onSubmit}
        className="relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto border border-neutral-800 bg-neutral-950 sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">Darkroom schedule</p>
            <h2 className="mt-1 text-sm uppercase tracking-[0.18em] text-neutral-100">Edit Timeslot</h2>
            <p className="mt-2 text-xs text-neutral-500">Update this opening without changing the create form above.</p>
          </div>
          <button
            type="button"
            aria-label="Close darkroom timeslot editor"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">
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
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">
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
          <div className="hidden sm:block" aria-hidden="true" />
          <label className="block [color-scheme:dark]">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">
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
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">
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
          {error && (
            <p role="alert" className="sm:col-span-2 text-xs leading-relaxed text-red-400">
              {error}
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.12em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
            {busy ? "Saving" : "Save Changes"}
          </button>
        </footer>
      </form>
    </ModalDialog>
  );
}
