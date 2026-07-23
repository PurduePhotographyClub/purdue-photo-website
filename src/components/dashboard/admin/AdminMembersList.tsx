import { Key, RotateCcw, Search, Shield, ShieldOff, Trash2 } from "lucide-react";

import type { AdminMember, AdminMembersPageMeta } from "@/lib/admin-members";

const ROLES = ["user", "officer", "admin"] as const;
const STATUSES = ["all", "active", "suspended", "expired", "unactivated"] as const;

const statusStyle: Record<string, string> = {
  active: "text-green-400 border-green-900 bg-green-900/10",
  suspended: "text-red-400 border-red-900 bg-red-900/10",
  expired: "text-amber-400 border-amber-900 bg-amber-900/10",
  unactivated: "text-neutral-500 border-neutral-700 bg-neutral-800/30",
};

const tierStyle: Record<string, string> = {
  facilities: "text-blue-400 border-blue-900",
  member: "text-green-400 border-green-900",
};

interface AdminMembersListProps {
  currentUserId?: string;
  currentUserRole?: string | null;
  inputClass: string;
  members: AdminMember[];
  meta: AdminMembersPageMeta;
  onAssignKey: (member: AdminMember) => void;
  onDeleteRequest: (member: AdminMember) => void;
  onEditProfile: (member: AdminMember) => void;
  onPageChange: (page: number) => void;
  onResetTier: (member: AdminMember) => void;
  onRoleChange: (id: string, role: string) => void;
  onRoleFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSuspendRequest: (member: AdminMember) => void;
  onUnsuspend: (member: AdminMember) => void;
  roleFilter: string;
  search: string;
  statusFilter: string;
}

