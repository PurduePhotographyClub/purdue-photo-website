import { useMemo, useReducer } from "react";
import useSWR from "swr";
import { Search, Shield, ShieldOff, Trash2, Key, X, RotateCcw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
  readJson
} from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string | null;
  membershipExpiresAt: string | null;
  activatedAt: string | null;
  discordId: string | null;
  createdAt: string;
  suspendedUntil: string | null;
}

interface AvailableKey {
  id: string;
  key: string;
  tier: string;
  expiresAt: string;
  usedBy?: string | null;
}

const ROLES = ["user", "officer", "admin"] as const;
const STATUSES = ["all", "active", "suspended", "expired", "unactivated"] as const;

function getStatus(m: Member): string {
  if (m.suspendedUntil && new Date(m.suspendedUntil) > new Date()) return "suspended";
  if (m.membershipExpiresAt && new Date(m.membershipExpiresAt) < new Date()) return "expired";
  if (!m.activatedAt && m.role !== "admin" && m.role !== "officer") return "unactivated";
  return "active";
}

const statusStyle: Record<string, string> = {
  active: "text-green-400 border-green-900 bg-green-900/10",
  suspended: "text-red-400 border-red-900 bg-red-900/10",
  expired: "text-amber-400 border-amber-900 bg-amber-900/10",
  unactivated: "text-neutral-500 border-neutral-700 bg-neutral-800/30",
};

const roleBadge: Record<string, string> = {
  admin: "text-red-400 border-red-900",
  officer: "text-amber-400 border-amber-900",
  user: "text-neutral-500 border-neutral-800",
};

const tierStyle: Record<string, string> = {
  facilities: "text-blue-400 border-blue-900",
  member: "text-green-400 border-green-900",
};

interface AdminMembersState {
  error: string;
  success: string;
  search: string;
  roleFilter: string;
  statusFilter: string;
  suspendTarget: Member | null;
  suspendDate: string;
  suspendLoading: boolean;
  deleteTarget: Member | null;
  deleteConfirm: string;
  deleteLoading: boolean;
  assignTarget: Member | null;
  availableKeys: AvailableKey[];
  selectedKeyId: string;
  assignLoading: boolean;
  keysLoading: boolean;
}

const initialAdminMembersState: AdminMembersState = {
  error: "",
  success: "",
  search: "",
  roleFilter: "all",
  statusFilter: "all",
  suspendTarget: null,
  suspendDate: "",
  suspendLoading: false,
  deleteTarget: null,
  deleteConfirm: "",
  deleteLoading: false,
  assignTarget: null,
  availableKeys: [],
  selectedKeyId: "",
  assignLoading: false,
  keysLoading: false,
};

interface MemberFiltersProps {
  inputClass: string;
  onRoleFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  roleFilter: string;
  search: string;
  statusFilter: string;
}

