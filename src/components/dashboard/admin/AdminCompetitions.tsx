import { useReducer, useRef } from "react";
import useSWR from "swr";
import { Edit3, Loader2, Plus, Search, Trash2, Trophy, Upload, X } from "lucide-react";
import { fetchApi, readErrorMessage, readJson } from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

type CompetitionStatus = "draft" | "open" | "judging" | "closed";

interface Competition {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  status: CompetitionStatus;
  submissionDeadline: string | null;
  createdAt: string;
}

interface CompetitionResult {
  id: string;
  entryId: string;
  place: 1 | 2 | 3;
  entryTitle: string | null;
  entryDescription: string | null;
  r2Key: string | null;
  medium: "film" | "digital" | null;
  userId: string | null;
  pairedUserId: string | null;
  photographerName: string | null;
  photographerInstagram: string | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface AdminCompetitionsData {
  competitions: Competition[];
  resultsByCompetition: Record<string, CompetitionResult[]>;
  members: Member[];
}

const STATUS_TRANSITIONS: Record<CompetitionStatus, CompetitionStatus | null> = {
  draft: "open",
  open: "judging",
  judging: "closed",
  closed: null,
};

const STATUS_OPTIONS: CompetitionStatus[] = ["draft", "open", "judging", "closed"];
const adminCompetitionStatusColor: Record<CompetitionStatus, string> = {
  draft: "text-neutral-600",
  open: "text-green-400",
  judging: "text-yellow-500",
  closed: "text-neutral-500",
};

const emptyResultForm = {
  place: "1",
  title: "",
  photographerName: "",
  photographerInstagram: "",
  description: "",
  medium: "digital" as "film" | "digital",
  userId: "",
};

type ResultFormState = typeof emptyResultForm;

interface AdminCompetitionsState {
  creating: boolean;
  saving: boolean;
  uploading: boolean;
  uploadingFor: string | null;
  editingResultId: string | null;
  deleteTarget: Competition | null;
  deleteConfirm: string;
  deleting: boolean;
  title: string;
  theme: string;
  description: string;
  deadline: string;
  status: CompetitionStatus;
  resultForm: ResultFormState;
  memberQuery: string;
  error: string;
}

const initialAdminCompetitionsState: AdminCompetitionsState = {
  creating: false,
  saving: false,
  uploading: false,
  uploadingFor: null,
  editingResultId: null,
  deleteTarget: null,
  deleteConfirm: "",
  deleting: false,
  title: "",
  theme: "",
  description: "",
  deadline: "",
  status: "open",
  resultForm: emptyResultForm,
  memberQuery: "",
  error: "",
};

async function fetchAdminCompetitionsData(): Promise<AdminCompetitionsData> {
  const [compRes, memberRes] = await Promise.all([
    fetchApi("/api/competitions"),
    fetchApi("/api/admin/members"),
  ]);
  if (!compRes.ok) throw new Error("Failed to load competitions.");

  const competitions = await readJson<Competition[]>(compRes);
  const members = memberRes.ok ? await readJson<Member[]>(memberRes) : [];
  const resultPairs = await Promise.all(competitions.map(async (comp) => {
    const res = await fetchApi(`/api/competitions/${comp.id}/results`);
    return [comp.id, res.ok ? await readJson<CompetitionResult[]>(res) : []] as const;
  }));

  return {
    competitions,
    members,
    resultsByCompetition: Object.fromEntries(resultPairs),
  };
}

interface CompetitionCreatePanelProps {
  creating: boolean;
  deadline: string;
  description: string;
  inputClass: string;
  onCancel: () => void;
  onCreate: (event: React.FormEvent) => void;
  onDeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onOpen: () => void;
  onStatusChange: (status: CompetitionStatus) => void;
  onThemeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  saving: boolean;
  status: CompetitionStatus;
  theme: string;
  title: string;
}

function CompetitionCreatePanel({
  creating,
  deadline,
  description,
  inputClass,
  onCancel,
  onCreate,
  onDeadlineChange,
  onDescriptionChange,
  onOpen,
  onStatusChange,
  onThemeChange,
  onTitleChange,
  saving,
  status,
  theme,
  title,
}: CompetitionCreatePanelProps) {
  if (!creating) {
    return (
      <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors">
        <Plus size={12} /> New Competition
      </button>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs tracking-wider uppercase text-neutral-400">New Competition</h3>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-white">
          <X size={12} /> Cancel
        </button>
      </div>
      <form onSubmit={onCreate} className="space-y-3">
        <input aria-label="Title" type="text" placeholder="Title" value={title} onChange={(e) => onTitleChange(e.target.value)} required className={inputClass} />
        <input aria-label="Theme" type="text" placeholder="Theme (optional)" value={theme} onChange={(e) => onThemeChange(e.target.value)} className={inputClass} />
        <textarea aria-label="Description" placeholder="Description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={2} className={inputClass} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input aria-label="Submission deadline" type="date" value={deadline} onChange={(e) => onDeadlineChange(e.target.value)} className={inputClass} />
          <select aria-label="Competition status" value={status} onChange={(e) => onStatusChange(e.target.value as CompetitionStatus)} className={inputClass}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Create
        </button>
      </form>
    </div>
  );
}

interface CompetitionListProps {
  competitions: Competition[];
  onAdvanceStatus: (id: string, status: CompetitionStatus) => void;
  onDeleteRequest: (competition: Competition) => void;
  onResultEdit: (competitionId: string, result: CompetitionResult) => void;
  onResultUpload: (competitionId: string, place?: number) => void;
  resultsByCompetition: Record<string, CompetitionResult[]>;
}

function CompetitionList({
  competitions,
  onAdvanceStatus,
  onDeleteRequest,
  onResultEdit,
  onResultUpload,
  resultsByCompetition,
}: CompetitionListProps) {
  if (competitions.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-neutral-600">No competitions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {competitions.map((comp) => {
        const nextStatus = STATUS_TRANSITIONS[comp.status];
        const results = resultsByCompetition[comp.id] || [];
        const nextOpenPlace = ([1, 2, 3] as const).find((place) => !results.some((result) => result.place === place)) || 1;

        return (
          <div key={comp.id} className="bg-white/[0.02] border border-neutral-800 p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-200">{comp.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-[10px] tracking-wider uppercase ${adminCompetitionStatusColor[comp.status]}`}>{comp.status}</span>
                  {comp.theme && <span className="text-[10px] text-neutral-600">{comp.theme}</span>}
                  {comp.submissionDeadline && <span className="text-[10px] text-neutral-600">Due {new Date(comp.submissionDeadline).toLocaleDateString()}</span>}
                </div>
                {comp.description && <p className="text-xs text-neutral-500 mt-2 max-w-2xl">{comp.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button"
                  onClick={() => onResultUpload(comp.id, nextOpenPlace)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-800 text-[10px] tracking-[0.1em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
                >
                  <Upload size={12} /> Result
                </button>
                {nextStatus && (
                  <button type="button"
                    onClick={() => onAdvanceStatus(comp.id, nextStatus)}
                    className="px-3 py-1.5 border border-neutral-800 text-[10px] tracking-[0.1em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
                  >
                    {nextStatus}
                  </button>
                )}
                <button type="button"
                  onClick={() => onDeleteRequest(comp)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-red-950/70 text-[10px] tracking-[0.1em] uppercase text-red-500/70 hover:text-red-300 hover:border-red-900 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>

            {results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {results.map((result) => (
                  <div key={result.id} className="border border-neutral-800 bg-black/20 overflow-hidden">
                    {result.r2Key && (
                      <div className="aspect-[4/3] bg-neutral-900 overflow-hidden">
                        <img src={`/api/competitions/image/${result.r2Key}`} alt={result.entryTitle || "Competition result"} className="size-full object-cover" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Trophy size={12} />
                        <span className="text-[10px] tracking-[0.15em] uppercase">{result.place}{result.place === 1 ? "st" : result.place === 2 ? "nd" : "rd"} Place</span>
                      </div>
                      <p className="text-xs text-neutral-200">{result.entryTitle || "Untitled"}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        {result.photographerName || "Unknown photographer"}
                        {result.photographerInstagram ? ` ${result.photographerInstagram}` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => onResultEdit(comp.id, result)}
                        className="inline-flex items-center gap-1.5 mt-3 text-[10px] tracking-[0.12em] uppercase text-neutral-500 hover:text-white transition-colors"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ResultUploadModalProps {
  competition: Competition;
  editingResultId: string | null;
  filteredMembers: Member[];
  inputClass: string;
  isManualPhotographer: boolean;
  memberQuery: string;
  normalizedMemberQuery: string;
  onClose: () => void;
  onMemberQueryChange: (value: string) => void;
  onResultFormChange: (value: React.SetStateAction<ResultFormState>) => void;
  onSubmit: (event: React.FormEvent) => void;
  resultFileRef: React.RefObject<HTMLInputElement | null>;
  resultForm: ResultFormState;
  selectedMember: Member | null;
  uploading: boolean;
}

function ResultUploadModal({
  competition,
  editingResultId,
  filteredMembers,
  inputClass,
  isManualPhotographer,
  memberQuery,
  normalizedMemberQuery,
  onClose,
  onMemberQueryChange,
  onResultFormChange,
  onSubmit,
  resultFileRef,
  resultForm,
  selectedMember,
  uploading,
}: ResultUploadModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-800 bg-neutral-950 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs tracking-[0.2em] uppercase text-neutral-400">{editingResultId ? "Edit Result" : "Upload Result"}</h3>
            <p className="text-sm text-neutral-200 mt-2">{competition.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-600 hover:text-white" disabled={uploading}>
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select aria-label="Winning place" value={resultForm.place} onChange={(e) => onResultFormChange((prev) => ({ ...prev, place: e.target.value }))} className={inputClass}>
            <option value="1">1st Place</option>
            <option value="2">2nd Place</option>
            <option value="3">3rd Place</option>
          </select>
          <select aria-label="Photo medium" value={resultForm.medium} onChange={(e) => onResultFormChange((prev) => ({ ...prev, medium: e.target.value as "film" | "digital" }))} className={inputClass}>
            <option value="digital">Digital</option>
            <option value="film">Film</option>
          </select>
          <input aria-label="Result photo file" ref={resultFileRef} type="file" accept="image/jpeg,image/png,image/webp" required={!editingResultId} className="text-[10px] text-neutral-500 file:mr-3 file:px-3 file:py-2 file:border file:border-neutral-800 file:bg-transparent file:text-neutral-400 file:text-[10px] file:tracking-wider file:uppercase file:cursor-pointer" />
        </div>

        <div className="space-y-2">
          <p className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500">Pair Member</p>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={isManualPhotographer}
              onChange={(e) => {
                if (e.target.checked) {
                  onResultFormChange((prev) => ({ ...prev, userId: "manual" }));
                  onMemberQueryChange("");
                } else {
                  onResultFormChange((prev) => ({ ...prev, userId: "", photographerName: "" }));
                }
              }}
              className="size-3.5 accent-white"
            />
            Manual photographer name
          </label>
          <div className="border border-neutral-800 bg-black/20">
            <div className={`flex items-center gap-2 px-3 py-2 border-b border-neutral-800 ${isManualPhotographer ? "opacity-40" : ""}`}>
              <Search size={13} className="text-neutral-600 shrink-0" />
              <input aria-label="Search members by name or email"
                type="text"
                value={memberQuery}
                onChange={(e) => onMemberQueryChange(e.target.value)}
                placeholder="Search members by name or email"
                disabled={isManualPhotographer}
                className="w-full bg-transparent text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
              />
            </div>
            {!isManualPhotographer && (
              <div className="h-52 overflow-y-auto">
                {!normalizedMemberQuery && (
                  <p className="p-3 text-xs text-neutral-600">Start typing to search members.</p>
                )}
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onResultFormChange((prev) => ({ ...prev, userId: member.id, photographerName: "" }));
                      onMemberQueryChange(`${member.name} ${member.email}`);
                    }}
                    className={`w-full text-left px-3 py-2 border-b border-neutral-900 transition-colors ${resultForm.userId === member.id ? "bg-white/10" : "hover:bg-white/[0.04]"}`}
                  >
                    <span className="block text-xs text-neutral-200">{member.name}</span>
                    <span className="block text-[10px] text-neutral-600">{member.email}</span>
                  </button>
                ))}
                {normalizedMemberQuery && filteredMembers.length === 0 && (
                  <p className="p-3 text-xs text-neutral-600">No members found.</p>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-neutral-600">
            {isManualPhotographer ? "Manual names are not tied to a member account." : selectedMember ? `Paired with ${selectedMember.name}. If they delete their account, this entry will show as PPC Member.` : "Search and select a member to pair this entry."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input aria-label="Photo title" type="text" placeholder="Photo title" value={resultForm.title} onChange={(e) => onResultFormChange((prev) => ({ ...prev, title: e.target.value }))} required className={inputClass} />
          <input aria-label="Photographer name" type="text" placeholder={isManualPhotographer ? "Photographer" : selectedMember ? "Uses paired member name" : "Select a member above"} value={resultForm.photographerName} onChange={(e) => onResultFormChange((prev) => ({ ...prev, photographerName: e.target.value }))} required={isManualPhotographer} disabled={!isManualPhotographer} className={`${inputClass} disabled:text-neutral-700 disabled:border-neutral-900`} />
          <input aria-label="Instagram" type="text" placeholder="Instagram (optional)" value={resultForm.photographerInstagram} onChange={(e) => onResultFormChange((prev) => ({ ...prev, photographerInstagram: e.target.value }))} className={inputClass} />
        </div>

        <textarea aria-label="Description" placeholder="Description (optional)" value={resultForm.description} onChange={(e) => onResultFormChange((prev) => ({ ...prev, description: e.target.value }))} rows={3} className={inputClass} />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-500 hover:text-white hover:border-neutral-700 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button type="submit" disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 disabled:opacity-40 transition-colors">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {editingResultId ? "Save Result" : "Upload Result"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteCompetitionModalProps {
  deleteConfirm: string;
  deleting: boolean;
  inputClass: string;
  onClose: () => void;
  onConfirm: () => void;
  onDeleteConfirmChange: (value: string) => void;
  target: Competition;
}

function DeleteCompetitionModal({
  deleteConfirm,
  deleting,
  inputClass,
  onClose,
  onConfirm,
  onDeleteConfirmChange,
  target,
}: DeleteCompetitionModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs tracking-[0.2em] uppercase text-red-400">Delete Competition</h3>
            <p className="text-sm text-neutral-200 mt-3">{target.title}</p>
            <p className="text-xs text-neutral-500 mt-2">
              This permanently deletes the competition, all result records, all entries, and any entry images stored in R2.
            </p>
          </div>
          <button type="button"
            onClick={onClose}
            className="text-neutral-600 hover:text-white"
            disabled={deleting}
          >
            <X size={16} />
          </button>
        </div>
        <div>
          <label htmlFor="AdminCompetitions-type-delete-to-confirm" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">Type DELETE to confirm</label>
          <input id="AdminCompetitions-type-delete-to-confirm" aria-label="DELETE"
            value={deleteConfirm}
            onChange={(e) => onDeleteConfirmChange(e.target.value)}
            placeholder="DELETE"
            className={inputClass}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-500 hover:text-white hover:border-neutral-700 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button type="button"
            onClick={onConfirm}
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-900 bg-red-950/30 text-[10px] tracking-[0.15em] uppercase text-red-300 hover:bg-red-950 disabled:opacity-40 transition-colors"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCompetitions() {
  const [state, dispatchState] = useReducer(
    keyedStateReducer<AdminCompetitionsState>,
    initialAdminCompetitionsState,
  );
  const {
    creating,
    saving,
    uploading,
    uploadingFor,
    editingResultId,
    deleteTarget,
    deleteConfirm,
    deleting,
    title,
    theme,
    description,
    deadline,
    status,
    resultForm,
    memberQuery,
    error,
  } = state;
  const setCreating = createKeyedStateSetter(dispatchState, "creating");
  const setSaving = createKeyedStateSetter(dispatchState, "saving");
  const setUploading = createKeyedStateSetter(dispatchState, "uploading");
  const setUploadingFor = createKeyedStateSetter(dispatchState, "uploadingFor");
  const setEditingResultId = createKeyedStateSetter(dispatchState, "editingResultId");
  const setDeleteTarget = createKeyedStateSetter(dispatchState, "deleteTarget");
  const setDeleteConfirm = createKeyedStateSetter(dispatchState, "deleteConfirm");
  const setDeleting = createKeyedStateSetter(dispatchState, "deleting");
  const setTitle = createKeyedStateSetter(dispatchState, "title");
  const setTheme = createKeyedStateSetter(dispatchState, "theme");
  const setDescription = createKeyedStateSetter(dispatchState, "description");
  const setDeadline = createKeyedStateSetter(dispatchState, "deadline");
  const setStatus = createKeyedStateSetter(dispatchState, "status");
  const setResultForm = createKeyedStateSetter(dispatchState, "resultForm");
  const setMemberQuery = createKeyedStateSetter(dispatchState, "memberQuery");
  const setError = createKeyedStateSetter(dispatchState, "error");
  const resultFileRef = useRef<HTMLInputElement>(null);

  const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none [color-scheme:dark]";

  const {
    data,
    error: loadError,
    isLoading: loading,
    mutate: refreshData,
  } = useSWR<AdminCompetitionsData>("admin-competitions", fetchAdminCompetitionsData);
  const competitions = data?.competitions ?? [];
  const resultsByCompetition = data?.resultsByCompetition ?? {};
  const members = data?.members ?? [];

  const createComp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetchApi("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, theme: theme || null, description: description || null, submissionDeadline: deadline || null, status }),
      });
      if (res.ok) {
        setTitle("");
        setTheme("");
        setDescription("");
        setDeadline("");
        setStatus("open");
        setCreating(false);
        await refreshData();
      } else {
        setError(await readErrorMessage(res, "Failed to create competition."));
      }
    } catch {
      setError("Unable to create competition. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (id: string, newStatus: CompetitionStatus) => {
    setError("");
    try {
      const res = await fetchApi(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await refreshData();
      } else {
        setError(await readErrorMessage(res, "Failed to update status."));
      }
    } catch {
      setError("Unable to update competition status. Please try again.");
    }
  };


  const uploadResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingFor) return;

    const file = resultFileRef.current?.files?.[0];
    if (!editingResultId && !file) {
      setError("Choose an image before uploading a result.");
      return;
    }
    if (resultForm.userId !== "manual" && !members.some((member) => member.id === resultForm.userId)) {
      setError("Search for and select a member, or check manual photographer name.");
      return;
    }

    setError("");
    setUploading(true);
    const form = new FormData();
    if (editingResultId) form.append("resultId", editingResultId);
    form.append("place", resultForm.place);
    form.append("title", resultForm.title);
    form.append("photographerName", resultForm.photographerName);
    form.append("photographerInstagram", resultForm.photographerInstagram);
    form.append("description", resultForm.description);
    form.append("medium", resultForm.medium);
    form.append("userId", resultForm.userId);
    if (file) form.append("file", file);

    try {
      const res = await fetchApi(`/api/competitions/${uploadingFor}/results`, {
        method: editingResultId ? "PATCH" : "POST",
        body: form,
      });
      if (res.ok) {
        setUploadingFor(null);
        setEditingResultId(null);
        setMemberQuery("");
        setResultForm(emptyResultForm);
        if (resultFileRef.current) resultFileRef.current.value = "";
        await refreshData();
      } else {
        setError(await readErrorMessage(res, editingResultId ? "Failed to edit result." : "Failed to upload result."));
      }
    } catch {
      setError(editingResultId ? "Unable to edit result. Please try again." : "Unable to upload result. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const startResultUpload = (competitionId: string, place = 1) => {
    setUploadingFor(competitionId);
    setEditingResultId(null);
    setResultForm({ ...emptyResultForm, place: String(place) });
    setMemberQuery("");
    setError("");
    if (resultFileRef.current) resultFileRef.current.value = "";
  };

  const startResultEdit = (competitionId: string, result: CompetitionResult) => {
    const pairedMember = result.pairedUserId ? members.find((member) => member.id === result.pairedUserId) : null;
    setUploadingFor(competitionId);
    setEditingResultId(result.id);
    setResultForm({
      place: String(result.place),
      title: result.entryTitle || "",
      photographerName: result.pairedUserId ? "" : result.photographerName || "",
      photographerInstagram: result.photographerInstagram || "",
      description: result.entryDescription || "",
      medium: result.medium || "digital",
      userId: result.pairedUserId || "manual",
    });
    setMemberQuery(pairedMember ? `${pairedMember.name} ${pairedMember.email}` : "");
    setError("");
    if (resultFileRef.current) resultFileRef.current.value = "";
  };

  const requestDelete = (comp: Competition) => {
    setDeleteTarget(comp);
    setDeleteConfirm("");
    setError("");
  };

  const deleteCompetition = async () => {
    if (!deleteTarget || deleteConfirm !== "DELETE") return;

    setError("");
    setDeleting(true);
    try {
      const res = await fetchApi(`/api/competitions/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        setDeleteConfirm("");
        if (uploadingFor === deleteTarget.id) {
          setUploadingFor(null);
        }
        await refreshData();
      } else {
        setError(await readErrorMessage(res, "Failed to delete competition."));
      }
    } catch {
      setError("Unable to delete competition. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const closeResultModal = () => {
    setUploadingFor(null);
    setEditingResultId(null);
    setResultForm(emptyResultForm);
    setMemberQuery("");
    if (resultFileRef.current) resultFileRef.current.value = "";
  };

  const activeResultCompetition = competitions.find((comp) => comp.id === uploadingFor);
  const selectedMember = resultForm.userId === "manual" ? null : members.find((member) => member.id === resultForm.userId) || null;
  const normalizedMemberQuery = memberQuery.trim().toLowerCase();
  const filteredMembers = members
    .filter((member) => {
      if (!normalizedMemberQuery) return false;
      return `${member.name} ${member.email}`.toLowerCase().includes(normalizedMemberQuery);
    })
    .slice(0, 30);
  const isManualPhotographer = resultForm.userId === "manual";

  if (loading) return <p className="text-xs text-neutral-500">Loading</p>;

  return (
    <div className="space-y-6">
      {(error || loadError) && <p className="text-xs text-red-400">{error || "Failed to load competitions."}</p>}
      <CompetitionCreatePanel
        creating={creating}
        deadline={deadline}
        description={description}
        inputClass={inputClass}
        onCancel={() => setCreating(false)}
        onCreate={createComp}
        onDeadlineChange={setDeadline}
        onDescriptionChange={setDescription}
        onOpen={() => setCreating(true)}
        onStatusChange={setStatus}
        onThemeChange={setTheme}
        onTitleChange={setTitle}
        saving={saving}
        status={status}
        theme={theme}
        title={title}
      />

      <CompetitionList
        competitions={competitions}
        onAdvanceStatus={advanceStatus}
        onDeleteRequest={requestDelete}
        onResultEdit={startResultEdit}
        onResultUpload={startResultUpload}
        resultsByCompetition={resultsByCompetition}
      />

      {uploadingFor && activeResultCompetition && (
        <ResultUploadModal
          competition={activeResultCompetition}
          editingResultId={editingResultId}
          filteredMembers={filteredMembers}
          inputClass={inputClass}
          isManualPhotographer={isManualPhotographer}
          memberQuery={memberQuery}
          normalizedMemberQuery={normalizedMemberQuery}
          onClose={closeResultModal}
          onMemberQueryChange={setMemberQuery}
          onResultFormChange={setResultForm}
          onSubmit={uploadResult}
          resultFileRef={resultFileRef}
          resultForm={resultForm}
          selectedMember={selectedMember}
          uploading={uploading}
        />
      )}

      {deleteTarget && (
        <DeleteCompetitionModal
          deleteConfirm={deleteConfirm}
          deleting={deleting}
          inputClass={inputClass}
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteCompetition}
          onDeleteConfirmChange={setDeleteConfirm}
          target={deleteTarget}
        />
      )}
    </div>
  );
}
