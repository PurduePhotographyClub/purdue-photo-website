import { useReducer } from "react";
import useSWR from "swr";
import { CheckCircle2, Edit3, Loader2, Send, Trash2, X } from "lucide-react";
import MarkdownMessage from "../MarkdownMessage";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage
} from "@/lib/http";

interface DashboardUpdate {
  id: string;
  title: string;
  message: string;
  isActive: number;
  createdAt: string;
  createdByName: string | null;
  dismissalCount: number;
}

interface DashboardUpdatesResponse {
  updates?: DashboardUpdate[];
  memberCount?: number;
}

type SubmitState = "idle" | "loading" | "success" | "error";

interface UpdatesUiState {
  deleteLoading: boolean;
  deleteTarget: DashboardUpdate | null;
  editingUpdate: DashboardUpdate | null;
  message: string;
  notice: string;
  submitState: SubmitState;
  title: string;
}

type UpdatesUiAction =
  | { type: "patch"; value: Partial<UpdatesUiState> }
  | { type: "resetForm" }
  | { type: "startEditing"; item: DashboardUpdate };

const initialUpdatesUiState: UpdatesUiState = {
  deleteLoading: false,
  deleteTarget: null,
  editingUpdate: null,
  message: "",
  notice: "",
  submitState: "idle",
  title: "Dashboard Update",
};

function updatesUiReducer(state: UpdatesUiState, action: UpdatesUiAction): UpdatesUiState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.value };
    case "resetForm":
      return { ...state, editingUpdate: null, message: "", notice: "", submitState: "idle", title: "Dashboard Update" };
    case "startEditing":
      return { ...state, editingUpdate: action.item, message: action.item.message, notice: "", title: action.item.title };
  }
}

interface DeleteUpdateDialogProps {
  deleteLoading: boolean;
  target: DashboardUpdate;
  onClose: () => void;
  onDelete: () => void;
}