function MemberFilters({
  inputClass,
  onRoleFilterChange,
  onSearchChange,
  onStatusFilterChange,
  roleFilter,
  search,
  statusFilter,
}: MemberFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
        <input aria-label="Search by name or email"
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} pl-9 w-full`}
        />
      </div>
      <select value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)} className={inputClass}>
        <option value="all">All roles</option>
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className={inputClass}>
        {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
      </select>
    </div>
  );
}

interface MembersTableProps {
  currentUserId?: string;
  currentUserRole?: string | null;
  filtered: Member[];
  onAssignKey: (member: Member) => void;
  onDeleteRequest: (member: Member) => void;
  onResetTier: (member: Member) => void;
  onRoleChange: (id: string, role: string) => void;
  onSuspendRequest: (member: Member) => void;
  onUnsuspend: (member: Member) => void;
}

function MembersTable({
  currentUserId,
  currentUserRole,
  filtered,
  onAssignKey,
  onDeleteRequest,
  onResetTier,
  onRoleChange,
  onSuspendRequest,
  onUnsuspend,
}: MembersTableProps) {
  return (
    <div className="border border-neutral-800 overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-neutral-800 bg-white/[0.02]">
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Member</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Role</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Tier</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Status</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Expires</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((member) => (
            <MemberRow
              key={member.id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              member={member}
              onAssignKey={onAssignKey}
              onDeleteRequest={onDeleteRequest}
              onResetTier={onResetTier}
              onRoleChange={onRoleChange}
              onSuspendRequest={onSuspendRequest}
              onUnsuspend={onUnsuspend}
            />
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-xs text-neutral-600 text-center py-8">No members match your filters.</p>
      )}
    </div>
  );
}

interface MemberRowProps extends Omit<MembersTableProps, "filtered"> {
  member: Member;
}

function MemberRow({
  currentUserId,
  currentUserRole,
  member,
  onAssignKey,
  onDeleteRequest,
  onResetTier,
  onRoleChange,
  onSuspendRequest,
  onUnsuspend,
}: MemberRowProps) {
  const status = getStatus(member);
  const canEditMember = member.id !== currentUserId;
  const isStaffAccount = member.role === "admin" || member.role === "officer";

  return (
    <tr className="border-b border-neutral-800/50 hover:bg-white/[0.01] transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm text-neutral-200">{member.name}</p>
        <p className="text-[10px] text-neutral-600">{member.email}</p>
        {member.discordId && <p className="text-[9px] text-indigo-400/60 mt-0.5">Discord linked</p>}
      </td>
      <td className="px-4 py-3">
        <select
          value={member.role}
          disabled={
            member.id === currentUserId ||
            (currentUserRole === "officer" && (member.role === "admin" || member.role === "officer"))
          }
          onChange={(e) => onRoleChange(member.id, e.target.value)}
          className="bg-transparent border border-neutral-800 text-[10px] text-neutral-400 px-2 py-1 focus:outline-none focus:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ROLES.map((role) => (
            <option
              key={role}
              value={role}
              disabled={currentUserRole === "officer" && role === "admin"}
            >
              {role}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {member.tier ? (
          <span className={`text-[9px] tracking-wider uppercase px-2 py-0.5 border inline-block ${tierStyle[member.tier] || "text-neutral-500 border-neutral-800"}`}>
            {member.tier}
          </span>
        ) : (
          <span className="text-[10px] text-neutral-600">None</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-[9px] tracking-wider uppercase px-2 py-0.5 border inline-block ${statusStyle[status]}`}>
          {status}
        </span>
        {status === "suspended" && member.suspendedUntil && (
          <p className="text-[9px] text-neutral-600 mt-0.5">
            Until {new Date(member.suspendedUntil).toLocaleDateString()}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-[10px] text-neutral-500">
        {member.membershipExpiresAt
          ? new Date(member.membershipExpiresAt).toLocaleDateString()
          : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {canEditMember ? (
            isStaffAccount ? (
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Staff Account</span>
            ) : (
              <>
                <button type="button"
                  onClick={() => onAssignKey(member)}
                  className="text-[9px] tracking-wider uppercase text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  title="Assign Key"
                >
                  <Key size={12} /> Key
                </button>
                {(member.tier || member.membershipExpiresAt) && (
                  <button type="button"
                    onClick={() => onResetTier(member)}
                    className="text-[9px] tracking-wider uppercase text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                    title="Reset Tier & Expiry"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                )}
                {status === "suspended" ? (
                  <button type="button"
                    onClick={() => onUnsuspend(member)}
                    className="text-[9px] tracking-wider uppercase text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                    title="Unsuspend"
                  >
                    <ShieldOff size={12} /> Unsuspend
                  </button>
                ) : (
                  <button type="button"
                    onClick={() => onSuspendRequest(member)}
                    className="text-[9px] tracking-wider uppercase text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    title="Suspend"
                  >
                    <Shield size={12} /> Suspend
                  </button>
                )}
                <button type="button"
                  onClick={() => onDeleteRequest(member)}
                  className="text-[9px] tracking-wider uppercase text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )
          ) : (
            <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Current Session</span>
          )}
        </div>
      </td>
    </tr>
  );
}

interface SuspendMemberModalProps {
  inputClass: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDateChange: (value: string) => void;
  suspendDate: string;
  target: Member;
}

function SuspendMemberModal({ inputClass, loading, onClose, onConfirm, onDateChange, suspendDate, target }: SuspendMemberModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <button type="button" aria-label="Close suspend member dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 bg-neutral-950 border border-neutral-800 p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm tracking-wider text-neutral-200">Suspend Member</h3>
          <button type="button" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
        </div>
        <p className="text-xs text-neutral-400 mb-1">
          Suspending <span className="text-neutral-200">{target.name}</span>
        </p>
        <p className="text-[10px] text-neutral-600 mb-4">
          This user will not be able to log in or make API calls until the suspension expires.
        </p>
        <label htmlFor="AdminMembers-suspend-until" className="text-[10px] tracking-wider uppercase text-neutral-500 block mb-1">Suspend until</label>
        <input id="AdminMembers-suspend-until"
          type="date"
          value={suspendDate}
          onChange={(e) => onDateChange(e.target.value)}
          className={`${inputClass} w-full mb-4 text-white [color-scheme:dark]`}
        />
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={onConfirm}
            disabled={loading || !suspendDate}
            className="px-4 py-2 bg-amber-600 text-[10px] tracking-wider uppercase text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Suspending" : "Confirm Suspend"}
          </button>
          <button type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteMemberModalProps {
  confirmText: string;
  inputClass: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmTextChange: (value: string) => void;
  target: Member;
}

function DeleteMemberModal({ confirmText, inputClass, loading, onClose, onConfirm, onConfirmTextChange, target }: DeleteMemberModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <button type="button" aria-label="Close delete member dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 bg-neutral-950 border border-red-900/30 p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm tracking-wider text-red-400">Delete Member</h3>
          <button type="button" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
        </div>
        <p className="text-xs text-neutral-400 mb-1">
          Permanently delete <span className="text-red-400">{target.name}</span> ({target.email})
        </p>
        <p className="text-[10px] text-neutral-600 mb-4">
          This will remove their account, photos, sessions, and revoke any activation keys they used. This cannot be undone.
        </p>
        <label htmlFor="AdminMembers-type-delete-to-confirm" className="text-[10px] tracking-wider uppercase text-neutral-500 block mb-1">
          Type DELETE to confirm
        </label>
        <input id="AdminMembers-type-delete-to-confirm" aria-label="DELETE"
          type="text"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          placeholder="DELETE"
          className={`${inputClass} w-full mb-4`}
        />
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={onConfirm}
            disabled={loading || confirmText !== "DELETE"}
            className="px-4 py-2 bg-red-600 text-[10px] tracking-wider uppercase text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Deleting" : "Permanently Delete"}
          </button>
          <button type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface AssignKeyModalProps {
  assignLoading: boolean;
  availableKeys: AvailableKey[];
  inputClass: string;
  keysLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSelectedKeyChange: (value: string) => void;
  selectedKeyId: string;
  target: Member;
}

function AssignKeyModal({
  assignLoading,
  availableKeys,
  inputClass,
  keysLoading,
  onClose,
  onConfirm,
  onSelectedKeyChange,
  selectedKeyId,
  target,
}: AssignKeyModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <button type="button" aria-label="Close assign key dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 bg-neutral-950 border border-neutral-800 p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm tracking-wider text-neutral-200">Assign Key</h3>
          <button type="button" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Assign an activation key to <span className="text-neutral-200">{target.name}</span>
        </p>
        {keysLoading ? (
          <p className="text-xs text-neutral-500">Loading available keys</p>
        ) : availableKeys.length === 0 ? (
          <p className="text-xs text-neutral-500">No available keys. Generate one from the Activation Keys page first.</p>
        ) : (
          <>
            <label htmlFor="AdminMembers-select-key" className="text-[10px] tracking-wider uppercase text-neutral-500 block mb-1">Select Key</label>
            <select id="AdminMembers-select-key"
              value={selectedKeyId}
              onChange={(e) => onSelectedKeyChange(e.target.value)}
              className={`${inputClass} w-full mb-4`}
            >
              <option value="">Choose a key</option>
              {availableKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.key.slice(0, 4)}...{key.key.slice(-4)}, {key.tier}, expires {new Date(key.expiresAt).toLocaleDateString()}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={onConfirm}
                disabled={assignLoading || !selectedKeyId}
                className="px-4 py-2 bg-blue-600 text-[10px] tracking-wider uppercase text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {assignLoading ? "Assigning" : "Assign Key"}
              </button>
              <button type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminMembers() {
  const { data: members = [], error: membersError, isLoading: loading, mutate: mutateMembers } = useSWR<Member[]>("/api/admin/members", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const [state, dispatchState] = useReducer(keyedStateReducer<AdminMembersState>, initialAdminMembersState);
  const {
    error,
    success,
    search,
    roleFilter,
    statusFilter,
    suspendTarget,
    suspendDate,
    suspendLoading,
    deleteTarget,
    deleteConfirm,
    deleteLoading,
    assignTarget,
    availableKeys,
    selectedKeyId,
    assignLoading,
    keysLoading,
  } = state;
  const setError = createKeyedStateSetter(dispatchState, "error");
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setSearch = createKeyedStateSetter(dispatchState, "search");
  const setRoleFilter = createKeyedStateSetter(dispatchState, "roleFilter");
  const setStatusFilter = createKeyedStateSetter(dispatchState, "statusFilter");
  const setSuspendTarget = createKeyedStateSetter(dispatchState, "suspendTarget");
  const setSuspendDate = createKeyedStateSetter(dispatchState, "suspendDate");
  const setSuspendLoading = createKeyedStateSetter(dispatchState, "suspendLoading");
  const setDeleteTarget = createKeyedStateSetter(dispatchState, "deleteTarget");
  const setDeleteConfirm = createKeyedStateSetter(dispatchState, "deleteConfirm");
  const setDeleteLoading = createKeyedStateSetter(dispatchState, "deleteLoading");
  const setAssignTarget = createKeyedStateSetter(dispatchState, "assignTarget");
  const setAvailableKeys = createKeyedStateSetter(dispatchState, "availableKeys");
  const setSelectedKeyId = createKeyedStateSetter(dispatchState, "selectedKeyId");
  const setAssignLoading = createKeyedStateSetter(dispatchState, "assignLoading");
  const setKeysLoading = createKeyedStateSetter(dispatchState, "keysLoading");

  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id;
  const currentUserRole = (sessionData?.user as { role?: string | null } | undefined)?.role;

  const refreshMembers = () => {
    void mutateMembers().catch(() => setError("Failed to load members."));
  };

  const filtered = useMemo(() => {
    let list = members;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((m) => m.role === roleFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((m) => getStatus(m) === statusFilter);
    }
    return list;
  }, [members, search, roleFilter, statusFilter]);

  const updateRole = async (id: string, role: string) => {
    setError("");
    try {
      const res = await fetchApi(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        void mutateMembers(members.map((m) => (m.id === id ? { ...m, role } : m)), { revalidate: false });
      } else {
        setError(await readErrorMessage(res, "Failed to update role."));
      }
    } catch {
      setError("Unable to update member role.");
    }
  };

  const resetTier = async (m: Member) => {
    setError("");
    try {
      const res = await fetchApi(`/api/admin/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: null, membershipExpiresAt: null }),
      });
      if (res.ok) {
        void mutateMembers(members.map((x) =>
          x.id === m.id ? { ...x, tier: null, membershipExpiresAt: null } : x
        ), { revalidate: false });
        setSuccess(`Tier & expiry cleared for ${m.name}`);
        setTimeout(() => setSuccess(""), 4000);
        refreshMembers();
      } else {
        setError(await readErrorMessage(res, "Failed to reset tier."));
      }
    } catch {
      setError("Failed to reset tier.");
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget || !suspendDate) return;
    setSuspendLoading(true);
    setError("");
    try {
      const res = await fetchApi(`/api/admin/members/${suspendTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspendedUntil: new Date(suspendDate).toISOString() }),
      });
      if (res.ok) {
        void mutateMembers(members.map((m) =>
          m.id === suspendTarget.id ? { ...m, suspendedUntil: new Date(suspendDate).toISOString() } : m
        ), { revalidate: false });
        setSuccess(`${suspendTarget.name} suspended until ${new Date(suspendDate).toLocaleDateString()}`);
        setTimeout(() => setSuccess(""), 4000);
        setSuspendTarget(null);
        setSuspendDate("");
      } else {
        setError(await readErrorMessage(res, "Failed to suspend member."));
      }
    } catch {
      setError("Failed to suspend member.");
    }
    setSuspendLoading(false);
  };

  const handleUnsuspend = async (m: Member) => {
    setError("");
    try {
      const res = await fetchApi(`/api/admin/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspendedUntil: null }),
      });
      if (res.ok) {
        void mutateMembers(members.map((x) =>
          x.id === m.id ? { ...x, suspendedUntil: null } : x
        ), { revalidate: false });
        setSuccess(`${m.name} unsuspended.`);
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch {
      setError("Failed to unsuspend member.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    setError("");
    try {
      const res = await fetchApi(`/api/admin/members/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        void mutateMembers(members.filter((m) => m.id !== deleteTarget.id), { revalidate: false });
        setSuccess(`${deleteTarget.name} has been deleted.`);
        setTimeout(() => setSuccess(""), 4000);
        setDeleteTarget(null);
        setDeleteConfirm("");
      } else {
        setError(await readErrorMessage(res, "Failed to delete member."));
      }
    } catch {
      setError("Failed to delete member.");
    }
    setDeleteLoading(false);
  };

  const openAssignKey = async (m: Member) => {
    setAssignTarget(m);
    setSelectedKeyId("");
    setKeysLoading(true);
    try {
      const res = await fetchApi("/api/admin/keys");
      if (res.ok) {
        const allKeys = await readJson<AvailableKey[]>(res);
        // Filter to available (unused, not expired) keys
        setAvailableKeys(allKeys.filter((k) => !k.usedBy && new Date(k.expiresAt) > new Date()));
      }
    } catch { /* ignore */ }
    setKeysLoading(false);
  };

  const handleAssignKey = async () => {
    if (!assignTarget || !selectedKeyId) return;
    setAssignLoading(true);
    setError("");
    try {
      const res = await fetchApi("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: selectedKeyId, userId: assignTarget.id }),
      });
      if (res.ok) {
        setSuccess(`Key assigned to ${assignTarget.name}`);
        setTimeout(() => setSuccess(""), 4000);
        setAssignTarget(null);
        refreshMembers();
      } else {
        setError(await readErrorMessage(res, "Failed to assign key."));
      }
    } catch {
      setError("Failed to assign key.");
    }
    setAssignLoading(false);
  };

  const inputClass = "bg-transparent border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none transition-colors";
  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  if (loading) return <p className="text-xs text-neutral-500">Loading members</p>;

  return (
    <div className="space-y-4">
      {(error || membersError) && <p className="text-xs text-red-400">{error || "Failed to load members."}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}

      <MemberFilters
        inputClass={inputClass}
        onRoleFilterChange={setRoleFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        search={search}
        statusFilter={statusFilter}
      />

      <p className="text-[10px] text-neutral-600 tracking-wider">
        Showing {filtered.length} of {members.length} members
      </p>

      <MembersTable
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        filtered={filtered}
        onAssignKey={openAssignKey}
        onDeleteRequest={setDeleteTarget}
        onResetTier={resetTier}
        onRoleChange={updateRole}
        onSuspendRequest={setSuspendTarget}
        onUnsuspend={handleUnsuspend}
      />

      {suspendTarget && (
        <SuspendMemberModal
          inputClass={inputClass}
          loading={suspendLoading}
          onClose={() => setSuspendTarget(null)}
          onConfirm={handleSuspend}
          onDateChange={setSuspendDate}
          suspendDate={suspendDate}
          target={suspendTarget}
        />
      )}

      {deleteTarget && (
        <DeleteMemberModal
          confirmText={deleteConfirm}
          inputClass={inputClass}
          loading={deleteLoading}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
          onConfirmTextChange={setDeleteConfirm}
          target={deleteTarget}
        />
      )}

      {assignTarget && (
        <AssignKeyModal
          assignLoading={assignLoading}
          availableKeys={availableKeys}
          inputClass={inputClass}
          keysLoading={keysLoading}
          onClose={() => setAssignTarget(null)}
          onConfirm={handleAssignKey}
          onSelectedKeyChange={setSelectedKeyId}
          selectedKeyId={selectedKeyId}
          target={assignTarget}
        />
      )}
    </div>
  );
}
