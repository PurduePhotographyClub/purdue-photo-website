import type { RefObject } from "react";
import { Loader2, Search, Upload, X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import type {
  Competition,
  Member,
  ResultFormState,
} from "./types";

interface ResultUploadModalProps {
  competition: Competition;
  editingResultId: string | null;
  error: string;
  inputClass: string;
  memberQuery: string;
  members: Member[];
  onClose: () => void;
  onFileChange: () => void;
  onMemberQueryChange: (value: string) => void;
  onResultFormChange: (value: React.SetStateAction<ResultFormState>) => void;
  onSubmit: (event: React.FormEvent) => void;
  resultFileRef: RefObject<HTMLInputElement | null>;
  resultForm: ResultFormState;
  resultPreview: string | null;
  uploading: boolean;
}

export default function ResultUploadModal({
  competition,
  editingResultId,
  error,
  inputClass,
  memberQuery,
  members,
  onClose,
  onFileChange,
  onMemberQueryChange,
  onResultFormChange,
  onSubmit,
  resultFileRef,
  resultForm,
  resultPreview,
  uploading,
}: ResultUploadModalProps) {
  const normalizedMemberQuery = memberQuery.trim().toLowerCase();
  const isManualPhotographer = resultForm.userId === "manual";
  const selectedMember = isManualPhotographer
    ? null
    : members.find((member) => member.id === resultForm.userId) ?? null;
  const filteredMembers = normalizedMemberQuery
    ? members
        .filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(normalizedMemberQuery))
        .slice(0, 30)
    : [];

  return (
    <ModalDialog
      ariaLabel={editingResultId ? "Edit competition result" : "Upload competition result"}
      onClose={onClose}
      preventClose={uploading}
      className="flex items-end justify-center bg-black/80 p-2 sm:items-center sm:p-6"
    >
      <button type="button" tabIndex={-1} aria-label="Close result dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !uploading && onClose()} />
      <form onSubmit={onSubmit} className="relative z-10 max-h-[calc(100dvh-0.5rem)] w-full max-w-2xl overflow-y-auto border border-neutral-800 bg-neutral-950 sm:max-h-[calc(100dvh-3rem)]">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xs uppercase tracking-[0.18em] text-neutral-300">{editingResultId ? "Edit Result" : "Upload Result"}</h2>
            <p className="mt-1 text-sm text-neutral-100">{competition.title}</p>
          </div>
          <button type="button" aria-label="Close result dialog" onClick={onClose} disabled={uploading} className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-40">
            <X size={17} />
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="aspect-[4/3] w-full overflow-hidden border border-neutral-800 bg-neutral-900 sm:w-44 sm:shrink-0">
              {resultPreview ? (
                <img src={resultPreview} alt="Selected result preview" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center px-4 text-center text-[10px] leading-relaxed text-neutral-600">
                  Select a JPEG to preview the winning image.
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Placement</span>
                  <select aria-label="Winning place" value={resultForm.place} onChange={(event) => onResultFormChange((previous) => ({ ...previous, place: event.target.value }))} className={inputClass}>
                    <option value="1">1st Place</option>
                    <option value="2">2nd Place</option>
                    <option value="3">3rd Place</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Medium</span>
                  <select aria-label="Photo medium" value={resultForm.medium} onChange={(event) => onResultFormChange((previous) => ({ ...previous, medium: event.target.value as "film" | "digital" }))} className={inputClass}>
                    <option value="digital">Digital</option>
                    <option value="film">Film</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Result image</span>
                <input
                  aria-label="Result photo file"
                  ref={resultFileRef}
                  type="file"
                  accept="image/jpeg,.jpg,.jpeg"
                  required={!editingResultId}
                  onChange={onFileChange}
                  className="block w-full max-w-full text-xs leading-6 text-neutral-400 file:mr-3 file:min-h-11 file:border file:border-neutral-800 file:bg-transparent file:px-3 file:text-[10px] file:uppercase file:tracking-wider file:text-neutral-300"
                />
              </label>
              <p className="text-[10px] leading-relaxed text-neutral-500">JPG or JPEG only. The full image and lightweight preview are optimized before upload.</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Photographer</p>
            <label className="flex min-h-11 items-center gap-3 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={isManualPhotographer}
                onChange={(event) => {
                  if (event.target.checked) {
                    onResultFormChange((previous) => ({ ...previous, userId: "manual" }));
                    onMemberQueryChange("");
                  } else {
                    onResultFormChange((previous) => ({ ...previous, userId: "", photographerName: "" }));
                  }
                }}
                className="size-4 accent-white"
              />
              Enter a photographer who is not paired to a member
            </label>

            {!isManualPhotographer && (
              <div className="border border-neutral-800 bg-black/20">
                <div className="flex min-h-11 items-center gap-2 border-b border-neutral-800 px-3">
                  <Search size={14} className="shrink-0 text-neutral-500" />
                  <input
                    aria-label="Search members by name or email"
                    type="text"
                    value={memberQuery}
                    onChange={(event) => onMemberQueryChange(event.target.value)}
                    placeholder="Search members by name or email"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
                  />
                </div>
                {normalizedMemberQuery && (
                  <div className="max-h-48 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          onResultFormChange((previous) => ({ ...previous, userId: member.id, photographerName: "" }));
                          onMemberQueryChange(`${member.name} ${member.email}`);
                        }}
                        className={`block min-h-11 w-full border-b border-neutral-900 px-3 py-2 text-left transition-colors ${resultForm.userId === member.id ? "bg-white/10" : "hover:bg-white/[0.04]"}`}
                      >
                        <span className="block text-xs text-neutral-200">{member.name}</span>
                        <span className="block text-[10px] text-neutral-500">{member.email}</span>
                      </button>
                    ))}
                    {filteredMembers.length === 0 && <p className="p-3 text-xs text-neutral-500">No matching members.</p>}
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] leading-relaxed text-neutral-500">
              {isManualPhotographer
                ? "Manual names are not tied to a member account."
                : selectedMember
                  ? `Paired with ${selectedMember.name}.`
                  : "Search for and select the winning member."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Photo title</span>
              <input aria-label="Photo title" type="text" maxLength={200} value={resultForm.title} onChange={(event) => onResultFormChange((previous) => ({ ...previous, title: event.target.value }))} required className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Instagram</span>
              <input aria-label="Instagram" type="text" value={resultForm.photographerInstagram} onChange={(event) => onResultFormChange((previous) => ({ ...previous, photographerInstagram: event.target.value }))} placeholder="Optional" className={inputClass} />
            </label>
          </div>

          {isManualPhotographer && (
            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Photographer name</span>
              <input aria-label="Photographer name" type="text" maxLength={160} value={resultForm.photographerName} onChange={(event) => onResultFormChange((previous) => ({ ...previous, photographerName: event.target.value }))} required className={inputClass} />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Description</span>
            <textarea aria-label="Description" maxLength={1000} value={resultForm.description} onChange={(event) => onResultFormChange((previous) => ({ ...previous, description: event.target.value }))} rows={3} className={`${inputClass} resize-y`} />
          </label>

          {error && <p role="alert" className="text-xs leading-relaxed text-red-400">{error}</p>}
        </div>

        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
          <button type="button" onClick={onClose} disabled={uploading} className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-40">
            Cancel
          </button>
          <button type="submit" disabled={uploading} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.12em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-40">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? "Optimizing & Uploading" : editingResultId ? "Save Result" : "Upload Result"}
          </button>
        </footer>
      </form>
    </ModalDialog>
  );
}
