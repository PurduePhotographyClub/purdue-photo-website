import { useMemo, useReducer } from "react";
import useSWR from "swr";
import { Search, Eye, EyeOff, Trash2, X, Copy, Check } from "lucide-react";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
  readJson
} from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

interface Key {
  id: string;
  key: string;
  tier: string;
  expiresAt: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
  createdByDiscordId: string;
  assignedTo: string | null;
  usedByName: string | null;
  usedByEmail: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
}

interface GenerateKeyResponse {
  key: string;
}

type KeyStatus = "available" | "used" | "expired";

function getKeyStatus(k: Key): KeyStatus {
  if (k.usedBy) return "used";
  if (new Date(k.expiresAt) < new Date()) return "expired";
  return "available";
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch { return iso; }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

const statusStyle: Record<KeyStatus, string> = {
  available: "text-green-400 border-green-900 bg-green-900/10",
  used: "text-blue-400 border-blue-900 bg-blue-900/10",
  expired: "text-red-400 border-red-900 bg-red-900/10",
};

const roleStyle: Record<string, string> = {
  member: "text-green-400 border-green-900",
  facilities: "text-blue-400 border-blue-900",
};

function maskKey(k: string) {
  const parts = k.split("-");
  if (parts.length === 4) return `${parts[0]}-****-****-${parts[3]}`;
  return k.slice(0, 4) + "****" + k.slice(-4);
}

interface AdminKeysState {
  generating: boolean;
  tier: "member" | "facilities";
  expiresAt: string;
  newKey: string | null;
  error: string;
  success: string;
  search: string;
  statusFilter: "all" | KeyStatus;
  roleFilter: string;
  showKeys: boolean;
  deleteTarget: Key | null;
  deleteLoading: boolean;
  copiedId: string | null;
}

const initialAdminKeysState: AdminKeysState = {
  generating: false,
  tier: "member",
  expiresAt: "",
  newKey: null,
  error: "",
  success: "",
  search: "",
  statusFilter: "all",
  roleFilter: "all",
  showKeys: false,
  deleteTarget: null,
  deleteLoading: false,
  copiedId: null,
};

interface AdminKeyStatsProps {
  stats: Record<KeyStatus, number>;
}

function AdminKeyStats({ stats }: AdminKeyStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="bg-white/[0.02] border border-neutral-800 p-4 text-center">
        <p className="text-lg text-green-400 font-light">{stats.available}</p>
        <p className="text-[9px] tracking-wider uppercase text-neutral-600">Available</p>
      </div>
      <div className="bg-white/[0.02] border border-neutral-800 p-4 text-center">
        <p className="text-lg text-blue-400 font-light">{stats.used}</p>
        <p className="text-[9px] tracking-wider uppercase text-neutral-600">Used</p>
      </div>
      <div className="bg-white/[0.02] border border-neutral-800 p-4 text-center">
        <p className="text-lg text-red-400 font-light">{stats.expired}</p>
        <p className="text-[9px] tracking-wider uppercase text-neutral-600">Expired</p>
      </div>
    </div>
  );
}

interface GenerateKeyPanelProps {
  expiresAt: string;
  generating: boolean;
  inputClass: string;
  newKey: string | null;
  onExpiresAtChange: (value: string) => void;
  onGenerate: () => void;
  onTierChange: (value: "member" | "facilities") => void;
  tier: "member" | "facilities";
}

function GenerateKeyPanel({
  expiresAt,
  generating,
  inputClass,
  newKey,
  onExpiresAtChange,
  onGenerate,
  onTierChange,
  tier,
}: GenerateKeyPanelProps) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-5 space-y-3">
      <h3 className="text-xs tracking-wider uppercase text-neutral-400">Generate Key</h3>
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label htmlFor="AdminKeys-tier" className="text-[10px] text-neutral-600 block mb-1">Tier</label>
          <select id="AdminKeys-tier" value={tier} onChange={(e) => onTierChange(e.target.value as "member" | "facilities")} className={inputClass}>
            <option value="member">Member</option>
            <option value="facilities">Facilities</option>
          </select>
        </div>
        <div>
          <label htmlFor="AdminKeys-expires" className="text-[10px] text-neutral-600 block mb-1">Expires</label>
          <input id="AdminKeys-expires" type="datetime-local" value={expiresAt} onChange={(e) => onExpiresAtChange(e.target.value)} className={inputClass} />
        </div>
        <button type="button"
          onClick={onGenerate}
          disabled={generating || !expiresAt}
          className="px-4 py-2 bg-white text-black text-[10px] tracking-[0.1em] uppercase hover:bg-neutral-200 disabled:opacity-30 transition-colors"
        >
          Generate
        </button>
      </div>
      {newKey && (
        <div className="bg-neutral-900 border border-neutral-700 p-3 mt-2">
          <p className="text-[10px] text-neutral-500 mb-1">New key (copy now):</p>
          <code className="text-sm text-green-400 font-mono select-all">{newKey}</code>
        </div>
      )}
    </div>
  );
}

