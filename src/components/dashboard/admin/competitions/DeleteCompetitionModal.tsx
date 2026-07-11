import { Loader2, Trash2, X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import type { Competition } from "./types";

interface DeleteCompetitionModalProps {
  confirmation: string;
  deleting: boolean;
  error: string;
  inputClass: string;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmationChange: (value: string) => void;
  target: Competition;
}

export default function DeleteCompetitionModal({
  confirmation,
  deleting,
  error,
  inputClass,
  onClose,
  onConfirm,
  onConfirmationChange,
  target,
}: DeleteCompetitionModalProps) {
  return (
    <ModalDialog ariaLabel="Delete competition" onClose={onClose} preventClose={deleting} className="flex items-end justify-center bg-black/80 p-2 sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Close delete competition dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !deleting && onClose()} />
      <div className="relative z-10 max-h-[calc(100dvh-0.5rem)] w-full max-w-md overflow-y-auto border border-neutral-800 bg-neutral-950 sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 p-4 sm:p-5">
          <div>
            <h2 className="text-xs uppercase tracking-[0.18em] text-red-400">Delete Competition</h2>
            <p className="mt-2 text-sm text-neutral-100">{target.title}</p>
          </div>
          <button type="button" aria-label="Close delete competition dialog" onClick={onClose} disabled={deleting} className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-40">
            <X size={17} />
          </button>
        </header>
        <div className="space-y-4 p-4 sm:p-5">
          <p className="text-xs leading-relaxed text-neutral-400">This permanently removes the competition, its results, entries, and stored image variants. It cannot be undone.</p>
          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Type DELETE to confirm</span>
            <input aria-label="DELETE" value={confirmation} onChange={(event) => onConfirmationChange(event.target.value)} placeholder="DELETE" className={inputClass} />
          </label>
          {error && <p role="alert" className="text-xs leading-relaxed text-red-400">{error}</p>}
        </div>
        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
          <button type="button" onClick={onClose} disabled={deleting} className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-40">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={deleting || confirmation !== "DELETE"} className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-900 bg-red-950/30 px-5 text-[10px] uppercase tracking-[0.15em] text-red-300 transition-colors hover:bg-red-950 disabled:opacity-40">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {deleting ? "Deleting" : "Delete Competition"}
          </button>
        </footer>
      </div>
    </ModalDialog>
  );
}
