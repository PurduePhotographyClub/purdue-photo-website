import { useDeferredValue, useReducer, useState } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  ADMIN_MEMBERS_PAGE_SIZE,
  buildAdminMembersUrl,
  normalizeAdminMembersPageForUrl,
  type AdminMember,
  type AdminMembersPage,
} from "@/lib/admin-members";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
  readJson
} from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";
import AdminMemberProfileDialog from "./AdminMemberProfileDialog";
import AdminMembersList from "./AdminMembersList";
import ServiceManagerAssignments from "./ServiceManagerAssignments";

type Member = AdminMember;

interface AvailableKey {
  id: string;
  key: string;
  tier: string;
  expiresAt: string;
  usedBy?: string | null;
}

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
  profileTarget: Member | null;
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
  profileTarget: null,
};

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
          <button type="button" aria-label="Close suspend member dialog" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
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
          <button type="button" aria-label="Close delete member dialog" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
        </div>
        <p className="text-xs text-neutral-400 mb-1">
          Permanently delete <span className="text-red-400">{target.name}</span> ({target.email})
        </p>
        <p className="text-[10px] text-neutral-600 mb-4">
          This will remove their account, photos, public profile, profile image, sessions, and revoke any activation keys they used. This cannot be undone.
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
          <button type="button" aria-label="Close assign key dialog" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
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

const EMPTY_ADMIN_MEMBERS: Member[] = [];
const ADMIN_MEMBERS_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  keepPreviousData: true,
};

async function fetchAdminMembersPage([url, search]: readonly [string, string]) {
  const data = await fetchJson<unknown>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search }),
  });
  return normalizeAdminMembersPageForUrl<Member>(data, url);
}

export default function AdminMembers() {
  const [page, setPage] = useState(1);
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
    profileTarget,
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
  const setProfileTarget = createKeyedStateSetter(dispatchState, "profileTarget");

  const deferredSearch = useDeferredValue(search);
  const membersUrl = buildAdminMembersUrl({
    page,
    perPage: ADMIN_MEMBERS_PAGE_SIZE,
    role: roleFilter,
    status: statusFilter,
  });
  const {
    data: membersPage,
    error: membersError,
    isLoading: loading,
    mutate: mutateMembers,
  } = useSWR<AdminMembersPage<Member>>(
    [membersUrl, deferredSearch] as const,
    fetchAdminMembersPage,
    ADMIN_MEMBERS_SWR_OPTIONS,
  );
  const members = membersPage?.members ?? EMPTY_ADMIN_MEMBERS;

  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id;
  const currentUserRole = (sessionData?.user as { role?: string | null } | undefined)?.role;

  const refreshMembers = async () => {
    try {
      const refreshedPage = await mutateMembers();
      if (refreshedPage && refreshedPage.meta.page !== page) {
        setPage(refreshedPage.meta.page);
      }
    } catch {
      setError("Failed to load members.");
    }
  };

  const updateRole = async (id: string, role: string) => {
    setError("");
    try {
      const res = await fetchApi(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        await refreshMembers();
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
        await refreshMembers();
        setSuccess(`Tier & expiry cleared for ${m.name}`);
        setTimeout(() => setSuccess(""), 4000);
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
        await refreshMembers();
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
        await refreshMembers();
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
        await refreshMembers();
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
        await refreshMembers();
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
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const changeRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };
  const changeStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  const changePage = (nextPage: number) => {
    if (!membersPage || nextPage < 1 || nextPage > membersPage.meta.totalPages) return;
    setPage(nextPage);
  };

  if (!membersPage && loading) return <p className="text-xs text-neutral-500">Loading members</p>;

  return (
    <div className="space-y-4">
      {(error || membersError) && <p className="text-xs text-red-400">{error || "Failed to load members."}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}

      <ServiceManagerAssignments />

      {membersPage && (
        <AdminMembersList
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          inputClass={inputClass}
          members={members}
          meta={membersPage.meta}
          onAssignKey={openAssignKey}
          onDeleteRequest={setDeleteTarget}
          onEditProfile={setProfileTarget}
          onPageChange={changePage}
          onResetTier={resetTier}
          onRoleChange={updateRole}
          onRoleFilterChange={changeRoleFilter}
          onSearchChange={changeSearch}
          onStatusFilterChange={changeStatusFilter}
          onSuspendRequest={setSuspendTarget}
          onUnsuspend={handleUnsuspend}
          roleFilter={roleFilter}
          search={search}
          statusFilter={statusFilter}
        />
      )}

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

      {profileTarget && (
        <AdminMemberProfileDialog
          memberId={profileTarget.id}
          memberName={profileTarget.name}
          onClose={() => setProfileTarget(null)}
        />
      )}
    </div>
  );
}