interface AdminKeyFiltersProps {
  inputClass: string;
  onRoleFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onShowKeysToggle: () => void;
  onStatusFilterChange: (value: "all" | KeyStatus) => void;
  roleFilter: string;
  search: string;
  showKeys: boolean;
  statusFilter: "all" | KeyStatus;
}

function AdminKeyFilters({
  inputClass,
  onRoleFilterChange,
  onSearchChange,
  onShowKeysToggle,
  onStatusFilterChange,
  roleFilter,
  search,
  showKeys,
  statusFilter,
}: AdminKeyFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
        <input aria-label="Search keys, names, emails"
          type="text"
          placeholder="Search keys, names, emails"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} pl-9 w-full`}
        />
      </div>
      <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value as "all" | KeyStatus)} className={inputClass}>
        <option value="all">All statuses</option>
        <option value="available">Available</option>
        <option value="used">Used</option>
        <option value="expired">Expired</option>
      </select>
      <select value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)} className={inputClass}>
        <option value="all">All tiers</option>
        <option value="member">Member</option>
        <option value="facilities">Facilities</option>
      </select>
      <button type="button"
        onClick={onShowKeysToggle}
        className="flex items-center gap-1.5 px-3 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors"
      >
        {showKeys ? <EyeOff size={12} /> : <Eye size={12} />}
        {showKeys ? "Hide Keys" : "Show Keys"}
      </button>
    </div>
  );
}

interface AdminKeysTableProps {
  copiedId: string | null;
  filtered: Key[];
  onCopy: (key: Key) => void;
  onDelete: (key: Key) => void;
  showKeys: boolean;
}

function AdminKeysTable({ copiedId, filtered, onCopy, onDelete, showKeys }: AdminKeysTableProps) {
  return (
    <div className="border border-neutral-800 overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-neutral-800 bg-white/[0.02]">
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Key</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Tier</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Status</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Assigned / Used By</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Expires</th>
            <th className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-neutral-500 font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((k) => {
            const status = getKeyStatus(k);
            return (
              <tr key={k.id} className="border-b border-neutral-800/50 hover:bg-white/[0.01] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-neutral-300 font-mono">
                      {showKeys ? k.key : maskKey(k.key)}
                    </code>
                    <button type="button"
                      onClick={() => onCopy(k)}
                      className="text-neutral-600 hover:text-neutral-400 transition-colors"
                      title="Copy key"
                    >
                      {copiedId === k.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-[9px] text-neutral-700 mt-0.5">
                    Created {formatDate(k.createdAt)}
                    {k.createdByDiscordId !== "admin-manual" && ` · via ${k.createdByDiscordId}`}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] tracking-wider uppercase px-2 py-0.5 border ${roleStyle[k.tier] || "text-neutral-400 border-neutral-700"}`}>
                    {k.tier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] tracking-wider uppercase px-2 py-0.5 border inline-block ${statusStyle[status]}`}>
                    {status}
                  </span>
                  {k.usedAt && (
                    <p className="text-[9px] text-neutral-600 mt-0.5">
                      {formatDateTime(k.usedAt)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {k.usedByName ? (
                    <div>
                      <p className="text-xs text-neutral-300">{k.usedByName}</p>
                      <p className="text-[9px] text-neutral-600">{k.usedByEmail}</p>
                      <p className="text-[9px] text-blue-400/60">Used</p>
                    </div>
                  ) : k.assignedToName ? (
                    <div>
                      <p className="text-xs text-neutral-300">{k.assignedToName}</p>
                      <p className="text-[9px] text-neutral-600">{k.assignedToEmail}</p>
                      <p className="text-[9px] text-amber-400/60">Assigned</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-700">None</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-[10px] text-neutral-500">{formatDateTime(k.expiresAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <button type="button"
                    onClick={() => onDelete(k)}
                    className="text-neutral-600 hover:text-red-400 transition-colors"
                    title="Delete key"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-xs text-neutral-600 text-center py-8">No keys match your filters.</p>
      )}
    </div>
  );
}

interface DeleteKeyModalProps {
  deleteLoading: boolean;
  onClose: () => void;
  onDelete: () => void;
  showKeys: boolean;
  target: Key;
}

function DeleteKeyModal({ deleteLoading, onClose, onDelete, showKeys, target }: DeleteKeyModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <button type="button" aria-label="Close delete key dialog" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 bg-neutral-950 border border-red-900/30 p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm tracking-wider text-red-400">Delete Key</h3>
          <button type="button" onClick={onClose} className="text-neutral-600 hover:text-neutral-400"><X size={16} /></button>
        </div>
        <p className="text-xs text-neutral-400 mb-1">
          Delete key <code className="text-neutral-300 font-mono">{showKeys ? target.key : maskKey(target.key)}</code>?
        </p>
        {target.usedByName && (
          <p className="text-[10px] text-amber-400 mb-2">
            This key was used by {target.usedByName}. Their role will not be affected.
          </p>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button type="button"
            onClick={onDelete}
            disabled={deleteLoading}
            className="px-4 py-2 bg-red-600 text-[10px] tracking-wider uppercase text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteLoading ? "Deleting" : "Delete Key"}
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

export default function AdminKeys() {
  const { data: keys = [], error: keysError, isLoading: loading, mutate: mutateKeys } = useSWR<Key[]>("/api/admin/keys", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const [state, dispatchState] = useReducer(keyedStateReducer<AdminKeysState>, initialAdminKeysState);
  const {
    generating,
    tier,
    expiresAt,
    newKey,
    error,
    success,
    search,
    statusFilter,
    roleFilter,
    showKeys,
    deleteTarget,
    deleteLoading,
    copiedId,
  } = state;
  const setGenerating = createKeyedStateSetter(dispatchState, "generating");
  const setTier = createKeyedStateSetter(dispatchState, "tier");
  const setExpiresAt = createKeyedStateSetter(dispatchState, "expiresAt");
  const setNewKey = createKeyedStateSetter(dispatchState, "newKey");
  const setError = createKeyedStateSetter(dispatchState, "error");
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setSearch = createKeyedStateSetter(dispatchState, "search");
  const setStatusFilter = createKeyedStateSetter(dispatchState, "statusFilter");
  const setRoleFilter = createKeyedStateSetter(dispatchState, "roleFilter");
  const setShowKeys = createKeyedStateSetter(dispatchState, "showKeys");
  const setDeleteTarget = createKeyedStateSetter(dispatchState, "deleteTarget");
  const setDeleteLoading = createKeyedStateSetter(dispatchState, "deleteLoading");
  const setCopiedId = createKeyedStateSetter(dispatchState, "copiedId");

  const inputClass = "bg-transparent border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none transition-colors [color-scheme:dark]";

  const filtered = useMemo(() => {
    let list = keys;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((k) =>
        k.key.toLowerCase().includes(q) ||
        k.usedByName?.toLowerCase().includes(q) ||
        k.usedByEmail?.toLowerCase().includes(q) ||
        k.assignedToName?.toLowerCase().includes(q) ||
        k.assignedToEmail?.toLowerCase().includes(q) ||
        k.createdByDiscordId.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((k) => getKeyStatus(k) === statusFilter);
    }
    if (roleFilter !== "all") {
      list = list.filter((k) => k.tier === roleFilter);
    }
    return list;
  }, [keys, search, statusFilter, roleFilter]);

  const stats = useMemo(() => {
    const s = { available: 0, used: 0, expired: 0 };
    keys.forEach((k) => { s[getKeyStatus(k)]++; });
    return s;
  }, [keys]);

  const generateKey = async () => {
    if (!expiresAt) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetchApi("/api/keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, expiresAt, discordId: "admin-manual" }),
      });
      if (res.ok) {
        const data = await readJson<GenerateKeyResponse>(res);
        setNewKey(data.key);
        void mutateKeys();
      } else {
        setError(await readErrorMessage(res, "Failed to generate key."));
      }
    } catch {
      setError("Unable to generate key.");
    }
    setGenerating(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetchApi("/api/admin/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        void mutateKeys(keys.filter((k) => k.id !== deleteTarget.id), { revalidate: false });
        setSuccess("Key deleted.");
        setTimeout(() => setSuccess(""), 3000);
        setDeleteTarget(null);
      }
    } catch {
      setError("Failed to delete key.");
    }
    setDeleteLoading(false);
  };

  const copyKey = (k: Key) => {
    navigator.clipboard.writeText(k.key);
    setCopiedId(k.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <p className="text-xs text-neutral-500">Loading keys</p>;

  return (
    <div className="space-y-6">
      {(error || keysError) && <p className="text-xs text-red-400">{error || "Failed to load keys."}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}

      <AdminKeyStats stats={stats} />

      <GenerateKeyPanel
        expiresAt={expiresAt}
        generating={generating}
        inputClass={inputClass}
        newKey={newKey}
        onExpiresAtChange={setExpiresAt}
        onGenerate={generateKey}
        onTierChange={setTier}
        tier={tier}
      />

      <AdminKeyFilters
        inputClass={inputClass}
        onRoleFilterChange={setRoleFilter}
        onSearchChange={setSearch}
        onShowKeysToggle={() => setShowKeys((value) => !value)}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        search={search}
        showKeys={showKeys}
        statusFilter={statusFilter}
      />

      <p className="text-[10px] text-neutral-600 tracking-wider">
        Showing {filtered.length} of {keys.length} keys
      </p>

      <AdminKeysTable
        copiedId={copiedId}
        filtered={filtered}
        onCopy={copyKey}
        onDelete={setDeleteTarget}
        showKeys={showKeys}
      />

      {deleteTarget && (
        <DeleteKeyModal
          deleteLoading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onDelete={handleDelete}
          showKeys={showKeys}
          target={deleteTarget}
        />
      )}
    </div>
  );
}
