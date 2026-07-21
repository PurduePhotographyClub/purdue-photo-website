import { useMemo, useState } from "react";
import useSWR from "swr";

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

interface ServiceManagerAssignmentsProps {
  members: readonly MemberOption[];
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

export default function ServiceManagerAssignments({ members }: ServiceManagerAssignmentsProps) {
  const [reconciliationWarnings, setReconciliationWarnings] = useState<
    Partial<Record<ServiceManagerScope, string>>
  >({});
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

  const linkedMembers = useMemo(
    () => members
      .filter((member): member is MemberOption & { discordId: string } => (
        Boolean(member.discordId) && !isCurrentlySuspended(member.suspendedUntil)
      ))
      .toSorted((first, second) => first.name.localeCompare(second.name)),
    [members],
  );

  const assignments = data?.assignments ?? EMPTY_ASSIGNMENTS;

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

      {error && <p role="alert" className="mb-4 text-xs text-red-400">Failed to load manager assignments.</p>}
      {isLoading ? (
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
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const selectedManagers = selectedUserIds.filter(Boolean);
  const hasDuplicate = new Set(selectedManagers).size !== selectedManagers.length;
  const hasChanged = selectedManagers.join("|") !== assignedUserIds.join("|");

  const updatePosition = (position: number, userId: string) => {
    setSelectedUserIds((current) => current.map((value, index) => index === position ? userId : value));
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
                {linkedMembers.map((member) => (
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
