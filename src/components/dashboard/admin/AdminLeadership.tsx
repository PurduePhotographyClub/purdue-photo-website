import { useReducer, useRef } from "react";
import useSWR from "swr";
import { ImageWithFallback } from "../../ImageWithFallback";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage
} from "@/lib/http";

interface Leader {
  id: string;
  name: string;
  role: string;
  imageR2Key: string | null;
  termYear: string;
  isCurrent: boolean;
  sortOrder: number;
}

interface LeadershipUiState {
  creating: boolean;
  editingId: string | null;
  error: string;
  isCurrent: boolean;
  name: string;
  role: string;
  sortOrder: number;
  success: string;
  termYear: string;
}

type LeadershipUiAction =
  | { type: "field"; field: "name" | "role" | "termYear"; value: string }
  | { type: "patch"; value: Partial<LeadershipUiState> }
  | { type: "resetForm" }
  | { type: "startEdit"; leader: Leader };

const initialLeadershipUiState: LeadershipUiState = {
  creating: false,
  editingId: null,
  error: "",
  isCurrent: true,
  name: "",
  role: "",
  sortOrder: 0,
  success: "",
  termYear: "2025–2026",
};

function leadershipUiReducer(state: LeadershipUiState, action: LeadershipUiAction): LeadershipUiState {
  switch (action.type) {
    case "field":
      return { ...state, [action.field]: action.value };
    case "patch":
      return { ...state, ...action.value };
    case "resetForm":
      return { ...initialLeadershipUiState };
    case "startEdit":
      return {
        ...state,
        creating: true,
        editingId: action.leader.id,
        error: "",
        isCurrent: action.leader.isCurrent,
        name: action.leader.name,
        role: action.leader.role,
        sortOrder: action.leader.sortOrder,
        termYear: action.leader.termYear,
      };
  }
}