function getStatus(member: AdminMember): string {
  if (member.suspendedUntil && new Date(member.suspendedUntil) > new Date()) return "suspended";
  if (member.membershipExpiresAt && new Date(member.membershipExpiresAt) < new Date()) return "expired";
  if (!member.activatedAt && member.role !== "admin" && member.role !== "officer") return "unactivated";
  return "active";
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

export default function AdminMembersList({
  currentUserId,
  currentUserRole,
  inputClass,
  members,
  meta,
  onAssignKey,
  onDeleteRequest,
  onEditProfile,
  onPageChange,
  onResetTier,
  onRoleChange,
  onRoleFilterChange,
  onSearchChange,
  onStatusFilterChange,
  onSuspendRequest,
  onUnsuspend,
  roleFilter,
  search,
  statusFilter,
}: AdminMembersListProps) {
  const pageNumbers = getVisiblePageNumbers(meta.page, meta.totalPages);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
          <input
            aria-label="Search by name or email"
            type="search"
            maxLength={100}
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className={`${inputClass} w-full pl-9`}
          />
        </div>
        <select
          aria-label="Filter members by role"
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value)}
          className={inputClass}
        >
          <option value="all">All roles</option>
          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <select
          aria-label="Filter members by status"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className={inputClass}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status}
            </option>
          ))}
        </select>
      </div>

      <p className="text-[10px] tracking-wider text-neutral-600">
        Showing {members.length} on this page · {meta.total} matching member{meta.total === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-800 bg-white/[0.02]">
              <th className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-neutral-500">Member</th>
              <th className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-neutral-500">Role</th>
              <th className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-neutral-500">Tier</th>
              <th className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-neutral-500">Status</th>
              <th className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-neutral-500">Expires</th>
              <th className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                member={member}
                onAssignKey={onAssignKey}
                onDeleteRequest={onDeleteRequest}
                onEditProfile={onEditProfile}
                onResetTier={onResetTier}
                onRoleChange={onRoleChange}
                onSuspendRequest={onSuspendRequest}
                onUnsuspend={onUnsuspend}
              />
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="py-8 text-center text-xs text-neutral-600">No members match your filters.</p>
        )}
      </div>

      {meta.totalPages > 1 && (
        <nav aria-label="Member list pagination" className="flex flex-wrap items-center justify-center gap-2">
          <p role="status" aria-live="polite" className="w-full pb-1 text-center text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            Page {meta.page} of {meta.totalPages}
          </p>
          <button
            type="button"
            disabled={!meta.hasPreviousPage}
            onClick={() => onPageChange(meta.page - 1)}
            className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              aria-label={`Go to member list page ${pageNumber}`}
              aria-current={pageNumber === meta.page ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
              className={`min-h-11 min-w-11 border px-3 text-xs ${pageNumber === meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"}`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={!meta.hasNextPage}
            onClick={() => onPageChange(meta.page + 1)}
            className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}

interface MemberRowProps {
  currentUserId?: string;
  currentUserRole?: string | null;
  member: AdminMember;
  onAssignKey: (member: AdminMember) => void;
  onDeleteRequest: (member: AdminMember) => void;
  onEditProfile: (member: AdminMember) => void;
  onResetTier: (member: AdminMember) => void;
  onRoleChange: (id: string, role: string) => void;
  onSuspendRequest: (member: AdminMember) => void;
  onUnsuspend: (member: AdminMember) => void;
}

function MemberRow({
  currentUserId,
  currentUserRole,
  member,
  onAssignKey,
  onDeleteRequest,
  onEditProfile,
  onResetTier,
  onRoleChange,
  onSuspendRequest,
  onUnsuspend,
}: MemberRowProps) {
  const status = getStatus(member);
  const canEditMember = member.id !== currentUserId;
  const isStaffAccount = member.role === "admin" || member.role === "officer";
  const canEditProfile = canEditMember &&
    member.profileEnabled &&
    !!member.profileUsername &&
    (currentUserRole === "admin" || !isStaffAccount);

  return (
    <tr className="border-b border-neutral-800/50 transition-colors hover:bg-white/[0.01]">
      <td className="px-4 py-3">
        <p className="text-sm text-neutral-200">{member.name}</p>
        <p className="text-[10px] text-neutral-600">{member.email}</p>
        {member.discordId && <p className="mt-0.5 text-[9px] text-indigo-400/60">Discord linked</p>}
        {member.profileEnabled && member.profileUsername && (
          <p className="mt-0.5 text-[9px] text-neutral-500">Profile /{member.profileUsername}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <select
          aria-label={`Role for ${member.name}`}
          value={member.role}
          disabled={
            member.id === currentUserId ||
            (currentUserRole === "officer" && (member.role === "admin" || member.role === "officer"))
          }
          onChange={(event) => onRoleChange(member.id, event.target.value)}
          className="border border-neutral-800 bg-transparent px-2 py-1 text-[10px] text-neutral-400 focus:border-neutral-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ROLES.map((role) => (
            <option key={role} value={role} disabled={currentUserRole === "officer" && role === "admin"}>
              {role}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {member.tier ? (
          <span className={`inline-block border px-2 py-0.5 text-[9px] uppercase tracking-wider ${tierStyle[member.tier] || "border-neutral-800 text-neutral-500"}`}>
            {member.tier}
          </span>
        ) : <span className="text-[10px] text-neutral-600">None</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusStyle[status]}`}>
          {status}
        </span>
        {status === "suspended" && member.suspendedUntil && (
          <p className="mt-0.5 text-[9px] text-neutral-600">Until {new Date(member.suspendedUntil).toLocaleDateString()}</p>
        )}
      </td>
      <td className="px-4 py-3 text-[10px] text-neutral-500">
        {member.membershipExpiresAt ? new Date(member.membershipExpiresAt).toLocaleDateString() : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {canEditProfile && (
            <button type="button" onClick={() => onEditProfile(member)} className="flex min-h-11 items-center gap-1 text-[9px] uppercase tracking-wider text-cyan-400 transition-colors hover:text-cyan-300">
              Edit profile
            </button>
          )}
          {canEditMember ? isStaffAccount ? (
            <span className="text-[9px] uppercase tracking-wider text-neutral-600">Staff Account</span>
          ) : (
            <>
              <button type="button" onClick={() => onAssignKey(member)} className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-blue-400 transition-colors hover:text-blue-300" title="Assign Key">
                <Key size={12} /> Key
              </button>
              {(member.tier || member.membershipExpiresAt) && (
                <button type="button" onClick={() => onResetTier(member)} className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-purple-400 transition-colors hover:text-purple-300" title="Reset Tier & Expiry">
                  <RotateCcw size={12} /> Reset
                </button>
              )}
              {status === "suspended" ? (
                <button type="button" onClick={() => onUnsuspend(member)} className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-green-400 transition-colors hover:text-green-300" title="Unsuspend">
                  <ShieldOff size={12} /> Unsuspend
                </button>
              ) : (
                <button type="button" onClick={() => onSuspendRequest(member)} className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-amber-500 transition-colors hover:text-amber-400" title="Suspend">
                  <Shield size={12} /> Suspend
                </button>
              )}
              <button type="button" onClick={() => onDeleteRequest(member)} aria-label={`Delete ${member.name}`} className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-red-500 transition-colors hover:text-red-400" title="Delete">
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <span className="text-[9px] uppercase tracking-wider text-neutral-600">Current Session</span>
          )}
        </div>
      </td>
    </tr>
  );
}