function DeleteUpdateDialog({ deleteLoading, target, onClose, onDelete }: DeleteUpdateDialogProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close delete update dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !deleteLoading && onClose()} />
      <div className="relative z-10 w-full max-w-sm border border-red-950/60 bg-neutral-950 p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-red-500">Delete Update</p>
            <h3 className="mt-1 text-base text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              {target.title}
            </h3>
          </div>
          <button type="button"
            onClick={() => !deleteLoading && onClose()}
            className="p-1 text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-neutral-300 disabled:opacity-50"
            disabled={deleteLoading}
            aria-label="Close delete update dialog"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          This removes the update and its dismissal history. If this is the current popup, members will stop seeing it.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button"
            onClick={onClose}
            disabled={deleteLoading}
            className="border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button type="button"
            onClick={onDelete}
            disabled={deleteLoading}
            className="flex items-center gap-2 border border-red-900 bg-red-950/30 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-900/30 disabled:opacity-50"
          >
            {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardUpdates() {
  const [uiState, dispatch] = useReducer(updatesUiReducer, initialUpdatesUiState);
  const { deleteLoading, deleteTarget, editingUpdate, message, notice, submitState, title } = uiState;
  const { data, error: loadError, isLoading, mutate } = useSWR<DashboardUpdatesResponse>("/api/admin/dashboard-updates", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const updates = data?.updates ?? [];
  const memberCount = data?.memberCount ?? 0;

  const inputClass = "box-border w-full border border-neutral-800 bg-black/20 px-3 py-2 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-neutral-600";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({ type: "patch", value: { notice: "", submitState: "loading" } });

    try {
      const editing = Boolean(editingUpdate);
      const res = await fetchApi("/api/admin/dashboard-updates", {
        method: editingUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingUpdate?.id, title, message }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to send dashboard update."));
      }

      void mutate();
      dispatch({
        type: "patch",
        value: {
          editingUpdate: null,
          message: "",
          notice: editing
            ? "Update changed. Dismissals were reset so members will see the new version."
            : "Update sent. Members will see it the next time they enter the dashboard.",
          submitState: "success",
          title: "Dashboard Update",
        },
      });
      setTimeout(() => {
        dispatch({ type: "patch", value: { notice: "", submitState: "idle" } });
      }, 5000);
    } catch (err) {
      dispatch({ type: "patch", value: { notice: err instanceof Error ? err.message : "Failed to send dashboard update.", submitState: "error" } });
    }
  };

  const startEditing = (item: DashboardUpdate) => {
    dispatch({ type: "startEditing", item });
    document.getElementById("dashboard-update-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEditing = () => {
    dispatch({ type: "resetForm" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    dispatch({ type: "patch", value: { deleteLoading: true, notice: "" } });

    try {
      const deletedId = deleteTarget.id;
      const wasEditing = editingUpdate?.id === deletedId;
      const res = await fetchApi("/api/admin/dashboard-updates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to delete dashboard update."));
      }

      void mutate();
      dispatch({
        type: "patch",
        value: {
          deleteLoading: false,
          deleteTarget: null,
          editingUpdate: wasEditing ? null : editingUpdate,
          message: wasEditing ? "" : message,
          notice: "Update deleted.",
          submitState: "success",
          title: wasEditing ? "Dashboard Update" : title,
        },
      });
      setTimeout(() => {
        dispatch({ type: "patch", value: { notice: "", submitState: "idle" } });
      }, 4000);
    } catch (err) {
      dispatch({ type: "patch", value: { notice: err instanceof Error ? err.message : "Failed to delete dashboard update.", submitState: "error" } });
      dispatch({ type: "patch", value: { deleteLoading: false } });
    }
  };

  if (isLoading) return <p className="text-xs text-neutral-500">Loading dashboard updates</p>;

  return (
    <div className="space-y-8">
      <form id="dashboard-update-form" onSubmit={handleSubmit} className="relative w-full overflow-hidden border border-neutral-800 bg-neutral-950/80 p-5 shadow-2xl shadow-black/20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative space-y-4">
          {editingUpdate && (
            <div className="flex items-center justify-between gap-3 border border-amber-900/50 bg-amber-950/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-amber-300">
                Editing current broadcast
              </p>
              <button
                type="button"
                onClick={cancelEditing}
                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-neutral-200"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Title</span>
            <input
              value={title}
              onChange={(e) => dispatch({ type: "patch", value: { title: e.target.value } })}
              maxLength={120}
              required
              className={`${inputClass} h-14`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Update Message</span>
            <textarea aria-label="Example: **Fixes shipped**&#10;- Gallery uploads are stable :camera:&#10;- Darkroom credits now sync correctly :check:"
              value={message}
              onChange={(e) => dispatch({ type: "patch", value: { message: e.target.value } })}
              maxLength={2000}
              required
              placeholder="Example: **Fixes shipped**&#10;- Gallery uploads are stable :camera:&#10;- Darkroom credits now sync correctly :check:"
              className={`${inputClass} h-80 resize-none overflow-y-auto leading-6 md:h-[24rem]`}
            />
          </label>

          <div className="min-h-5">
            {notice && (
              <p className={`flex items-center gap-2 text-[10px] tracking-wider ${
                submitState === "error" ? "text-red-400" : "text-green-400"
              }`}>
                {submitState === "success" && <CheckCircle2 size={12} />}
                {notice}
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {editingUpdate && (
              <button
                type="button"
                onClick={cancelEditing}
                className="border border-neutral-800 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitState === "loading" || message.trim().length < 5}
              className="flex items-center gap-2 border border-neutral-200 bg-white px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {editingUpdate ? "Save Update" : "Send Update"}
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Recent Updates</h2>
          <p className="text-[10px] text-neutral-600">{memberCount} member accounts</p>
        </div>
        {loadError && <p className="text-xs text-red-400">Failed to load dashboard updates.</p>}

        {updates.length === 0 ? (
          <p className="border border-neutral-800 px-4 py-6 text-center text-xs text-neutral-600">
            No dashboard updates have been sent yet.
          </p>
        ) : (
          <div className="space-y-2">
            {updates.map((item) => (
              <article key={item.id} className="border border-neutral-800 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm text-neutral-200">{item.title}</h3>
                      {item.isActive ? (
                        <span className="border border-green-900/70 bg-green-950/20 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-green-400">
                          Current
                        </span>
                      ) : (
                        <span className="border border-neutral-800 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-neutral-600">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-neutral-600">
                      {new Date(item.createdAt).toLocaleString()} by {item.createdByName || "Staff"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-neutral-800 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                      {item.dismissalCount} dismissed
                    </span>
                    <button type="button"
                      onClick={() => startEditing(item)}
                      className="flex items-center gap-1 border border-neutral-800 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
                    >
                      <Edit3 size={11} />
                      Edit
                    </button>
                    <button type="button"
                      onClick={() => dispatch({ type: "patch", value: { deleteTarget: item } })}
                      className="flex items-center gap-1 border border-red-950/70 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-red-500 transition-colors hover:border-red-800 hover:text-red-400"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </div>
                <MarkdownMessage value={item.message} className="mt-3 text-xs leading-5 text-neutral-400" />
              </article>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteUpdateDialog
          deleteLoading={deleteLoading}
          target={deleteTarget}
          onClose={() => dispatch({ type: "patch", value: { deleteTarget: null } })}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
