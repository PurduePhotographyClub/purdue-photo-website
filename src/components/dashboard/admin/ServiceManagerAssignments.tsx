import { useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";

import {
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
  readJson,
} from "@/lib/http";
import {
  SERVICE_MANAGER_SCOPES,
  type ServiceManagerScope,
} from "@/lib/service-manager-access";

interface MemberOption {
  discordId: string | null;
  email: string;
  id: string;
  name: string;
  suspendedUntil: string | null;
}

interface ServiceManager {
  discordId: string;
  email: string;
  name: string;
  position: number;
  userId: string;
}

type ServiceManagerAssignments = Record<ServiceManagerScope, ServiceManager[]>;

interface ServiceManagerAssignmentsResponse {
  assignments: ServiceManagerAssignments;
  reconciliation?: {
    warning?: string | null;
  };
}

const SCOPE_CAPS: Record<ServiceManagerScope, number> = {
  studio: 1,
  darkroom: 2,
  equipment: 1,
};

const SCOPE_LABELS: Record<ServiceManagerScope, string> = {
  studio: "Studio",
  darkroom: "Darkroom",
  equipment: "Equipment",
};

const EMPTY_ASSIGNMENTS: ServiceManagerAssignments = {
  studio: [],
  darkroom: [],
  equipment: [],
};

const MANAGER_CANDIDATE_PAGE_SIZE = 50;

async function fetchManagerCandidates([url, search]: readonly [string, string]) {
  const data = await fetchJson<unknown>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search }),
  });
  return normalizeAdminMembersPageForUrl<AdminMember>(
    data,
    url,
    MANAGER_CANDIDATE_PAGE_SIZE,
  );
}

