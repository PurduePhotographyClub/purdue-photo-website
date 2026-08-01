import {
  useReducer,
  useMemo,
  useCallback,
  useEffect
} from "react";
import { Lock, UserRound } from "lucide-react";
import useSWR from "swr";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import MarkdownMessage from "@/components/dashboard/MarkdownMessage";
import {
  fetchApi,
  PUBLIC_API_SWR_OPTIONS,
  fetchJson,
  readErrorMessage
} from "@/lib/http";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_FILTERS, getEquipmentCategoryLabel, normalizeEquipmentCategory } from "@/lib/equipment";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

// ========================
// Types
// ========================

interface EquipmentItem {
  id: string;
  assetTag: string | null;
  name: string;
  description: string | null;
  model: string | null;
  category: string;
  condition: string | null;
  lenderTerms: string | null;
  isAvailable: boolean;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
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
    termsSnapshot: string | null;
    discordChannelId: string | null;
  } | null;
}

interface LoanItem {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentModel: string | null;
  equipmentAssetTag: string | null;
  equipmentCategory: string;
  equipmentOwnerId: string | null;
  lenderName?: string | null;
  borrowerId?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  dueDate: string | null;
  returnedAt: string | null;
  notes: string | null;
  termsSnapshot: string | null;
  discordChannelId: string | null;
  isLender: boolean;
}

interface Props {
  userRole: string;
  userTier: string | null;
  userId: string;
}

interface EquipmentResponse {
  equipment?: EquipmentItem[];
}

interface LoansResponse {
  borrowed?: LoanItem[];
  requests?: LoanItem[];
}

interface EquipmentTermsResponse {
  key: string;
  status: {
    acceptedAt: string | null;
    deniedAt: string | null;
    isAccepted: boolean;
    key: string;
  };
  terms: string;
}

const EMPTY_EQUIPMENT: EquipmentItem[] = [];

type Tab = "ppc" | "personal" | "loans";
type PersonalSubTab = "browse" | "manage";

interface EquipmentEditForm {
  name: string;
  description: string;
  model: string;
  category: string;
  condition: string;
  assetTag: string;
  lenderTerms: string;
}

interface PersonalEquipmentForm {
  name: string;
  description: string;
  model: string;
  category: string;
  condition: string;
  lenderTerms: string;
}

interface EquipmentDashboardState {
  activeTab: Tab;
  ppcEquipment: EquipmentItem[];
  ppcSearch: string;
  ppcCategory: string;
  ppcLoading: boolean;
  personalEquipment: EquipmentItem[];
  personalSearch: string;
  personalCategory: string;
  personalSubTab: PersonalSubTab;
  personalLoading: boolean;
  myLoans: LoanItem[];
  incomingRequests: LoanItem[];
  loansLoading: boolean;
  loanSubTab: "borrowed" | "requests";
  error: string;
  success: string;
  showAddPersonal: boolean;
  personalForm: PersonalEquipmentForm;
  borrowingId: string | null;
  borrowNotes: string;
  borrowSubmitting: boolean;
  expandedLoans: Set<string>;
  approvingId: string | null;
  approveDueDate: string;
  deleteTarget: EquipmentItem | null;
  deleting: boolean;
  editTarget: EquipmentItem | null;
  editForm: EquipmentEditForm;
  saving: boolean;
}

const emptyPersonalEquipmentForm: PersonalEquipmentForm = {
  name: "",
  description: "",
  model: "",
  category: "camera",
  condition: "good",
  lenderTerms: "",
};

const emptyEquipmentEditForm: EquipmentEditForm = {
  name: "",
  description: "",
  model: "",
  category: "",
  condition: "",
  assetTag: "",
  lenderTerms: "",
};

const initialEquipmentDashboardState: EquipmentDashboardState = {
  activeTab: "ppc",
  ppcEquipment: [],
  ppcSearch: "",
  ppcCategory: "",
  ppcLoading: true,
  personalEquipment: [],
  personalSearch: "",
  personalCategory: "",
  personalSubTab: "browse",
  personalLoading: true,
  myLoans: [],
  incomingRequests: [],
  loansLoading: true,
  loanSubTab: "borrowed",
  error: "",
  success: "",
  showAddPersonal: false,
  personalForm: emptyPersonalEquipmentForm,
  borrowingId: null,
  borrowNotes: "",
  borrowSubmitting: false,
  expandedLoans: new Set(),
  approvingId: null,
  approveDueDate: "",
  deleteTarget: null,
  deleting: false,
  editTarget: null,
  editForm: emptyEquipmentEditForm,
  saving: false,
};

const CATEGORIES = EQUIPMENT_CATEGORY_FILTERS;
const CATEGORY_OPTIONS = EQUIPMENT_CATEGORIES;
const EQUIPMENT_TERMS_CHANNEL_LABEL = "#terms";
const EQUIPMENT_TERMS_REFRESH_INTERVAL_MS = 10_000;
const EQUIPMENT_TERMS_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  dedupingInterval: 5_000,
  focusThrottleInterval: 5_000,
  refreshInterval: (latestTerms?: EquipmentTermsResponse) =>
    latestTerms?.status.isAccepted === true
      ? 0
      : EQUIPMENT_TERMS_REFRESH_INTERVAL_MS,
  refreshWhenHidden: false,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};
const EMPTY_BORROWING_TERMS_MESSAGE = "This member did not add additional terms. Coordinate details in the loan thread if approved.";
const BORROWING_TERMS_BODY_CLASS = "space-y-2 text-xs leading-relaxed text-neutral-400";
const BORROWING_TERMS_PREVIEW_CLASS = "mt-1 space-y-1 text-[10px] leading-relaxed text-neutral-400";

