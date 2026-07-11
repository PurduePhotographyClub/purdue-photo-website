import { Edit3, Loader2, Plus, X } from "lucide-react";
import {
  STATUS_OPTIONS,
  type CompetitionStatus,
} from "./types";

interface CompetitionEditorPanelProps {
  deadline: string;
  description: string;
  editingCompetitionId: string | null;
  error: string;
  inputClass: string;
  onCancel: () => void;
  onDeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: (event: React.FormEvent) => void;
  onStatusChange: (status: CompetitionStatus) => void;
  onThemeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  saving: boolean;
  status: CompetitionStatus;
  theme: string;
  title: string;
}

export default function CompetitionEditorPanel({
  deadline,
  description,
  editingCompetitionId,
  error,
  inputClass,
  onCancel,
  onDeadlineChange,
  onDescriptionChange,
  onSave,
  onStatusChange,
  onThemeChange,
  onTitleChange,
  saving,
  status,
  theme,
  title,
}: CompetitionEditorPanelProps) {
  return (
    <section className="border border-neutral-800 bg-white/[0.02] p-4 sm:p-5" aria-labelledby="competition-editor-title">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 id="competition-editor-title" className="text-xs uppercase tracking-[0.18em] text-neutral-300">
            {editingCompetitionId ? "Edit Competition" : "New Competition"}
          </h2>
          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            {editingCompetitionId ? "Update the archive details or publishing status." : "Start as a draft, then publish when the details are ready."}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close competition editor"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-40"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Title</span>
            <input aria-label="Title" type="text" maxLength={160} value={title} onChange={(event) => onTitleChange(event.target.value)} required className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Theme</span>
            <input aria-label="Theme" type="text" maxLength={160} value={theme} onChange={(event) => onThemeChange(event.target.value)} placeholder="Optional" className={inputClass} />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Description</span>
          <textarea aria-label="Description" maxLength={1200} value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={3} className={`${inputClass} resize-y`} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Submission deadline</span>
            <input aria-label="Submission deadline" type="date" value={deadline} onChange={(event) => onDeadlineChange(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Status</span>
            <select aria-label="Competition status" value={status} onChange={(event) => onStatusChange(event.target.value as CompetitionStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        {error && <p role="alert" className="text-xs leading-relaxed text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-40">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.12em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : editingCompetitionId ? <Edit3 size={13} /> : <Plus size={13} />}
            {editingCompetitionId ? "Save Changes" : "Create Draft"}
          </button>
        </div>
      </form>
    </section>
  );
}
