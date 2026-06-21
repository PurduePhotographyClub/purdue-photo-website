import {
  useReducer,
  useEffect,
  useMemo,
  useCallback
} from "react";
import { fetchApi, readErrorMessage, readJson } from "@/lib/http";
import BestBuyEquipmentLookup, { type EquipmentAutofill } from "@/components/dashboard/BestBuyEquipmentLookup";
import { EQUIPMENT_CATEGORIES, getEquipmentCategoryLabel, normalizeEquipmentCategory } from "@/lib/equipment";

// ========================
// Types
// ========================

interface Equipment {
  id: string;
  assetTag: string | null;
  name: string;
  description: string | null;
  model: string | null;
  category: string;
  condition: string | null;
  ownerId: string | null;
  ownerName: string | null;
  isAvailable: boolean;
  activeLoan: {
    id: string;
    borrowerId: string;
    borrowerName: string;
    borrowerEmail?: string;
    status: string;
    dueDate: string | null;
    requestedAt: string;
    approvedAt: string | null;
    notes: string | null;
  } | null;
}

interface LoanRequest {
  id: string;
  equipmentName: string;
  equipmentAssetTag: string | null;
  equipmentCategory: string;
  equipmentOwnerId: string | null;
  borrowerName: string;
  borrowerEmail: string;
  status: string;
  requestedAt: string;
  dueDate: string | null;
  notes: string | null;
}

interface AuditEntry {
  id: string;
  equipmentId: string | null;
  loanId: string | null;
  action: string;
  performerName: string;
  affectedUserId: string | null;
  equipmentName: string | null;
  assetTag: string | null;
  details: string | null;
  createdAt: string;
}

interface EquipmentResponse {
  equipment?: Equipment[];
}

interface LoanResponse {
  requests?: LoanRequest[];
}

interface HistoryResponse {
  history?: AuditEntry[];
}

type View = "ppc" | "loans" | "history";

interface EquipmentForm {
  name: string;
  description: string;
  model: string;
  assetTag: string;
  category: string;
  condition: string;
}

interface AdminEquipmentState {
  approveDueDate: string;
  approvingId: string | null;
  deleting: boolean;
  deleteTarget: Equipment | null;
  editForm: EquipmentForm;
  editTarget: Equipment | null;
  error: string;
  expandedLoans: Set<string>;
  history: AuditEntry[];
  historyFilter: string;
  historyLoading: boolean;
  historySearch: string;
  items: Equipment[];
  loading: boolean;
  loans: LoanRequest[];
  ppcForm: EquipmentForm;
  saving: boolean;
  search: string;
  showAddPpc: boolean;
  success: string;
  view: View;
}

type AdminEquipmentAction =
  | { type: "patch"; value: Partial<AdminEquipmentState> }
  | {
      type: "set";
      key: keyof AdminEquipmentState;
      value: AdminEquipmentState[keyof AdminEquipmentState] | ((current: never) => AdminEquipmentState[keyof AdminEquipmentState]);
    };

const initialPpcForm: EquipmentForm = { name: "", description: "", model: "", assetTag: "", category: "camera", condition: "good" };
const initialEditForm: EquipmentForm = { name: "", description: "", model: "", category: "", condition: "", assetTag: "" };

const initialAdminEquipmentState: AdminEquipmentState = {
  approveDueDate: "",
  approvingId: null,
  deleting: false,
  deleteTarget: null,
  editForm: initialEditForm,
  editTarget: null,
  error: "",
  expandedLoans: new Set<string>(),
  history: [],
  historyFilter: "",
  historyLoading: false,
  historySearch: "",
  items: [],
  loading: true,
  loans: [],
  ppcForm: initialPpcForm,
  saving: false,
  search: "",
  showAddPpc: false,
  success: "",
  view: "ppc",
};

function adminEquipmentReducer(state: AdminEquipmentState, action: AdminEquipmentAction): AdminEquipmentState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.value };
    case "set": {
      const currentValue = state[action.key] as never;
      const nextValue = typeof action.value === "function" ? action.value(currentValue) : action.value;
      return { ...state, [action.key]: nextValue };
    }
  }
}

function createAdminEquipmentSetter<Key extends keyof AdminEquipmentState>(
  dispatch: React.Dispatch<AdminEquipmentAction>,
  key: Key
) {
  return (value: AdminEquipmentState[Key] | ((current: AdminEquipmentState[Key]) => AdminEquipmentState[Key])) => {
    dispatch({ type: "set", key, value: value as AdminEquipmentAction extends { type: "set"; value: infer Value } ? Value : never });
  };
}