export default function ServiceManagerAssignments() {
  const [candidateSearch, setCandidateSearch] = useState("");
  const [reconciliationWarnings, setReconciliationWarnings] = useState<
    Partial<Record<ServiceManagerScope, string>>
  >({});
  const deferredCandidateSearch = useDeferredValue(candidateSearch);
  const candidateUrl = buildAdminMembersUrl({
    discordLinked: true,
    excludeSuspended: true,
    page: 1,
    perPage: MANAGER_CANDIDATE_PAGE_SIZE,
  });
  const {
    data: candidatePage,
    error: candidateError,
    isLoading: candidatesLoading,
  } = useSWR<AdminMembersPage<AdminMember>>(
    [candidateUrl, deferredCandidateSearch] as const,
    fetchManagerCandidates,
    PUBLIC_API_SWR_OPTIONS,
  );
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ServiceManagerAssignmentsResponse>(
    "/api/admin/service-managers",
    fetchJson,
    PUBLIC_API_SWR_OPTIONS,
  );

  const assignments = data?.assignments ?? EMPTY_ASSIGNMENTS;
  const linkedMembers = useMemo(() => {
    const byId = new Map<string, MemberOption & { discordId: string }>();
    for (const member of candidatePage?.members ?? []) {
      if (isLinkedMemberOption(member)) byId.set(member.id, member);
    }
    for (const manager of Object.values(assignments).flat()) {
      byId.set(manager.userId, {
        discordId: manager.discordId,
        email: manager.email,
        id: manager.userId,
        name: manager.name,
        suspendedUntil: null,
      });
    }
    return Array.from(byId.values()).toSorted((first, second) => first.name.localeCompare(second.name));
  }, [assignments, candidatePage?.members]);

  const saveScope = async (scope: ServiceManagerScope, userIds: string[]) => {
    const response = await fetchApi("/api/admin/service-managers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, userIds }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, `Failed to update ${SCOPE_LABELS[scope]} managers.`));
    }

    const nextAssignments = await readJson<ServiceManagerAssignmentsResponse>(response);
    const reconciliationWarning = nextAssignments.reconciliation?.warning?.trim();
    setReconciliationWarnings((current) => ({
      ...current,
      [scope]: reconciliationWarning || undefined,
    }));
    await mutate(nextAssignments, { revalidate: false });
  };

  return (
    <section aria-labelledby="service-manager-assignments-heading" className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5">
      <div className="mb-4">
        <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">Scoped access</p>
        <h2 id="service-manager-assignments-heading" className="mt-1 text-sm tracking-wider text-neutral-200">
          Request managers
        </h2>
        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-neutral-500">
          Assign linked Discord members to manage private request threads and the matching admin page.
          Studio and equipment allow one manager; darkroom allows two.
        </p>
      </div>

      <div className="mb-4 max-w-md">
        <label htmlFor="service-manager-member-search" className="mb-1 block text-[9px] uppercase tracking-wider text-neutral-500">
          Find linked member
        </label>
        <input
          id="service-manager-member-search"
          type="search"
          maxLength={100}
          value={candidateSearch}
          onChange={(event) => setCandidateSearch(event.target.value)}
          placeholder="Search by name or email"
          className="min-h-11 w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-neutral-500"
        />
        {candidatePage?.meta.hasNextPage && (
          <p className="mt-1 text-[10px] text-amber-300">More linked members match. Refine the search to find a specific person.</p>
        )}
      </div>

      {(error || candidateError) && <p role="alert" className="mb-4 text-xs text-red-400">Failed to load manager assignments.</p>}
      {isLoading || candidatesLoading ? (
        <p className="text-xs text-neutral-500">Loading manager assignments</p>
      ) : linkedMembers.length === 0 ? (
        <p className="text-xs text-amber-300">No members with linked Discord accounts are available.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {SERVICE_MANAGER_SCOPES.map((scope) => {
            const assignedUserIds = assignments[scope]
              .toSorted((first, second) => first.position - second.position)
              .map((manager) => manager.userId);
            return (
              <ServiceManagerScopeEditor
                key={`${scope}:${assignedUserIds.join(",")}`}
                assignedUserIds={assignedUserIds}
                linkedMembers={linkedMembers}
                maxManagers={SCOPE_CAPS[scope]}
                onSave={saveScope}
                reconciliationWarning={reconciliationWarnings[scope]}
                scope={scope}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

interface ServiceManagerScopeEditorProps {
  assignedUserIds: readonly string[];
  linkedMembers: readonly (MemberOption & { discordId: string })[];
  maxManagers: number;
  onSave: (scope: ServiceManagerScope, userIds: string[]) => Promise<void>;
  reconciliationWarning?: string;
  scope: ServiceManagerScope;
}

function ServiceManagerScopeEditor({
  assignedUserIds,
  linkedMembers,
  maxManagers,
  onSave,
  reconciliationWarning,
  scope,
}: ServiceManagerScopeEditorProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() =>
    Array.from({ length: maxManagers }, (_, index) => assignedUserIds[index] ?? ""),
  );
  const [retainedMembers, setRetainedMembers] = useState<readonly (MemberOption & { discordId: string })[]>(() => {
    const assignedIdSet = new Set(assignedUserIds);
    return linkedMembers.filter((member) => assignedIdSet.has(member.id));
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const selectedManagers = selectedUserIds.filter(Boolean);
  const hasDuplicate = new Set(selectedManagers).size !== selectedManagers.length;
  const hasChanged = selectedManagers.join("|") !== assignedUserIds.join("|");
  const availableMembers = useMemo(() => {
    const byId = new Map(linkedMembers.map((member) => [member.id, member]));
    const selectedIdSet = new Set(selectedUserIds);
    for (const member of retainedMembers) {
      if (selectedIdSet.has(member.id)) byId.set(member.id, member);
    }
    return Array.from(byId.values()).toSorted((first, second) => first.name.localeCompare(second.name));
  }, [linkedMembers, retainedMembers, selectedUserIds]);

  const updatePosition = (position: number, userId: string) => {
    const nextSelectedUserIds = selectedUserIds.map((value, index) => index === position ? userId : value);
    const selectedMember = linkedMembers.find((member) => member.id === userId);
    setSelectedUserIds(nextSelectedUserIds);
    setRetainedMembers((current) => {
      const byId = new Map(current.map((member) => [member.id, member]));
      if (selectedMember) byId.set(selectedMember.id, selectedMember);
      return nextSelectedUserIds.flatMap((selectedId) => {
        const member = byId.get(selectedId);
        return member ? [member] : [];
      });
    });
    setStatus("idle");
    setError("");
  };

  const save = async () => {
    if (hasDuplicate) return;
    setStatus("saving");
    setError("");
    try {
      await onSave(scope, selectedManagers);
      setStatus("saved");
    } catch (cause) {
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : `Failed to update ${SCOPE_LABELS[scope]} managers.`);
    }
  };

  return (
    <fieldset className="min-w-0 border border-neutral-800 p-3">
      <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">
        {SCOPE_LABELS[scope]}
      </legend>
      <div className="space-y-3">
        {selectedUserIds.map((selectedUserId, position) => {
          const inputId = `service-manager-${scope}-${position + 1}`;
          return (
            <div key={inputId}>
              <label htmlFor={inputId} className="mb-1 block text-[9px] uppercase tracking-wider text-neutral-500">
                Manager {position + 1}
              </label>
              <select
                id={inputId}
                value={selectedUserId}
                onChange={(event) => updatePosition(position, event.target.value)}
                className="min-h-11 w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 outline-none transition-colors focus:border-neutral-500"
              >
                <option value="">Not assigned</option>
                {availableMembers.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                    disabled={selectedUserIds.some((value, index) => index !== position && value === member.id)}
                  >
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {hasDuplicate && <p role="alert" className="text-[10px] text-red-400">Choose a different member for each position.</p>}
        {error && <p role="alert" className="text-[10px] leading-relaxed text-red-400">{error}</p>}
        {!hasChanged && reconciliationWarning && (
          <p role="status" className="text-[10px] leading-relaxed text-amber-300">
            {reconciliationWarning}
          </p>
        )}
        {status === "saved" && !reconciliationWarning && (
          <p role="status" className="text-[10px] text-green-400">Assignments saved.</p>
        )}

        <button
          type="button"
          onClick={() => void save()}
          disabled={!hasChanged || hasDuplicate || status === "saving"}
          className="flex min-h-11 w-full items-center justify-center border border-neutral-700 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "saving" ? "Saving" : `Save ${SCOPE_LABELS[scope]}`}
        </button>
      </div>
    </fieldset>
  );
}

function isCurrentlySuspended(suspendedUntil: string | null) {
  if (!suspendedUntil) return false;
  const suspendedUntilTimestamp = Date.parse(suspendedUntil);
  return Number.isFinite(suspendedUntilTimestamp) && suspendedUntilTimestamp > Date.now();
}

function isLinkedMemberOption(
  member: MemberOption,
): member is MemberOption & { discordId: string } {
  return typeof member.discordId === "string" &&
    /^\d{17,20}$/.test(member.discordId) &&
    !isCurrentlySuspended(member.suspendedUntil);
}