export default function AdminLeadership() {
  const [uiState, dispatch] = useReducer(leadershipUiReducer, initialLeadershipUiState);
  const { creating, editingId, error, isCurrent, name, role, sortOrder, success, termYear } = uiState;
  const { data, error: loadError, isLoading, mutate } = useSWR<Leader[]>("/api/leadership", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const leaders = data || [];
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none";
  const selectClass = "bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none";

  const resetForm = () => {
    dispatch({ type: "resetForm" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (leader: Leader) => {
    dispatch({ type: "startEdit", leader });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "patch", value: { error: "", success: "" } });

    const form = new FormData();
    form.append("name", name);
    form.append("role", role);
    form.append("termYear", termYear);
    form.append("isCurrent", isCurrent.toString());
    form.append("sortOrder", sortOrder.toString());
    if (fileRef.current?.files?.[0]) form.append("photo", fileRef.current.files[0]);

    try {
      const url = editingId ? `/api/leadership/${editingId}` : "/api/leadership";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetchApi(url, { method, body: form });

      if (res.ok) {
        const successMessage = editingId ? "Leader updated." : "Leader added.";
        resetForm();
        dispatch({ type: "patch", value: { success: successMessage } });
        void mutate();
      } else {
        dispatch({ type: "patch", value: { error: await readErrorMessage(res, "Failed to save leader.") } });
      }
    } catch {
      dispatch({ type: "patch", value: { error: "Unable to save leader. Please try again." } });
    }
  };

  const deleteLeader = async (id: string) => {
    if (!confirm("Delete this leader?")) return;
    dispatch({ type: "patch", value: { error: "" } });
    try {
      const res = await fetchApi(`/api/leadership/${id}`, { method: "DELETE" });
      if (res.ok) {
        dispatch({ type: "patch", value: { success: "Leader deleted." } });
        void mutate();
      } else {
        dispatch({ type: "patch", value: { error: await readErrorMessage(res, "Failed to delete leader.") } });
      }
    } catch {
      dispatch({ type: "patch", value: { error: "Unable to delete leader. Please try again." } });
    }
  };

  // Group by term year
  const currentLeaders = leaders.filter((l) => l.isCurrent);
  const pastByYear = leaders
    .filter((l) => !l.isCurrent)
    .reduce<Record<string, Leader[]>>((acc, l) => {
      (acc[l.termYear] = acc[l.termYear] || []).push(l);
      return acc;
    }, {});
  const pastYears = Object.keys(pastByYear).sort().reverse();

  if (isLoading) return <p className="text-xs text-neutral-500">Loading</p>;

  return (
    <div className="space-y-8">
      {(error || loadError) && <p className="text-xs text-red-400">{error || "Failed to load leadership data."}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}

      {/* Create / Edit Form */}
      {creating ? (
        <div className="bg-white/[0.02] border border-neutral-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs tracking-wider uppercase text-neutral-400">
              {editingId ? "Edit Leader" : "Add Leader"}
            </h3>
            <button type="button" onClick={resetForm} className="text-xs text-neutral-600 hover:text-white">Cancel</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	              <input aria-label="Full Name" type="text" placeholder="Full Name" value={name} onChange={(e) => dispatch({ type: "field", field: "name", value: e.target.value })} required className={inputClass} />
	              <input aria-label="Role" type="text" placeholder="Role (e.g. President)" value={role} onChange={(e) => dispatch({ type: "field", field: "role", value: e.target.value })} required className={inputClass} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
	              <input aria-label="Term Year" type="text" placeholder="Term Year (e.g. 2025–2026)" value={termYear} onChange={(e) => dispatch({ type: "field", field: "termYear", value: e.target.value })} required className={inputClass} />
	              <select value={isCurrent ? "true" : "false"} onChange={(e) => dispatch({ type: "patch", value: { isCurrent: e.target.value === "true" } })} className={selectClass}>
                <option value="true">Current Officer</option>
                <option value="false">Past Officer</option>
              </select>
	              <input aria-label="Sort Order" type="number" placeholder="Sort Order" value={sortOrder} onChange={(e) => dispatch({ type: "patch", value: { sortOrder: parseInt(e.target.value || "0", 10) } })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="AdminLeadership-photo-jpg-only-max-5mb" className="block text-[10px] tracking-wider uppercase text-neutral-500 mb-1">
                Photo (JPG only, max 5MB)
              </label>
              <input id="AdminLeadership-photo-jpg-only-max-5mb"
                ref={fileRef}
                type="file"
                accept="image/jpeg"
                className="text-[10px] text-neutral-500 file:mr-3 file:px-3 file:py-2 file:border file:border-neutral-800 file:bg-transparent file:text-neutral-400 file:text-[10px] file:tracking-wider file:uppercase file:cursor-pointer"
              />
              {editingId && <p className="text-[10px] text-neutral-600 mt-1">Leave empty to keep existing photo</p>}
            </div>
            <button type="submit" className="px-4 py-2 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">
              {editingId ? "Update Leader" : "Add Leader"}
            </button>
          </form>
        </div>
      ) : (
        <button type="button" onClick={() => { resetForm(); dispatch({ type: "patch", value: { creating: true } }); }} className="px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors">
          + Add Leader
        </button>
      )}

      {/* Current Officers */}
      {currentLeaders.length > 0 && (
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-3">Current Officers</h3>
          <div className="space-y-2">
            {currentLeaders.map((leader) => (
              <div key={leader.id} className="bg-white/[0.02] border border-neutral-800 p-4 flex items-center gap-4">
                {leader.imageR2Key && (
                  <div className="size-10 flex-shrink-0 overflow-hidden rounded-full">
                    <ImageWithFallback src={`/api/gallery/image/${leader.imageR2Key}`} alt={leader.name} className="size-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 truncate">{leader.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-neutral-500">{leader.role}</span>
                    <span className="text-[10px] text-neutral-700">·</span>
                    <span className="text-[10px] text-neutral-600">{leader.termYear}</span>
                    <span className="text-[10px] text-neutral-700">·</span>
                    <span className="text-[10px] text-neutral-600">#{leader.sortOrder}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button type="button" onClick={() => startEdit(leader)} className="text-[10px] text-neutral-500 hover:text-white transition-colors">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteLeader(leader.id)} className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Officers by Year */}
      {pastYears.map((year) => (
        <div key={year}>
          <h3 className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-3">{year}</h3>
          <div className="space-y-2">
            {pastByYear[year].map((leader) => (
              <div key={leader.id} className="bg-white/[0.02] border border-neutral-800 p-4 flex items-center gap-4">
                {leader.imageR2Key && (
                  <div className="size-10 flex-shrink-0 overflow-hidden rounded-full">
                    <ImageWithFallback src={`/api/gallery/image/${leader.imageR2Key}`} alt={leader.name} className="size-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 truncate">{leader.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-neutral-500">{leader.role}</span>
                    <span className="text-[10px] text-neutral-700">·</span>
                    <span className="text-[10px] text-neutral-600">{year}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button type="button" onClick={() => startEdit(leader)} className="text-[10px] text-neutral-500 hover:text-white transition-colors">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteLeader(leader.id)} className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {leaders.length === 0 && (
        <p className="text-xs text-neutral-600 text-center py-8">No leadership members added yet.</p>
      )}
    </div>
  );
}