const CATEGORY_OPTIONS = EQUIPMENT_CATEGORIES;

const CONDITIONS = ["excellent", "good", "fair", "poor"];

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  deleted: "Deleted",
  loan_requested: "Loan Requested",
  loan_approved: "Loan Approved",
  loan_rejected: "Loan Rejected",
  return_requested: "Return Requested",
  loan_returned: "Loan Returned",
};

const statusBg: Record<string, string> = {
  pending: "bg-yellow-500/10 border-yellow-900/50 text-yellow-400",
  approved: "bg-blue-500/10 border-blue-900/50 text-blue-400",
  active: "bg-green-500/10 border-green-900/50 text-green-400",
  pending_return: "bg-orange-500/10 border-orange-900/50 text-orange-400",
  returned: "bg-neutral-500/10 border-neutral-800 text-neutral-500",
  rejected: "bg-red-500/10 border-red-900/50 text-red-500",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  active: "Active",
  pending_return: "Pending Return",
  returned: "Returned",
  rejected: "Rejected",
};

const conditionColor: Record<string, string> = {
  excellent: "text-green-400",
  good: "text-blue-400",
  fair: "text-yellow-400",
  poor: "text-red-400",
};

const actionColor: Record<string, string> = {
  created: "text-green-400",
  edited: "text-blue-400",
  deleted: "text-red-400",
  loan_requested: "text-yellow-400",
  loan_approved: "text-green-400",
  loan_rejected: "text-red-400",
  return_requested: "text-orange-400",
  loan_returned: "text-neutral-400",
};

function hasActiveLoan(item: Equipment) {
  return item.activeLoan && (item.activeLoan.status === "active" || item.activeLoan.status === "pending" || item.activeLoan.status === "approved" || item.activeLoan.status === "pending_return");
}

function tabClass(active: boolean) {
  return `px-4 py-2 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 whitespace-nowrap ${
    active ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"
  }`;
}

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  hint?: string;
  label: string;
}

function FormField({ children, className = "", hint, label }: FormFieldProps) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">{label}</span>
      {children}
      {hint && <span className="block text-[10px] leading-relaxed text-neutral-600">{hint}</span>}
    </label>
  );
}