const CONDITIONS = ["excellent", "good", "fair", "poor"];

const statusBg: Record<string, string> = {
  pending: "bg-yellow-500/10 border-yellow-900/50 text-yellow-400",
  approved: "bg-blue-500/10 border-blue-900/50 text-blue-400",
  active: "bg-green-500/10 border-green-900/50 text-green-400",
  pending_return: "bg-orange-500/10 border-orange-900/50 text-orange-400",
  returned: "bg-neutral-500/10 border-neutral-800 text-neutral-500",
  rejected: "bg-red-500/10 border-red-900/50 text-red-500",
};

const statusColor: Record<string, string> = {
  pending: "text-yellow-500",
  approved: "text-blue-400",
  active: "text-green-400",
  pending_return: "text-orange-400",
  returned: "text-neutral-500",
  rejected: "text-red-500",
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

function tabClass(active: boolean) {
  return `px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 whitespace-nowrap ${
    active ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"
  }`;
}

function AvailabilityBadge({ item }: { item: EquipmentItem }) {
  if (item.isAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-900/40 text-[9px] tracking-[0.1em] uppercase text-green-400">
        <span className="size-1.5 rounded-full bg-green-400" /> Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-900/40 text-[9px] tracking-[0.1em] uppercase text-red-400">
      <span className="size-1.5 rounded-full bg-red-400" /> On Loan
    </span>
  );
}

function ConditionBadge({ condition }: { condition: string | null }) {
  if (!condition) return null;
  return (
    <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border border-neutral-800 ${conditionColor[condition] || "text-neutral-500"}`}>
      {condition}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400">
      {getEquipmentCategoryLabel(category)}
    </span>
  );
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

interface EquipmentSearchBarProps {
  category: string;
  inputClass: string;
  onCategoryChange: (value: string) => void;
  onChange: (value: string) => void;
  placeholder: string;
  selectClass: string;
  value: string;
}

function EquipmentSearchBar({ category, inputClass, onCategoryChange, onChange, placeholder, selectClass, value }: EquipmentSearchBarProps) {
  return (
    <div className="flex gap-3 flex-col sm:flex-row">
      <div className="flex-1 relative">
        <input aria-label={placeholder} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
        {value && (
          <button type="button" onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 text-xs">✕</button>
        )}
      </div>
      <select aria-label="Equipment category" value={category} onChange={(e) => onCategoryChange(e.target.value)} className={`${selectClass} sm:w-44`}>
        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
  );
}

function hasActiveLoan(item: EquipmentItem) {
  return item.activeLoan && (item.activeLoan.status === "active" || item.activeLoan.status === "pending" || item.activeLoan.status === "approved" || item.activeLoan.status === "pending_return");
}

function isOpenLoanStatus(status: string) {
  return status === "pending" || status === "approved" || status === "active" || status === "pending_return";
}

function getLoanLenderLabel(loan: Pick<LoanItem, "equipmentOwnerId" | "lenderName" | "isLender">) {
  if (loan.equipmentOwnerId === null) {
    return "PPC Equipment Team";
  }

  return loan.isLender ? "You" : loan.lenderName || "Member";
}

interface BorrowEquipmentModalProps {
  borrowingId: string | null;
  borrowNotes: string;
  borrowSubmitting: boolean;
  btnOutline: string;
  btnPrimary: string;
  inputClass: string;
  onBorrow: (equipmentId: string) => void;
  onClose: () => void;
  onNotesChange: (value: string) => void;
  equipmentItems: EquipmentItem[];
}

function BorrowEquipmentModal({
  borrowingId,
  borrowNotes,
  borrowSubmitting,
  btnOutline,
  btnPrimary,
  inputClass,
  onBorrow,
  onClose,
  onNotesChange,
  equipmentItems,
}: BorrowEquipmentModalProps) {
  if (!borrowingId) return null;
  const item = equipmentItems.find((equipment) => equipment.id === borrowingId);
  if (!item) return null;
  const isPersonalGear = item.ownerId !== null;

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <button type="button" aria-label="Close borrow request dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-sm border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="space-y-3">
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">Borrow Request</p>
            <div className="space-y-1.5">
              <h3 className="text-lg font-medium text-neutral-100">{item.name}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {item.assetTag && (
                  <span className="border border-neutral-700 bg-neutral-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-neutral-400">
                    {item.assetTag}
                  </span>
                )}
                {item.model && <span className="text-xs text-neutral-500">{item.model}</span>}
                <CategoryBadge category={item.category} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 border border-neutral-800 bg-white/[0.02] p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">Lender</p>
              <p className="text-xs text-neutral-300">{isPersonalGear ? item.ownerName || "Member" : "PPC Equipment Team"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">Request type</p>
              <p className="text-xs text-neutral-300">{isPersonalGear ? "Personal gear" : "PPC equipment"}</p>
            </div>
          </div>

          {isPersonalGear && (
            <div className="border border-neutral-800 bg-white/[0.02] p-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">Member Terms</p>
              <MarkdownMessage
                value={item.lenderTerms || EMPTY_BORROWING_TERMS_MESSAGE}
                className={BORROWING_TERMS_BODY_CLASS}
              />
            </div>
          )}

          <FormField label="Request note" hint="Optional: include pickup timing, project details, or anything the lender should know.">
            <textarea aria-label="Request note"
              value={borrowNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Example: I can pick it up Tuesday afternoon and return it before the meeting."
              rows={4}
              className={`${inputClass} min-h-28 resize-y leading-relaxed`}
            />
          </FormField>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={borrowSubmitting} className={btnOutline}>Cancel</button>
            <button type="button" onClick={() => onBorrow(item.id)} disabled={borrowSubmitting} className={`${btnPrimary} disabled:opacity-50`}>
              {borrowSubmitting ? "Submitting" : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EquipmentDeleteModalProps {
  btnOutline: string;
  deleteTarget: EquipmentItem | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function EquipmentDeleteModal({ btnOutline, deleteTarget, deleting, onClose, onConfirm }: EquipmentDeleteModalProps) {
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

interface EquipmentEditModalProps {
  btnOutline: string;
  btnPrimary: string;
  editForm: EquipmentEditForm;
  editTarget: EquipmentItem | null;
  inputClass: string;
  isAdmin: boolean;
  onChange: (patch: Partial<EquipmentEditForm>) => void;
  onClose: () => void;
  onSave: (event: React.FormEvent) => void;
  saving: boolean;
  selectClass: string;
}

function EquipmentEditModal({
  btnOutline,
  btnPrimary,
  editForm,
  editTarget,
  inputClass,
  isAdmin,
  onChange,
  onClose,
  onSave,
  saving,
  selectClass,
}: EquipmentEditModalProps) {
  if (!editTarget) return null;
  const isPpc = editTarget.ownerId === null;

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/70 backdrop-blur-sm">
      <button type="button" aria-label="Close edit equipment dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !saving && onClose()} />
      <div className="relative z-10 w-full max-w-2xl rounded-sm border border-neutral-800 bg-neutral-950 p-5 shadow-2xl shadow-black/60 sm:p-6 mx-4 space-y-4">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-400">Edit Equipment</p>
        <form onSubmit={onSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isPpc && isAdmin && (
            <FormField label="Asset tag">
              <input aria-label="Asset tag" type="text" value={editForm.assetTag} onChange={(e) => onChange({ assetTag: e.target.value })} placeholder="PPC-001" className={inputClass} />
            </FormField>
          )}
          <FormField label="Equipment name">
            <input aria-label="Equipment name" type="text" value={editForm.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Camera, lens, flash, kit name" required className={inputClass} />
          </FormField>
          <FormField label="Model">
            <input aria-label="Model" type="text" value={editForm.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="Brand and model" className={inputClass} />
          </FormField>
          <FormField label="Category">
            <select aria-label="Category" value={editForm.category} onChange={(e) => onChange({ category: e.target.value })} className={selectClass}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          <FormField label="Condition">
            <select aria-label="Condition" value={editForm.condition} onChange={(e) => onChange({ condition: e.target.value })} className={selectClass}>
              <option value="">No condition</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </FormField>
          <FormField label="Description" className={isPpc && isAdmin ? "" : "sm:col-span-2"}>
            <input aria-label="Description" type="text" value={editForm.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Short details members should see" className={inputClass} />
          </FormField>
          {!isPpc && (
            <FormField label="Borrowing terms" hint="Visible to borrowers before they request your gear." className="sm:col-span-2">
              <textarea
                aria-label="Borrowing terms"
                rows={4}
                value={editForm.lenderTerms}
                onChange={(e) => onChange({ lenderTerms: e.target.value })}
                placeholder="Pickup expectations, care notes, deposit request, or return timing"
                className={`${inputClass} resize-y`}
              />
            </FormField>
          )}
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

interface PersonalGearModalProps {
  btnOutline: string;
  btnPrimary: string;
  form: PersonalEquipmentForm;
  inputClass: string;
  isOpen: boolean;
  onChange: (patch: Partial<PersonalEquipmentForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
  selectClass: string;
  termsAccepted: boolean;
}

function PersonalGearModal({
  btnOutline,
  btnPrimary,
  form,
  inputClass,
  isOpen,
  onChange,
  onClose,
  onSubmit,
  selectClass,
  termsAccepted,
}: PersonalGearModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <button type="button" aria-label="Close personal gear dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-sm border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">List Personal Gear</p>
            <h3 className="text-lg font-medium text-neutral-100">Share an item with club members</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Equipment name" className="sm:col-span-2">
              <input
                aria-label="Equipment name"
                type="text"
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Sony a6700, flash kit, tripod"
                required
                className={inputClass}
              />
            </FormField>
            <FormField label="Model">
              <input
                aria-label="Model"
                type="text"
                value={form.model}
                onChange={(e) => onChange({ model: e.target.value })}
                placeholder="Brand and model"
                className={inputClass}
              />
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
              <textarea
                aria-label="Description"
                rows={3}
                value={form.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="What is included... lens, charger, case, etc."
                className={`${inputClass} resize-y`}
              />
            </FormField>
            <FormField label="Borrowing terms" hint="Shown to members before they request the item." className="sm:col-span-2">
              <textarea
                aria-label="Borrowing terms"
                rows={4}
                value={form.lenderTerms}
                onChange={(e) => onChange({ lenderTerms: e.target.value })}
                placeholder="Pickup expectations, care notes, or return timing"
                className={`${inputClass} resize-y`}
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-end">
            {!termsAccepted && (
              <p className="mr-auto flex items-center gap-2 text-[10px] text-amber-300">
                <Lock size={12} aria-hidden="true" />
                Accept the Discord terms before listing personal gear.
              </p>
            )}
            <button type="button" onClick={onClose} className={btnOutline}>Cancel</button>
            <button type="button" onClick={onSubmit} disabled={!form.name.trim() || !termsAccepted} className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-50`}>
              {!termsAccepted && <Lock size={12} aria-hidden="true" />}
              {termsAccepted ? "List Gear" : "Locked"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================
// Component
// ========================

export default function EquipmentDashboard(props: Props) {
  const viewModel = useEquipmentDashboardViewModel(props);
  return <EquipmentDashboardContent viewModel={viewModel} />;
}

function useEquipmentDashboardViewModel({ userRole, userTier, userId }: Props) {
  const [state, dispatchState] = useReducer(
    keyedStateReducer<EquipmentDashboardState>,
    initialEquipmentDashboardState,
  );
  const {
    activeTab,
    ppcSearch,
    ppcCategory,
    personalSearch,
    personalCategory,
    personalSubTab,
    loanSubTab,
    error,
    success,
    showAddPersonal,
    personalForm,
    borrowingId,
    borrowNotes,
    borrowSubmitting,
    expandedLoans,
    approvingId,
    approveDueDate,
    deleteTarget,
    deleting,
    editTarget,
    editForm,
    saving,
  } = state;
  const {
    setActiveTab,
    setPpcSearch,
    setPpcCategory,
    setPersonalSearch,
    setPersonalCategory,
    setPersonalSubTab,
    setLoanSubTab,
    setError,
    setSuccess,
    setShowAddPersonal,
    setPersonalForm,
    setBorrowingId,
    setBorrowNotes,
    setBorrowSubmitting,
    setExpandedLoans,
    setApprovingId,
    setApproveDueDate,
    setDeleteTarget,
    setDeleting,
    setEditTarget,
    setEditForm,
    setSaving,
  } = useMemo(() => ({
    setActiveTab: createKeyedStateSetter(dispatchState, "activeTab"),
    setPpcSearch: createKeyedStateSetter(dispatchState, "ppcSearch"),
    setPpcCategory: createKeyedStateSetter(dispatchState, "ppcCategory"),
    setPersonalSearch: createKeyedStateSetter(dispatchState, "personalSearch"),
    setPersonalCategory: createKeyedStateSetter(dispatchState, "personalCategory"),
    setPersonalSubTab: createKeyedStateSetter(dispatchState, "personalSubTab"),
    setLoanSubTab: createKeyedStateSetter(dispatchState, "loanSubTab"),
    setError: createKeyedStateSetter(dispatchState, "error"),
    setSuccess: createKeyedStateSetter(dispatchState, "success"),
    setShowAddPersonal: createKeyedStateSetter(dispatchState, "showAddPersonal"),
    setPersonalForm: createKeyedStateSetter(dispatchState, "personalForm"),
    setBorrowingId: createKeyedStateSetter(dispatchState, "borrowingId"),
    setBorrowNotes: createKeyedStateSetter(dispatchState, "borrowNotes"),
    setBorrowSubmitting: createKeyedStateSetter(dispatchState, "borrowSubmitting"),
    setExpandedLoans: createKeyedStateSetter(dispatchState, "expandedLoans"),
    setApprovingId: createKeyedStateSetter(dispatchState, "approvingId"),
    setApproveDueDate: createKeyedStateSetter(dispatchState, "approveDueDate"),
    setDeleteTarget: createKeyedStateSetter(dispatchState, "deleteTarget"),
    setDeleting: createKeyedStateSetter(dispatchState, "deleting"),
    setEditTarget: createKeyedStateSetter(dispatchState, "editTarget"),
    setEditForm: createKeyedStateSetter(dispatchState, "editForm"),
    setSaving: createKeyedStateSetter(dispatchState, "saving"),
  }), [dispatchState]);
  const currentTimeMs = useMemo(() => Date.now(), []);
  const todayInputMin = useMemo(() => new Date().toISOString().split("T")[0], []);

  const isAdmin = userRole === "admin" || userRole === "officer";
  const canRequestPpc = isAdmin || userTier === "facilities";
  const canRequestPersonal = isAdmin || userTier === "facilities" || userTier === "member";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const loan = params.get("loan");

    if (tab === "personal" || tab === "ppc" || tab === "loans") {
      setActiveTab(tab);
    }

    if (loan === "requests" || loan === "borrowed") {
      setLoanSubTab(loan);
    }
  }, [setActiveTab, setLoanSubTab]);

  // ========================
  // Data fetching
  // ========================

  const {
    data: ppcData,
    isLoading: ppcLoading,
    mutate: mutatePpcEquipment,
  } = useSWR<EquipmentResponse>("/api/equipment?type=ppc", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const {
    data: personalData,
    isLoading: personalLoading,
    mutate: mutatePersonalEquipment,
  } = useSWR<EquipmentResponse>("/api/equipment?type=personal", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const {
    data: loansData,
    isLoading: loansLoading,
    mutate: mutateLoans,
  } = useSWR<LoansResponse>("/api/loans", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const {
    data: termsData,
    mutate: mutateTerms,
  } = useSWR<EquipmentTermsResponse>("/api/equipment/terms", fetchJson, EQUIPMENT_TERMS_SWR_OPTIONS);

  const ppcEquipment = ppcData?.equipment ?? EMPTY_EQUIPMENT;
  const personalEquipment = personalData?.equipment ?? EMPTY_EQUIPMENT;
  const myLoans = loansData?.borrowed ?? [];
  const incomingRequests = (loansData?.requests ?? []).filter((loan) => loan.equipmentOwnerId !== null);
  const termsStatus = termsData?.status ?? null;
  const termsAccepted = termsStatus?.isAccepted === true;

  const refreshAll = useCallback(() => {
    void Promise.all([
      mutatePpcEquipment(),
      mutatePersonalEquipment(),
      mutateLoans(),
      mutateTerms(),
    ]);
  }, [mutateLoans, mutatePersonalEquipment, mutatePpcEquipment, mutateTerms]);

  // ========================
  // Filtered data
  // ========================

  const filteredPpc = useMemo(() => {
    const categoryItems = ppcCategory
      ? ppcEquipment.filter((e) => normalizeEquipmentCategory(e.category) === ppcCategory)
      : ppcEquipment;
    if (!ppcSearch.trim()) return categoryItems;
    const q = ppcSearch.toLowerCase();
    return categoryItems.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.model && e.model.toLowerCase().includes(q)) ||
        (e.assetTag && e.assetTag.toLowerCase().includes(q))
    );
  }, [ppcCategory, ppcEquipment, ppcSearch]);

  const filteredPersonal = useMemo(() => {
    const categoryItems = personalCategory
      ? personalEquipment.filter((e) => normalizeEquipmentCategory(e.category) === personalCategory)
      : personalEquipment;
    if (!personalSearch.trim()) return categoryItems;
    const q = personalSearch.toLowerCase();
    return categoryItems.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.model && e.model.toLowerCase().includes(q))
    );
  }, [personalCategory, personalEquipment, personalSearch]);

  const personalGearToBorrow = useMemo(
    () => filteredPersonal.filter((item) => item.ownerId !== userId),
    [filteredPersonal, userId],
  );
  const myPersonalGear = useMemo(
    () => filteredPersonal.filter((item) => item.ownerId === userId),
    [filteredPersonal, userId],
  );
  const myPersonalGearCount = useMemo(
    () => personalEquipment.filter((item) => item.ownerId === userId).length,
    [personalEquipment, userId],
  );

  // ========================
  // Actions
  // ========================

  const clearMessages = () => { setError(""); setSuccess(""); };

  const handleAddPersonal = async () => {
    if (!personalForm.name.trim()) return;
    clearMessages();
    try {
      const res = await fetchApi("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...personalForm, isClubOwned: false }),
      });
      if (res.ok) {
        setShowAddPersonal(false);
        setPersonalForm(emptyPersonalEquipmentForm);
        setPersonalSubTab("manage");
        setSuccess("Personal equipment listed successfully");
        refreshAll();
      } else {
        setError(await readErrorMessage(res, "Failed to list equipment"));
      }
    } catch { setError("Failed to list equipment"); }
  };

  const handleBorrow = async (equipmentId: string) => {
    clearMessages();
    setBorrowSubmitting(true);
    try {
      const res = await fetchApi("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipmentId, notes: borrowNotes || undefined }),
      });
      if (res.ok) {
        setBorrowingId(null);
        setBorrowNotes("");
        setSuccess("Borrow request submitted");
        refreshAll();
      } else {
        setError(await readErrorMessage(res, "Failed to submit request"));
      }
    } catch { setError("Failed to submit request"); }
    setBorrowSubmitting(false);
  };

  const closeBorrowModal = () => {
    if (borrowSubmitting) return;
    setBorrowingId(null);
    setBorrowNotes("");
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
        setSuccess(`Loan ${action === "return" ? "return submitted for approval" : action === "confirm_return" ? "return confirmed" : action === "reject" ? "rejected" : "approved"} successfully`);
        refreshAll();
      } else {
        setError(await readErrorMessage(res, `Failed to ${action} loan`));
      }
    } catch { setError(`Failed to ${action} loan`); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    clearMessages();
    setDeleting(true);
    try {
      const res = await fetchApi(`/api/equipment/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Equipment removed");
        setDeleteTarget(null);
        refreshAll();
      } else {
        setError(await readErrorMessage(res, "Failed to delete equipment"));
        setDeleteTarget(null);
      }
    } catch {
      setError("Failed to delete equipment");
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const openEdit = (item: EquipmentItem) => {
    setEditTarget(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      model: item.model || "",
      category: normalizeEquipmentCategory(item.category),
      condition: item.condition || "",
      assetTag: item.assetTag || "",
      lenderTerms: item.lenderTerms || "",
    });
    clearMessages();
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
        refreshAll();
      } else {
        setError(await readErrorMessage(res, "Failed to update equipment"));
      }
    } catch {
      setError("Failed to update equipment");
    }
    setSaving(false);
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
  // Shared sub-renderers
  // ========================

  const renderLoanDetails = (item: EquipmentItem) => {
    if (!item.activeLoan || item.isAvailable) return null;
    const loan = item.activeLoan;
    const overdue = loan.dueDate && new Date(loan.dueDate).getTime() < currentTimeMs;
    const expanded = expandedLoans.has(item.id);
    const toggleExpand = () => {
      setExpandedLoans((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    };
    return (
      <div>
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
  };

  // ========================
  // Equipment Card
  // ========================

  const renderEquipmentCard = (item: EquipmentItem, options: {
    showBorrowButton?: boolean;
    showEditButton?: boolean;
    showDeleteButton?: boolean;
    isOwner?: boolean;
  }) => {
    const { showBorrowButton, showEditButton, showDeleteButton, isOwner: isItemOwner } = options;
    const canDelete = !hasActiveLoan(item);
    const isPpcItem = item.ownerId === null;
    const canBorrowThisItem = isPpcItem ? canRequestPpc : canRequestPersonal;

    return (
      <div key={item.id} className="group flex h-full flex-col overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950/70 shadow-sm shadow-black/20 transition-colors hover:border-neutral-700 hover:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm text-neutral-100 font-medium leading-snug">{item.name}</h3>
                {item.assetTag && (
                  <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[9px] tracking-[0.15em] uppercase text-neutral-400 font-mono">
                    {item.assetTag}
                  </span>
                )}
                {isItemOwner && (
                  <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-800/50 text-[9px] tracking-[0.15em] uppercase text-blue-400">
                    Your Item
                  </span>
                )}
              </div>
              {item.model && <p className="text-[11px] text-neutral-400 mt-1">{item.model}</p>}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
              {showEditButton && (
                <button type="button" onClick={() => openEdit(item)} className="text-[10px] text-neutral-600 hover:text-neutral-300 transition-colors">Edit</button>
              )}
              {showDeleteButton && (
                <button type="button"
                  onClick={() => setDeleteTarget(item)}
                  disabled={!canDelete}
                  title={canDelete ? "Delete item" : "Cannot delete, active loan exists"}
                  className={`text-[10px] transition-colors ${canDelete ? "text-neutral-600 hover:text-red-400" : "text-neutral-800 cursor-not-allowed"}`}
                >
                  {canDelete ? "Delete" : "Locked"}
                </button>
              )}
            </div>
          </div>

          {/* Metadata badges */}
          <div className="flex items-center gap-1.5 flex-wrap border-t border-neutral-900 pt-3">
            <CategoryBadge category={item.category} />
            <ConditionBadge condition={item.condition} />
            <AvailabilityBadge item={item} />
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-wider text-neutral-600">
              <UserRound size={11} aria-hidden="true" />
              Lender: <span className="text-neutral-400">{isPpcItem ? "PPC Equipment Team" : isItemOwner ? "You" : item.ownerName || "Member"}</span>
            </span>
          </div>

          {/* Description, only show standalone when no active loan collapsible */}
          {item.description && !(!item.isAvailable && item.activeLoan && (isAdmin || isItemOwner)) && (
            <p className="max-h-12 overflow-hidden text-[11px] leading-relaxed text-neutral-500">{item.description}</p>
          )}

          {!isPpcItem && item.lenderTerms && (
            <div className="max-h-14 overflow-hidden border-l border-neutral-800 pl-3">
              <p className="text-[10px] leading-relaxed text-neutral-500">Terms</p>
              <MarkdownMessage value={item.lenderTerms} className={BORROWING_TERMS_PREVIEW_CLASS} />
            </div>
          )}

          {/* Loan info (admin or owner) */}
          {(isAdmin || isItemOwner) && item.activeLoan && !item.isAvailable && renderLoanDetails(item)}
        </div>

        {/* Borrow action */}
        {showBorrowButton && item.isAvailable && canBorrowThisItem && !isItemOwner && item.ownerId !== userId && (
          <div className="border-t border-neutral-800/50 px-4 py-3">
            {!termsAccepted && (
              <p className="mb-2 flex items-center gap-2 text-[10px] text-amber-300">
                <Lock size={12} aria-hidden="true" />
                Locked until the Discord terms are accepted
              </p>
            )}
            <button
              type="button"
              onClick={() => { setBorrowingId(item.id); setBorrowNotes(""); clearMessages(); }}
              disabled={!termsAccepted}
              className="flex w-full items-center justify-center gap-2 border border-neutral-700 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-700"
            >
              {!termsAccepted && <Lock size={12} aria-hidden="true" />}
              {termsAccepted ? "Request to Borrow" : "Locked"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ========================
  // PPC Equipment Tab
  // ========================

  const renderPpcTab = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <EquipmentSearchBar
          category={ppcCategory}
          inputClass={inputClass}
          onCategoryChange={setPpcCategory}
          onChange={setPpcSearch}
          placeholder="Search by asset tag, name, model"
          selectClass={selectClass}
          value={ppcSearch}
        />
      </div>

      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
        {ppcLoading ? "Loading" : `${filteredPpc.length} item${filteredPpc.length !== 1 ? "s" : ""}`}
      </p>

      {!ppcLoading && filteredPpc.length === 0 ? (
        <p className="text-xs text-neutral-600">No PPC equipment found.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredPpc.map((item) =>
            renderEquipmentCard(item, {
              showBorrowButton: true,
            })
          )}
        </div>
      )}
    </div>
  );

  // ========================
  // Personal Equipment Tab
  // ========================

  const renderPersonalTab = () => {
    const visiblePersonalGear = personalSubTab === "manage" ? myPersonalGear : personalGearToBorrow;
    const emptyMessage = personalSubTab === "manage"
      ? "You have not listed personal gear yet."
      : "No personal gear from other members matches this search.";

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex overflow-x-auto border-b border-neutral-800">
            <button type="button" className={tabClass(personalSubTab === "browse")} onClick={() => { setPersonalSubTab("browse"); clearMessages(); }}>
              Browse Gear ({personalGearToBorrow.length})
            </button>
            <button type="button" className={tabClass(personalSubTab === "manage")} onClick={() => { setPersonalSubTab("manage"); clearMessages(); }}>
              Manage My Gear ({myPersonalGearCount})
            </button>
          </div>
          <button type="button" onClick={() => { setShowAddPersonal(true); clearMessages(); }} className={btnOutline}>
            + List Personal Gear
          </button>
        </div>

        <EquipmentSearchBar
          category={personalCategory}
          inputClass={inputClass}
          onCategoryChange={setPersonalCategory}
          onChange={setPersonalSearch}
          placeholder={personalSubTab === "manage" ? "Search your gear" : "Search member gear"}
          selectClass={selectClass}
          value={personalSearch}
        />

        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
          {personalLoading ? "Loading" : `${visiblePersonalGear.length} item${visiblePersonalGear.length !== 1 ? "s" : ""}`}
        </p>

        {!personalLoading && visiblePersonalGear.length === 0 ? (
          <div className="rounded-sm border border-neutral-800 bg-white/[0.02] p-5">
            <p className="text-xs text-neutral-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visiblePersonalGear.map((item) => (
              renderEquipmentCard(item, {
                showBorrowButton: personalSubTab === "browse",
                showDeleteButton: personalSubTab === "manage",
                showEditButton: personalSubTab === "manage",
                isOwner: item.ownerId === userId,
              })
            ))}
          </div>
        )}
      </div>
    );
  };

  // ========================
  // Loans Tab
  // ========================

  const renderLoansTab = () => {
    const activeBorrowed = myLoans.filter((l) => l.status !== "returned" && l.status !== "rejected");
    const pastBorrowed = myLoans.filter((l) => l.status === "returned" || l.status === "rejected");

    return (
      <div className="space-y-5">
        <div className="flex border-b border-neutral-800">
          <button type="button" className={tabClass(loanSubTab === "borrowed")} onClick={() => setLoanSubTab("borrowed")}>
            My Loans {activeBorrowed.length > 0 && `(${activeBorrowed.length})`}
          </button>
          <button type="button" className={tabClass(loanSubTab === "requests")} onClick={() => setLoanSubTab("requests")}>
            Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
          </button>
        </div>

        {loansLoading ? (
          <p className="text-xs text-neutral-500">Loading</p>
        ) : loanSubTab === "borrowed" ? (
          <div className="space-y-5">
            {activeBorrowed.length === 0 && pastBorrowed.length === 0 ? (
              <p className="text-xs text-neutral-600">No loans found.</p>
            ) : (
              <>
                {activeBorrowed.length > 0 && (
                  <>
                    <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">Active</p>
                    <div className="space-y-3">
                      {activeBorrowed.map((loan) => {
                        const overdue = loan.dueDate && new Date(loan.dueDate).getTime() < currentTimeMs;
                        return (
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
                                  </div>
                                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <CategoryBadge category={loan.equipmentCategory} />
                                    {loan.equipmentModel && <span className="text-[10px] text-neutral-600">{loan.equipmentModel}</span>}
                                    <span className="text-[10px] text-neutral-600">
                                      {loan.equipmentOwnerId === null ? "PPC Equipment" : "Personal"}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                                    <span className="text-neutral-600">Borrower: <span className="text-neutral-300">You</span></span>
                                    <span className="text-neutral-600">Lender: <span className="text-neutral-300">{getLoanLenderLabel(loan)}</span></span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px]">
                                    <span className="text-neutral-600">Requested {new Date(loan.requestedAt).toLocaleDateString()}</span>
                                    {loan.dueDate && (
                                      <span className={`font-medium ${overdue ? "text-red-400" : "text-neutral-500"}`}>
                                        Due {new Date(loan.dueDate).toLocaleDateString()}
                                        {overdue && ", OVERDUE"}
                                      </span>
                                    )}
                                  </div>
                                  {loan.notes && <p className="text-[10px] text-neutral-600 mt-2">{loan.notes}</p>}
                                </div>
                                {loan.status === "active" && (
                                  <button type="button" onClick={() => handleLoanAction(loan.id, "return")} className={btnOutline}>Return</button>
                                )}
                                {loan.status === "pending_return" && (
                                  <span className="text-[10px] tracking-[0.1em] uppercase text-orange-400">Awaiting Approval</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {pastBorrowed.length > 0 && (
                  <>
                    <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mt-4">History</p>
                    <div className="space-y-2">
                      {pastBorrowed.slice(0, 10).map((loan) => (
                        <div key={loan.id} className="bg-white/[0.01] border border-neutral-800/50 p-4 opacity-60">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-xs text-neutral-400">{loan.equipmentName}</p>
                            {loan.equipmentAssetTag && <span className="text-[9px] font-mono text-neutral-600">{loan.equipmentAssetTag}</span>}
                            <span className={`text-[10px] capitalize ${statusColor[loan.status]}`}>{loan.status}</span>
                            {loan.returnedAt && <span className="text-[10px] text-neutral-600">Returned {new Date(loan.returnedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-neutral-600">No incoming requests for your personal gear.</p>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.id} className="overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950/70 transition-colors hover:border-neutral-700 hover:bg-white/[0.03]">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-sm text-neutral-100 font-medium">{req.equipmentName}</h3>
                          {req.equipmentAssetTag && (
                            <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[9px] tracking-[0.15em] uppercase text-neutral-400 font-mono">
                              {req.equipmentAssetTag}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 border text-[9px] tracking-[0.1em] uppercase ${statusBg[req.status] || ""}`}>
                            {statusLabel[req.status] || req.status}
                          </span>
                          <span className="text-[9px] tracking-wider text-neutral-600 uppercase">
                            {req.equipmentOwnerId === null ? "PPC" : "Personal"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px]">
                          <span className="text-neutral-400">Borrower: <span className="text-neutral-300">{req.borrowerName}</span></span>
                          <span className="text-neutral-600">Lender: <span className="text-neutral-300">{getLoanLenderLabel(req)}</span></span>
                          {req.borrowerEmail && <span className="text-neutral-600">{req.borrowerEmail}</span>}
                          <span className="text-neutral-600">Requested {new Date(req.requestedAt).toLocaleDateString()}</span>
                          {req.dueDate && (
                            <span className={new Date(req.dueDate).getTime() < currentTimeMs ? "text-red-400" : "text-neutral-500"}>
                              Due {new Date(req.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {req.notes && <p className="text-[10px] text-neutral-600 mt-2">{req.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === "pending" && (
                          <>
                            {approvingId === req.id ? (
                              <div className="flex items-center gap-2">
	                                <input aria-label="Loan due date" type="date" value={approveDueDate} onChange={(e) => setApproveDueDate(e.target.value)} className={`${inputClass} w-36 text-[10px]`} min={todayInputMin} />
                                <button type="button" onClick={() => handleLoanAction(req.id, "approve")} className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">Confirm</button>
                                <button type="button" onClick={() => { setApprovingId(null); setApproveDueDate(""); }} className={btnDanger}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <button type="button" onClick={() => setApprovingId(req.id)} className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">Approve</button>
                                <button type="button" onClick={() => handleLoanAction(req.id, "reject")} className={btnDanger}>Reject</button>
                              </>
                            )}
                          </>
                        )}
                        {req.status === "active" && (
                          <button type="button" onClick={() => handleLoanAction(req.id, "return")} className={btnOutline}>Mark Returned</button>
                        )}
                        {req.status === "pending_return" && (
                          <button type="button" onClick={() => handleLoanAction(req.id, "confirm_return")} className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 transition-colors">Confirm Return</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const activeLoanCount = [...myLoans, ...incomingRequests].filter((loan) => isOpenLoanStatus(loan.status)).length;

  return {
    activeLoanCount,
    activeTab,
    borrowingId,
    borrowNotes,
    borrowSubmitting,
    btnOutline,
    btnPrimary,
    canRequestPpc,
    clearMessages,
    closeBorrowModal,
    confirmDelete,
    deleteTarget,
    deleting,
    editForm,
    editTarget,
    error,
    handleBorrow,
    handleAddPersonal,
    handleSaveEdit,
    inputClass,
    isAdmin,
    equipmentItems: [...ppcEquipment, ...personalEquipment],
    personalForm,
    renderLoansTab,
    renderPersonalTab,
    renderPpcTab,
    saving,
    selectClass,
    setActiveTab,
    setBorrowNotes,
    setDeleteTarget,
    setEditForm,
    setEditTarget,
    setError,
    setPersonalForm,
    setShowAddPersonal,
    setSuccess,
    showAddPersonal,
    success,
    termsAccepted,
    termsData,
  };
}

function EquipmentDashboardContent({ viewModel }: { viewModel: ReturnType<typeof useEquipmentDashboardViewModel> }) {
  const {
    activeLoanCount,
    activeTab,
    borrowingId,
    borrowNotes,
    borrowSubmitting,
    btnOutline,
    btnPrimary,
    canRequestPpc,
    clearMessages,
    closeBorrowModal,
    confirmDelete,
    deleteTarget,
    deleting,
    editForm,
    editTarget,
    error,
    handleAddPersonal,
    handleBorrow,
    handleSaveEdit,
    inputClass,
    isAdmin,
    equipmentItems,
    personalForm,
    renderLoansTab,
    renderPersonalTab,
    renderPpcTab,
    saving,
    selectClass,
    setActiveTab,
    setBorrowNotes,
    setDeleteTarget,
    setEditForm,
    setEditTarget,
    setError,
    setPersonalForm,
    setShowAddPersonal,
    setSuccess,
    showAddPersonal,
    success,
    termsAccepted,
    termsData,
  } = viewModel;

  return (
    <div className="space-y-6">
      {/* Modals */}
      <BorrowEquipmentModal
        borrowingId={borrowingId}
        borrowNotes={borrowNotes}
        borrowSubmitting={borrowSubmitting}
        btnOutline={btnOutline}
        btnPrimary={btnPrimary}
        inputClass={inputClass}
        onBorrow={(equipmentId) => void handleBorrow(equipmentId)}
        onClose={closeBorrowModal}
        onNotesChange={setBorrowNotes}
        equipmentItems={equipmentItems}
      />
      <EquipmentDeleteModal
        btnOutline={btnOutline}
        deleteTarget={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <EquipmentEditModal
        btnOutline={btnOutline}
        btnPrimary={btnPrimary}
        editForm={editForm}
        editTarget={editTarget}
        inputClass={inputClass}
        isAdmin={isAdmin}
        onChange={(patch) => setEditForm((form) => ({ ...form, ...patch }))}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={saving}
        selectClass={selectClass}
      />
      <PersonalGearModal
        btnOutline={btnOutline}
        btnPrimary={btnPrimary}
        form={personalForm}
        inputClass={inputClass}
        isOpen={showAddPersonal}
        onChange={(patch) => setPersonalForm((form) => ({ ...form, ...patch }))}
        onClose={() => setShowAddPersonal(false)}
        onSubmit={() => void handleAddPersonal()}
        selectClass={selectClass}
        termsAccepted={termsAccepted}
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

      {termsData && !termsAccepted && (
        <div className="border border-amber-900/50 bg-amber-950/20 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex size-10 shrink-0 items-center justify-center border border-amber-800/60 bg-amber-950/40 text-amber-300">
              <Lock size={17} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300">Discord terms required</p>
              <p className="max-w-3xl text-xs leading-relaxed text-neutral-400">
                Borrowing and lending are locked until you accept the one-time equipment terms in Discord. Use the accept/deny message in channel <span className="font-mono text-neutral-200">{EQUIPMENT_TERMS_CHANNEL_LABEL}</span>.
              </p>
              {termsData.status.deniedAt && (
                <p className="text-xs text-amber-300">
                  Your latest response is deny. Accept the Discord message when you are ready to use equipment loans.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inner Tab Navigation */}
      <div className="flex border-b border-neutral-800 overflow-x-auto">
        <button type="button" className={tabClass(activeTab === "ppc")} onClick={() => { setActiveTab("ppc"); clearMessages(); }}>
          PPC Equipment
        </button>
        <button type="button" className={tabClass(activeTab === "personal")} onClick={() => { setActiveTab("personal"); clearMessages(); }}>
          Personal Gear
        </button>
        <button type="button" className={tabClass(activeTab === "loans")} onClick={() => { setActiveTab("loans"); clearMessages(); }}>
          Active Loans ({activeLoanCount})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "ppc" && renderPpcTab()}
      {activeTab === "personal" && renderPersonalTab()}
      {activeTab === "loans" && renderLoansTab()}

      {/* View-only notice */}
      {!canRequestPpc && (
        <AccessUpsellPanel
          eyebrow="Facilities unlock"
          title="Request club equipment"
          description="You can browse the full club inventory now. Facilities access unlocks equipment requests for cameras, lenses, lighting, tripods, and accessories."
          ctaLabel="Buy Facilities"
        />
      )}
    </div>
  );
}