interface AdminEquipmentDeleteModalProps {
  btnOutline: string;
  deleteTarget: Equipment | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function AdminEquipmentDeleteModal({ btnOutline, deleteTarget, deleting, onClose, onConfirm }: AdminEquipmentDeleteModalProps) {
  if (!deleteTarget) return null;
  const blocked = hasActiveLoan(deleteTarget);

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/70 backdrop-blur-sm">
      <button type="button" aria-label="Close delete equipment dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !deleting && onClose()} />
      <div className="relative z-10 bg-neutral-950 border border-neutral-800 p-6 max-w-md w-full mx-4 space-y-4">
        <p className="text-[9px] tracking-[0.3em] uppercase text-red-400">Confirm Deletion</p>
        <div className="space-y-2">
          <p className="text-sm text-neutral-200">{deleteTarget.name}</p>
          {deleteTarget.assetTag && <p className="text-[10px] font-mono text-neutral-500">{deleteTarget.assetTag}</p>}
        </div>
        {blocked ? (
          <div className="p-3 border border-yellow-900/50 bg-yellow-900/10 text-xs text-yellow-400">
            This item has an active or pending loan. Resolve all loans before deleting.
          </div>
        ) : (
          <p className="text-xs text-neutral-500">This action is permanent and cannot be undone. Related loan history will remain in the audit log.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={deleting} className={btnOutline}>Cancel</button>
          {!blocked && (
            <button type="button" onClick={onConfirm} disabled={deleting} className="px-5 py-2.5 bg-red-600 text-white text-[10px] tracking-[0.15em] uppercase hover:bg-red-500 transition-colors disabled:opacity-50">
              {deleting ? "Deleting" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AdminEquipmentEditModalProps {
  btnOutline: string;
  btnPrimary: string;
  editForm: EquipmentForm;
  editTarget: Equipment | null;
  inputClass: string;
  onChange: (patch: Partial<EquipmentForm>) => void;
  onClose: () => void;
  onSave: (event: React.FormEvent) => void;
  saving: boolean;
  selectClass: string;
}

function AdminEquipmentEditModal({
  btnOutline,
  btnPrimary,
  editForm,
  editTarget,
  inputClass,
  onChange,
  onClose,
  onSave,
  saving,
  selectClass,
}: AdminEquipmentEditModalProps) {
  if (!editTarget) return null;
  const isPpc = editTarget.ownerId === null;

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/70 backdrop-blur-sm">
      <button type="button" aria-label="Close edit equipment dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !saving && onClose()} />
      <div className="relative z-10 bg-neutral-950 border border-neutral-800 p-6 max-w-lg w-full mx-4 space-y-4">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-400">Edit Equipment</p>
        <form onSubmit={onSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isPpc && (
            <input aria-label="Asset Tag" type="text" value={editForm.assetTag} onChange={(e) => onChange({ assetTag: e.target.value })} placeholder="Asset Tag" className={inputClass} />
          )}
          <input aria-label="Name *" type="text" value={editForm.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Name *" required className={inputClass} />
          <input aria-label="Model" type="text" value={editForm.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="Model" className={inputClass} />
          <select value={editForm.category} onChange={(e) => onChange({ category: e.target.value })} className={selectClass}>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={editForm.condition} onChange={(e) => onChange({ condition: e.target.value })} className={selectClass}>
            <option value="">No condition</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <div className={isPpc ? "" : "sm:col-span-2"}>
            <input aria-label="Description" type="text" value={editForm.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" className={inputClass} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={saving} className={`${btnPrimary} disabled:opacity-50`}>
              {saving ? "Saving" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AdminPpcEquipmentModalProps {
  btnOutline: string;
  btnPrimary: string;
  form: EquipmentForm;
  inputClass: string;
  isOpen: boolean;
  onAutofill: (fields: EquipmentAutofill) => void;
  onChange: (patch: Partial<EquipmentForm>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  selectClass: string;
}

function AdminPpcEquipmentModal({
  btnOutline,
  btnPrimary,
  form,
  inputClass,
  isOpen,
  onAutofill,
  onChange,
  onClose,
  onSubmit,
  selectClass,
}: AdminPpcEquipmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <button type="button" aria-label="Close PPC equipment dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-sm border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60">
        <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">Add Club Equipment</p>
            <h3 className="text-lg font-medium text-neutral-100">Create a PPC inventory item</h3>
          </div>

          <BestBuyEquipmentLookup
            onSelect={onAutofill}
            inputClassName={inputClass}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Asset tag" hint="Use the club inventory ID printed on the item.">
              <input aria-label="Asset tag" type="text" value={form.assetTag} onChange={(e) => onChange({ assetTag: e.target.value })} placeholder="PPC-001" required className={inputClass} />
            </FormField>
            <FormField label="Equipment name">
              <input aria-label="Equipment name" type="text" value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Camera, lens, lighting kit" required className={inputClass} />
            </FormField>
            <FormField label="Model">
              <input aria-label="Model" type="text" value={form.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="Brand and model" className={inputClass} />
            </FormField>
            <FormField label="Category">
              <select aria-label="Category" value={form.category} onChange={(e) => onChange({ category: e.target.value })} className={selectClass}>
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </FormField>
            <FormField label="Condition">
              <select aria-label="Condition" value={form.condition} onChange={(e) => onChange({ condition: e.target.value })} className={selectClass}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <textarea aria-label="Description" rows={3} value={form.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Included accessories, known quirks, or checkout notes" className={`${inputClass} resize-y`} />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={btnOutline}>Cancel</button>
            <button type="submit" className={btnPrimary}>Add Equipment</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================
// Component
// ========================

export default function AdminEquipment() {
  const viewModel = useAdminEquipmentViewModel();
  return <AdminEquipmentContent viewModel={viewModel} />;
}

function useAdminEquipmentViewModel() {
  const currentTimeMs = useMemo(() => Date.now(), []);
  const todayInputMin = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [state, dispatchState] = useReducer(adminEquipmentReducer, initialAdminEquipmentState);
  const {
    approveDueDate,
    approvingId,
    deleting,
    deleteTarget,
    editForm,
    editTarget,
    error,
    expandedLoans,
    history,
    historyFilter,
    historyLoading,
    historySearch,
    items,
    loading,
    loans,
    ppcForm,
    saving,
    search,
    showAddPpc,
    success,
    view,
  } = state;
  const stateSetters = useMemo(() => ({
    setApproveDueDate: createAdminEquipmentSetter(dispatchState, "approveDueDate"),
    setApprovingId: createAdminEquipmentSetter(dispatchState, "approvingId"),
    setDeleting: createAdminEquipmentSetter(dispatchState, "deleting"),
    setDeleteTarget: createAdminEquipmentSetter(dispatchState, "deleteTarget"),
    setEditForm: createAdminEquipmentSetter(dispatchState, "editForm"),
    setEditTarget: createAdminEquipmentSetter(dispatchState, "editTarget"),
    setError: createAdminEquipmentSetter(dispatchState, "error"),
    setExpandedLoans: createAdminEquipmentSetter(dispatchState, "expandedLoans"),
    setHistory: createAdminEquipmentSetter(dispatchState, "history"),
    setHistoryFilter: createAdminEquipmentSetter(dispatchState, "historyFilter"),
    setHistoryLoading: createAdminEquipmentSetter(dispatchState, "historyLoading"),
    setHistorySearch: createAdminEquipmentSetter(dispatchState, "historySearch"),
    setItems: createAdminEquipmentSetter(dispatchState, "items"),
    setLoading: createAdminEquipmentSetter(dispatchState, "loading"),
    setLoans: createAdminEquipmentSetter(dispatchState, "loans"),
    setPpcForm: createAdminEquipmentSetter(dispatchState, "ppcForm"),
    setSaving: createAdminEquipmentSetter(dispatchState, "saving"),
    setSearch: createAdminEquipmentSetter(dispatchState, "search"),
    setShowAddPpc: createAdminEquipmentSetter(dispatchState, "showAddPpc"),
    setSuccess: createAdminEquipmentSetter(dispatchState, "success"),
    setView: createAdminEquipmentSetter(dispatchState, "view"),
  }), []);
  const {
    setApproveDueDate,
    setApprovingId,
    setDeleting,
    setDeleteTarget,
    setEditForm,
    setEditTarget,
    setError,
    setExpandedLoans,
    setHistory,
    setHistoryFilter,
    setHistoryLoading,
    setHistorySearch,
    setItems,
    setLoading,
    setLoans,
    setPpcForm,
    setSaving,
    setSearch,
    setShowAddPpc,
    setSuccess,
    setView,
  } = stateSetters;

  const clearMessages = () => { setError(""); setSuccess(""); };

  // ========================
  // Data fetching
  // ========================

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchApi("/api/equipment?type=ppc").then((r) => r.ok ? readJson<EquipmentResponse>(r) : Promise.reject()),
      fetchApi("/api/loans").then((r) => r.ok ? readJson<LoanResponse>(r) : Promise.reject()),
    ])
      .then(([eqData, loanData]) => {
        setItems(eqData.equipment || []);
        setLoans(loanData.requests || []);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [setError, setItems, setLoading, setLoans]);

  useEffect(() => { refresh(); }, [refresh]);

  const fetchHistory = useCallback(async (actionFilter = historyFilter) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetchApi(`/api/equipment/history?${params}`);
      if (res.ok) {
        const data = await readJson<HistoryResponse>(res);
        setHistory(data.history || []);
      }
    } catch {}
    setHistoryLoading(false);
  }, [historyFilter, setHistory, setHistoryLoading]);

  const handleViewChange = (nextView: View) => {
    setView(nextView);
    clearMessages();
    if (nextView === "history") void fetchHistory();
  };

  const handleHistoryFilterChange = (nextFilter: string) => {
    setHistoryFilter(nextFilter);
    void fetchHistory(nextFilter);
  };

  // ========================
  // Filtered data
  // ========================

  const ppcItems = useMemo(() => {
    const ppc = items.filter((i) => i.ownerId === null);
    if (!search.trim()) return ppc;
    const q = search.toLowerCase();
    return ppc.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.assetTag && i.assetTag.toLowerCase().includes(q)) ||
      (i.model && i.model.toLowerCase().includes(q))
    );
  }, [items, search]);

  // ========================
  // Actions
  // ========================

  const handleAddPpc = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      const res = await fetchApi("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ppcForm, isClubOwned: true }),
      });
      if (res.ok) {
        setShowAddPpc(false);
        setPpcForm({ name: "", description: "", model: "", assetTag: "", category: "camera", condition: "good" });
        setSuccess("PPC equipment added successfully");
        refresh();
      } else {
        setError(await readErrorMessage(res, "Failed to add equipment"));
      }
    } catch { setError("Failed to add equipment"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    clearMessages();
    setDeleting(true);
    try {
      const res = await fetchApi(`/api/equipment/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Equipment deleted");
        setDeleteTarget(null);
        refresh();
      } else {
        setError(await readErrorMessage(res, "Failed to delete equipment."));
        setDeleteTarget(null);
      }
    } catch {
      setError("Unable to delete equipment.");
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const openEdit = (item: Equipment) => {
    setEditTarget(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      model: item.model || "",
      category: normalizeEquipmentCategory(item.category),
      condition: item.condition || "",
      assetTag: item.assetTag || "",
    });
    clearMessages();
  };

  const applyBestBuyAutofill = (fields: EquipmentAutofill) => {
    setPpcForm((form) => ({
      ...form,
      name: fields.name || form.name,
      model: fields.model || form.model,
      description: fields.description || form.description,
      category: fields.category || form.category,
    }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await fetchApi(`/api/equipment/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditTarget(null);
        setSuccess("Equipment updated");
        refresh();
      } else {
        setError(await readErrorMessage(res, "Failed to update equipment"));
      }
    } catch {
      setError("Failed to update equipment");
    }
    setSaving(false);
  };

  const handleLoanAction = async (loanId: string, action: "approve" | "reject" | "return" | "confirm_return") => {
    clearMessages();
    try {
      const body: Record<string, unknown> = { action };
      if (action === "approve" && approveDueDate) {
        body.dueDate = approveDueDate;
      }
      const res = await fetchApi(`/api/loans/${loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setApprovingId(null);
        setApproveDueDate("");
        setSuccess(`Loan ${action === "return" ? "return submitted" : action === "confirm_return" ? "return confirmed" : action === "reject" ? "rejected" : "approved"} successfully`);
        refresh();
      } else {
        setError(await readErrorMessage(res, `Failed to ${action} loan.`));
      }
    } catch {
      setError(`Unable to ${action} loan.`);
    }
  };

  // ========================
  // Styles
  // ========================

  const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";
  const selectClass = "w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600 transition-colors";
  const btnOutline = "px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors";
  const btnPrimary = "px-5 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors";
  const btnDanger = "px-3 py-1.5 border border-neutral-800 text-[10px] tracking-[0.1em] uppercase text-neutral-500 hover:text-red-400 hover:border-red-900 transition-colors";

  // ========================
  // Equipment card renderer
  // ========================

  const renderEquipmentCard = (item: Equipment) => {
    const canDelete = !hasActiveLoan(item);
    const overdue = item.activeLoan?.dueDate && new Date(item.activeLoan.dueDate).getTime() < currentTimeMs;

    return (
      <div key={item.id} className="group bg-white/[0.02] border border-neutral-800 hover:border-neutral-700 transition-colors">
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm text-neutral-100 font-medium">{item.name}</h3>
                {item.assetTag && (
                  <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[9px] tracking-[0.15em] uppercase text-neutral-400 font-mono">
                    {item.assetTag}
                  </span>
                )}
              </div>
              {item.model && <p className="text-[11px] text-neutral-400 mt-1">{item.model}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => openEdit(item)} className="text-[10px] text-neutral-600 hover:text-neutral-300 transition-colors">Edit</button>
              <button type="button"
                onClick={() => setDeleteTarget(item)}
                disabled={!canDelete}
                title={canDelete ? "Delete item" : "Cannot delete, active loan exists"}
                className={`text-[10px] transition-colors ${canDelete ? "text-neutral-600 hover:text-red-400" : "text-neutral-800 cursor-not-allowed"}`}
              >
                {canDelete ? "Delete" : "Locked"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pt-3 pb-4 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400">
            {getEquipmentCategoryLabel(item.category)}
          </span>
          {item.condition && (
            <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border border-neutral-800 ${conditionColor[item.condition] || "text-neutral-500"}`}>
              {item.condition}
            </span>
          )}
          {item.isAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-900/40 text-[9px] tracking-[0.1em] uppercase text-green-400">
              <span className="size-1.5 rounded-full bg-green-400" /> Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-900/40 text-[9px] tracking-[0.1em] uppercase text-red-400">
              <span className="size-1.5 rounded-full bg-red-400" /> On Loan
            </span>
          )}
          {item.ownerName && item.ownerId !== null && (
            <span className="text-[10px] tracking-wider text-neutral-600">Owner: <span className="text-neutral-500">{item.ownerName}</span></span>
          )}
        </div>

        {item.description && !(item.activeLoan && !item.isAvailable) && (
          <div className="px-5 pb-4 border-t border-neutral-800/50 pt-3">
            <p className="text-[10px] text-neutral-500 leading-relaxed">{item.description}</p>
          </div>
        )}

        {item.activeLoan && !item.isAvailable && (() => {
          const expanded = expandedLoans.has(item.id);
          const loan = item.activeLoan!;
          const toggleExpand = () => {
            setExpandedLoans((prev) => {
              const next = new Set(prev);
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              return next;
            });
          };
          return (
            <div className="px-5 pb-4">
              <button type="button"
                onClick={toggleExpand}
                className="flex items-center gap-2 w-full text-left group/loan"
              >
                <span className={`text-[10px] text-neutral-600 transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-neutral-500 group-hover/loan:text-neutral-300 transition-colors">Loan Details</span>
                <span className={`inline-flex items-center px-2 py-0.5 border text-[9px] tracking-[0.08em] uppercase ${statusBg[loan.status] || ""}`}>
                  {statusLabel[loan.status] || loan.status}
                </span>
                <span className="text-[10px] text-neutral-500 ml-auto">{loan.borrowerName}</span>
              </button>
              {expanded && (
                <div className="mt-2 grid gap-x-3 gap-y-1 border-l border-neutral-800 pl-3 text-[10px] sm:grid-cols-2">
                  <span className="min-w-0 text-neutral-500">Borrower <span className="text-neutral-300">{loan.borrowerName}</span></span>
                  {loan.borrowerEmail && <span className="min-w-0 truncate text-neutral-600">{loan.borrowerEmail}</span>}
                  <span className="text-neutral-600">Requested {new Date(loan.requestedAt).toLocaleDateString()}</span>
                  {loan.approvedAt && <span className="text-neutral-600">Approved {new Date(loan.approvedAt).toLocaleDateString()}</span>}
                  {loan.dueDate && (
                    <span className={overdue ? "font-medium text-red-400" : "text-neutral-500"}>
                      Due {new Date(loan.dueDate).toLocaleDateString()}{overdue && " overdue"}
                    </span>
                  )}
                  {loan.notes && (
                    <p className="min-w-0 truncate text-neutral-500 sm:col-span-2">Notes <span className="text-neutral-400">{loan.notes}</span></p>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  // ========================
  // History tab
  // ========================

  const renderHistoryTab = () => {
    const actionOptions = Object.entries(ACTION_LABELS);
    const q = historySearch.trim().toLowerCase();
    const filteredHistory = q
      ? history.filter((e) =>
          (e.equipmentName && e.equipmentName.toLowerCase().includes(q)) ||
          (e.assetTag && e.assetTag.toLowerCase().includes(q)) ||
          (e.performerName && e.performerName.toLowerCase().includes(q))
        )
      : history;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative min-w-[180px] max-w-xs">
            <input aria-label="Search equipment, tag, user"
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search equipment, tag, user"
              className={inputClass}
            />
            {historySearch && (
              <button type="button" onClick={() => setHistorySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 text-xs">✕</button>
            )}
          </div>
          <select value={historyFilter} onChange={(e) => handleHistoryFilterChange(e.target.value)} className={`${selectClass} sm:w-52`}>
            <option value="">All Actions</option>
            {actionOptions.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={() => void fetchHistory()} className={btnOutline}>Refresh</button>
          <span className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
            {historyLoading ? "Loading" : `${filteredHistory.length} entries`}
          </span>
        </div>

        {!historyLoading && filteredHistory.length === 0 ? (
          <p className="text-xs text-neutral-600">No audit entries found.</p>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((entry) => {
              let details: Record<string, string> = {};
              try { if (entry.details) details = JSON.parse(entry.details); } catch {}
              const changes = details.changes as unknown as Record<string, { old: unknown; new: unknown }> | undefined;

              return (
                <div key={entry.id} className="bg-white/[0.02] border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-[10px] tracking-[0.1em] uppercase font-medium ${actionColor[entry.action] || "text-neutral-400"}`}>
                            {ACTION_LABELS[entry.action] || entry.action}
                          </span>
                          {entry.equipmentName && (
                            <span className="text-sm text-neutral-200">{entry.equipmentName}</span>
                          )}
                          {entry.assetTag && (
                            <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[9px] tracking-[0.15em] uppercase text-neutral-400 font-mono">
                              {entry.assetTag}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10px]">
                          <span className="text-neutral-500">By: <span className="text-neutral-300">{entry.performerName}</span></span>
                          <span className="text-neutral-600">
                            {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {changes && Object.keys(changes).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(changes).map(([field, vals]) => (
                              <div key={field} className="flex items-center gap-2 text-[10px]">
                                <span className="text-neutral-500 capitalize">{field}:</span>
                                <span className="text-red-400/60 line-through">{String(vals.old || "—")}</span>
                                <span className="text-neutral-600">→</span>
                                <span className="text-green-400/80">{String(vals.new || "—")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {"dueDate" in details && details.dueDate && (
                          <p className="text-[10px] text-neutral-600 mt-1">Due date set: {String(details.dueDate)}</p>
                        )}
                        {"notes" in details && details.notes && (
                          <p className="text-[10px] text-neutral-600 mt-1">Notes: {String(details.notes)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return {
    approveDueDate,
    approvingId,
    btnDanger,
    btnOutline,
    btnPrimary,
    clearMessages,
    confirmDelete,
    currentTimeMs,
    deleteTarget,
    deleting,
    editForm,
    editTarget,
    error,
    handleAddPpc,
    handleLoanAction,
    handleSaveEdit,
    handleViewChange,
    inputClass,
    items,
    loading,
    loans,
    ppcForm,
    ppcItems,
    renderEquipmentCard,
    renderHistoryTab,
    saving,
    search,
    selectClass,
    setApproveDueDate,
    setApprovingId,
    setDeleteTarget,
    setEditForm,
    setEditTarget,
    setError,
    setPpcForm,
    setSearch,
    setShowAddPpc,
    setSuccess,
    showAddPpc,
    success,
    todayInputMin,
    view,
    applyBestBuyAutofill,
  };
}

function AdminEquipmentContent({ viewModel }: { viewModel: ReturnType<typeof useAdminEquipmentViewModel> }) {
  const {
    approveDueDate,
    approvingId,
    btnDanger,
    btnOutline,
    btnPrimary,
    clearMessages,
    confirmDelete,
    currentTimeMs,
    deleteTarget,
    deleting,
    editForm,
    editTarget,
    error,
    handleAddPpc,
    handleLoanAction,
    handleSaveEdit,
    handleViewChange,
    inputClass,
    items,
    loading,
    loans,
    ppcForm,
    ppcItems,
    renderEquipmentCard,
    renderHistoryTab,
    saving,
    search,
    selectClass,
    setApproveDueDate,
    setApprovingId,
    setDeleteTarget,
    setEditForm,
    setEditTarget,
    setError,
    setPpcForm,
    setSearch,
    setShowAddPpc,
    setSuccess,
    showAddPpc,
    success,
    todayInputMin,
    view,
    applyBestBuyAutofill,
  } = viewModel;

  if (loading && items.length === 0) return <p className="text-xs text-neutral-500">Loading</p>;

  return (
    <div className="space-y-4">
      {/* Modals */}
      <AdminEquipmentDeleteModal
        btnOutline={btnOutline}
        deleteTarget={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <AdminEquipmentEditModal
        btnOutline={btnOutline}
        btnPrimary={btnPrimary}
        editForm={editForm}
        editTarget={editTarget}
        inputClass={inputClass}
        onChange={(patch) => setEditForm((form) => ({ ...form, ...patch }))}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={saving}
        selectClass={selectClass}
      />
      <AdminPpcEquipmentModal
        btnOutline={btnOutline}
        btnPrimary={btnPrimary}
        form={ppcForm}
        inputClass={inputClass}
        isOpen={showAddPpc}
        onAutofill={applyBestBuyAutofill}
        onChange={(patch) => setPpcForm((form) => ({ ...form, ...patch }))}
        onClose={() => setShowAddPpc(false)}
        onSubmit={handleAddPpc}
        selectClass={selectClass}
      />

      {/* Messages */}
      {error && (
        <div className="p-3 border border-red-900/50 bg-red-900/10 text-xs text-red-400 flex justify-between items-center">
          {error}
          <button type="button" onClick={() => setError("")} className="text-red-600 hover:text-red-400 ml-4">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 border border-green-900/50 bg-green-900/10 text-xs text-green-400 flex justify-between items-center">
          {success}
          <button type="button" onClick={() => setSuccess("")} className="text-green-600 hover:text-green-400 ml-4">✕</button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-neutral-800 overflow-x-auto">
        <button type="button" className={tabClass(view === "ppc")} onClick={() => handleViewChange("ppc")}>PPC ({ppcItems.length})</button>
        <button type="button" className={tabClass(view === "loans")} onClick={() => handleViewChange("loans")}>Loan Requests ({loans.length})</button>
        <button type="button" className={tabClass(view === "history")} onClick={() => handleViewChange("history")}>History</button>
      </div>

      {/* Search (for equipment tabs) */}
      {view === "ppc" && (
        <div className="relative">
          <input aria-label="Search by asset tag, name, model"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset tag, name, model"
            className={inputClass}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 text-xs">✕</button>
          )}
        </div>
      )}

      {/* PPC view */}
      {view === "ppc" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">{ppcItems.length} PPC items</p>
            <button type="button" onClick={() => { setShowAddPpc(true); clearMessages(); }} className={btnOutline}>
              + Add PPC Equipment
            </button>
          </div>

          <div className="space-y-3">
            {ppcItems.map((item) => renderEquipmentCard(item))}
          </div>
        </div>
      )}

      {/* Loan requests view */}
      {view === "loans" && (
        <div className="space-y-3">
          <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">{loans.length} pending/active requests</p>
          {loans.length === 0 ? (
            <p className="text-xs text-neutral-600">No active loan requests.</p>
          ) : (
            loans.map((loan) => (
              <div key={loan.id} className="bg-white/[0.02] border border-neutral-800 hover:border-neutral-700 transition-colors">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-sm text-neutral-100 font-medium">{loan.equipmentName}</h3>
                        {loan.equipmentAssetTag && (
                          <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[9px] tracking-[0.15em] uppercase text-neutral-400 font-mono">
                            {loan.equipmentAssetTag}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 border text-[9px] tracking-[0.1em] uppercase ${statusBg[loan.status] || ""}`}>
                          {statusLabel[loan.status] || loan.status}
                        </span>
                        <span className="text-[9px] tracking-wider text-neutral-600 uppercase">PPC</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px]">
                        <span className="text-neutral-400">Borrower: <span className="text-neutral-300">{loan.borrowerName}</span></span>
                        <span className="text-neutral-600">{loan.borrowerEmail}</span>
                        <span className="text-neutral-600">Requested {new Date(loan.requestedAt).toLocaleDateString()}</span>
                        {loan.dueDate && (
                          <span className={new Date(loan.dueDate).getTime() < currentTimeMs ? "text-red-400" : "text-neutral-500"}>
                            Due {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {loan.notes && <p className="text-[10px] text-neutral-600 mt-2">{loan.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {loan.status === "pending" && (
                        <>
                          {approvingId === loan.id ? (
                            <div className="flex items-center gap-2">
	                              <input aria-label="Loan due date" type="date" value={approveDueDate} onChange={(e) => setApproveDueDate(e.target.value)} className={`${inputClass} w-36 text-[10px] [color-scheme:dark]`} min={todayInputMin} />
                              <button type="button" onClick={() => handleLoanAction(loan.id, "approve")} className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">Confirm</button>
                              <button type="button" onClick={() => { setApprovingId(null); setApproveDueDate(""); }} className={btnDanger}>Cancel</button>
                            </div>
                          ) : (
                            <>
                              <button type="button" onClick={() => setApprovingId(loan.id)} className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">Approve</button>
                              <button type="button" onClick={() => handleLoanAction(loan.id, "reject")} className={btnDanger}>Reject</button>
                            </>
                          )}
                        </>
                      )}
                      {loan.status === "active" && (
                        <button type="button" onClick={() => handleLoanAction(loan.id, "return")} className={btnOutline}>Mark Returned</button>
                      )}
                      {loan.status === "pending_return" && (
                        <button type="button" onClick={() => handleLoanAction(loan.id, "confirm_return")} className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">Confirm Return</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History / Audit Trail */}
      {view === "history" && renderHistoryTab()}
    </div>
  );
}
