import { useReducer } from "react";
import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import QRCode from "react-qr-code";
import { fetchApi, fetchJson, readErrorMessage } from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

interface SettingsUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  tier?: string | null;
  membershipExpiresAt?: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  createdAt?: string | number | Date | null;
  twoFactorEnabled?: boolean | null;
}

interface SettingsPanelProps {
  initialUser: SettingsUser;
}

interface PasskeyEntry {
  id: string;
  name?: string | null;
  createdAt?: string | Date | null;
}

interface DiscordProfileState {
  discordId?: string | null;
  discordUsername?: string | null;
}

const settingsTabs = [
  { id: "information", label: "Information" },
  { id: "security", label: "Security" },
  { id: "connections", label: "Connections" },
  { id: "danger", label: "Danger Zone" },
] as const;

function formatDate(value: SettingsUser["createdAt"]) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

function getInitialDiscordLinkError() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const discordStatus = params.get("discord");
  const discordError = params.get("error");
  return discordStatus === "error" || discordError ? friendlyDiscordLinkError(discordError) : "";
}

interface SettingsPanelState {
  password: string;
  totpUri: string;
  backupCodes: string[];
  verifyCode: string;
  step: "idle" | "setup" | "verify" | "codes";
  error: string;
  loading: boolean;
  deleteConfirm: boolean;
  deleteInput: string;
  deleteError: string;
  deleteLoading: boolean;
  passkeyLoading: boolean;
  passkeyError: string;
  passkeyName: string;
  discordLinkLoading: boolean;
  discordUnlinkLoading: boolean;
  discordLinkError: string;
  tab: "information" | "security" | "connections" | "danger";
}

function createInitialSettingsPanelState(): SettingsPanelState {
  return {
    password: "",
    totpUri: "",
    backupCodes: [],
    verifyCode: "",
    step: "idle",
    error: "",
    loading: false,
    deleteConfirm: false,
    deleteInput: "",
    deleteError: "",
    deleteLoading: false,
    passkeyLoading: false,
    passkeyError: "",
    passkeyName: "",
    discordLinkLoading: false,
    discordUnlinkLoading: false,
    discordLinkError: getInitialDiscordLinkError(),
    tab: "information",
  };
}

type ValueSetter<Value> = (value: Value) => void;

async function startDiscordLink(
  setDiscordLinkError: ValueSetter<string>,
  setDiscordLinkLoading: ValueSetter<boolean>,
) {
  setDiscordLinkError("");
  setDiscordLinkLoading(true);

  try {
    const res = await fetchApi("/api/auth/link-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callbackURL: "/dashboard/settings?discord=linked",
        errorCallbackURL: "/dashboard/settings?discord=error",
        provider: "discord",
      }),
    });

    if (!res.ok) {
      setDiscordLinkError(await readErrorMessage(res, "Failed to start Discord linking."));
      setDiscordLinkLoading(false);
      return;
    }

    const data = await res.json().catch(() => null) as { redirect?: boolean; url?: string } | null;
    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    window.location.reload();
  } catch {
    setDiscordLinkError("Unable to connect to Discord. Please try again.");
    setDiscordLinkLoading(false);
  }
}

type SettingsTab = SettingsPanelState["tab"];

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="flex border-b border-neutral-800 mb-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {settingsTabs.map((tab) => (
        <button type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-5 py-3 text-[10px] tracking-[0.2em] uppercase shrink-0 transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? "border-white text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          } ${tab.id === "danger" ? (activeTab === "danger" ? "text-red-400 border-red-400" : "text-red-900 hover:text-red-400") : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface InformationPanelProps {
  discordDisplayUser: SettingsUser;
  user: SettingsUser;
}

function InformationPanel({ discordDisplayUser, user }: InformationPanelProps) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-6">
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-1">Profile</p>
      <h2 className="text-sm tracking-wider text-neutral-200 mb-4">Account Information</h2>
      <div className="space-y-3">
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">Name</p>
          <p className="text-sm text-neutral-300">{user.name}</p>
        </div>
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">Email</p>
          <p className="text-sm text-neutral-300">{user.email}</p>
        </div>
        {discordDisplayUser.discordId && (
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">Discord</p>
            <p className="text-sm text-neutral-300 break-all">{formatDiscordDisplay(discordDisplayUser)}</p>
            <p className="text-[10px] text-neutral-600 mt-0.5 break-all">ID {discordDisplayUser.discordId}</p>
            <p className="text-[10px] text-green-400 mt-0.5">Linked</p>
          </div>
        )}
        <div className="flex gap-8">
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">Role</p>
            <p className="text-sm text-neutral-300 capitalize">{user.role || "member"}</p>
          </div>
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">2FA</p>
            <p className={`text-sm ${user.twoFactorEnabled ? "text-green-400" : "text-neutral-500"}`}>
              {user.twoFactorEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
        {user.membershipExpiresAt && (
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">Membership Expires</p>
            <p className="text-sm text-neutral-300">{formatDate(user.membershipExpiresAt)}</p>
          </div>
        )}
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 mb-1">Member Since</p>
          <p className="text-sm text-neutral-300">{formatDate(user.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

interface SecurityPanelProps {
  backupCodes: string[];
  error: string;
  inputClass: string;
  loadPasskeyError: unknown;
  loading: boolean;
  onAddPasskey: () => void;
  onDeletePasskey: (id: string) => void;
  onDisable2FA: () => void;
  onEnable2FA: () => void;
  onFinish2FASetup: () => void;
  onPasskeyNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onVerifyCodeChange: (value: string) => void;
  onVerifyTotp: () => void;
  passkeyError: string;
  passkeyLoading: boolean;
  passkeyName: string;
  passkeys: PasskeyEntry[];
  password: string;
  step: SettingsPanelState["step"];
  totpUri: string;
  user: SettingsUser;
  verifyCode: string;
}

function SecurityPanel({
  backupCodes,
  error,
  inputClass,
  loadPasskeyError,
  loading,
  onAddPasskey,
  onDeletePasskey,
  onDisable2FA,
  onEnable2FA,
  onFinish2FASetup,
  onPasskeyNameChange,
  onPasswordChange,
  onVerifyCodeChange,
  onVerifyTotp,
  passkeyError,
  passkeyLoading,
  passkeyName,
  passkeys,
  password,
  step,
  totpUri,
  user,
  verifyCode,
}: SecurityPanelProps) {
  return (
    <div className="space-y-8">
      <div className="bg-white/[0.02] border border-neutral-800 p-6">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-1">Security</p>
        <h2 className="text-sm tracking-wider text-neutral-200 mb-4">Two-Factor Authentication</h2>

        {user.twoFactorEnabled && step === "idle" && (
          <div>
            <p className="text-xs text-green-400 mb-4">2FA is currently enabled.</p>
            <div className="space-y-3">
              <input aria-label="Password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Password (if your account has one)"
                className={inputClass}
              />
              <button type="button"
                onClick={onDisable2FA}
                disabled={loading}
                className="px-4 py-2.5 border border-red-900 text-[10px] tracking-[0.15em] uppercase text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {loading ? "Disabling" : "Disable 2FA"}
              </button>
            </div>
          </div>
        )}

        {!user.twoFactorEnabled && step === "idle" && (
          <div>
            <p className="text-xs text-neutral-500 mb-4">
              Add an extra layer of security to your account with TOTP-based two-factor authentication.
            </p>
            <div className="space-y-3">
              <input aria-label="Password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Password (if your account has one)"
                className={inputClass}
              />
              <button type="button"
                onClick={onEnable2FA}
                disabled={loading}
                className="px-4 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
              >
                {loading ? "Setting up" : "Enable 2FA"}
              </button>
            </div>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="bg-white p-4 inline-block">
              <QRCode value={totpUri} size={180} />
            </div>
            <div>
              <label htmlFor="SettingsPanel-enter-the-6-digit-code-from-your-app" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
                Enter the 6-digit code from your app
              </label>
              <input id="SettingsPanel-enter-the-6-digit-code-from-your-app"
                type="text"
                value={verifyCode}
                onChange={(e) => onVerifyCodeChange(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className={`${inputClass} text-center tracking-[0.3em]`}
              />
            </div>
            <button type="button"
              onClick={onVerifyTotp}
              disabled={loading || verifyCode.length !== 6}
              className="px-4 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
            >
              {loading ? "Verifying" : "Verify & Enable"}
            </button>
          </div>
        )}

        {step === "codes" && (
          <div className="space-y-4">
            <p className="text-xs text-green-400 mb-2">2FA has been enabled successfully!</p>
            <p className="text-xs text-neutral-400">
              Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
            </p>
            <div className="bg-neutral-900 border border-neutral-800 p-4 font-mono text-xs">
              {backupCodes.map((code) => (
                <div key={code} className="text-neutral-300 py-0.5">{code}</div>
              ))}
            </div>
            <button type="button"
              onClick={onFinish2FASetup}
              className="px-4 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors"
            >
              Finish 2FA setup
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 mt-3">{error}</p>
        )}
      </div>

      <div className="bg-white/[0.02] border border-neutral-800 p-6">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-1">Security</p>
        <h2 className="text-sm tracking-wider text-neutral-200 mb-4">Passkeys</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Passkeys let you sign in securely without a password using biometrics, a PIN, or a security key.
        </p>

        {passkeys.length > 0 && (
          <div className="space-y-2 mb-4">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 px-4 py-3">
                <div>
                  <p className="text-sm text-neutral-300">{passkey.name || "Unnamed passkey"}</p>
                  {passkey.createdAt && (
                    <p className="text-[10px] text-neutral-600 mt-0.5">
                      Added {new Date(passkey.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button type="button"
                  onClick={() => onDeletePasskey(passkey.id)}
                  className="text-[10px] tracking-[0.15em] uppercase text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <input aria-label="Passkey name"
            type="text"
            value={passkeyName}
            onChange={(e) => onPasskeyNameChange(e.target.value)}
            placeholder="Passkey name (optional)"
            className={inputClass}
          />
          <button type="button"
            onClick={onAddPasskey}
            disabled={passkeyLoading}
            className="px-4 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {passkeyLoading ? "Registering..." : "Add Passkey"}
          </button>
        </div>

        {Boolean(passkeyError || loadPasskeyError) && (
          <p className="text-xs text-red-400 mt-3">{passkeyError || "Failed to load passkeys."}</p>
        )}
      </div>
    </div>
  );
}

interface ConnectionsPanelProps {
  discordDisplayUser: SettingsUser;
  discordLinkError: string;
  discordLinkLoading: boolean;
  discordUnlinkLoading: boolean;
  onLinkDiscord: () => void;
  onUnlinkDiscord: () => void;
}

function ConnectionsPanel({
  discordDisplayUser,
  discordLinkError,
  discordLinkLoading,
  discordUnlinkLoading,
  onLinkDiscord,
  onUnlinkDiscord,
}: ConnectionsPanelProps) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-6">
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-1">Connections</p>
      <h2 className="text-sm tracking-wider text-neutral-200 mb-4">Linked Accounts</h2>
      <p className="text-xs leading-5 text-neutral-500 mb-4">
        Link Discord to redeem server membership, enable Discord login for this account, and keep website tier roles synced in the server.
      </p>
      <p className="text-[10px] leading-5 text-neutral-600 mb-4">
        Your name and last name will be used as your Discord nickname when you connect your account.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-neutral-800 bg-neutral-900/40 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-neutral-300">Discord</p>
          <p className={`text-[10px] mt-0.5 ${discordDisplayUser.discordId ? "text-green-400" : "text-neutral-600"}`}>
            {discordDisplayUser.discordId ? `Linked as ${formatDiscordDisplay(discordDisplayUser)}` : "Not linked"}
          </p>
          {discordDisplayUser.discordId && (
            <p className="text-[10px] text-neutral-600 mt-0.5 break-all">ID {formatDiscordId(discordDisplayUser.discordId)}</p>
          )}
        </div>
        {!discordDisplayUser.discordId ? (
          <button type="button"
            onClick={onLinkDiscord}
            disabled={discordLinkLoading || discordUnlinkLoading}
            className="px-4 py-2.5 bg-[#5865F2] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#4752C4] transition-colors disabled:opacity-50"
          >
            {discordLinkLoading ? "Connecting" : "Link Discord"}
          </button>
        ) : (
          <button type="button"
            onClick={onUnlinkDiscord}
            disabled={discordLinkLoading || discordUnlinkLoading}
            className="px-4 py-2.5 border border-red-900 text-[10px] tracking-[0.15em] uppercase text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {discordUnlinkLoading ? "Unlinking" : "Unlink Discord"}
          </button>
        )}
      </div>
      {discordDisplayUser.discordId && (
        <p className="text-[10px] leading-4 text-neutral-600 mt-3">
          Unlinking removes your PCC roles from Discord and turns off Discord login for this website account. You can regain those roles anytime by activating your account again.
        </p>
      )}
      {discordLinkError && (
        <p className="text-xs text-red-400 mt-3">{discordLinkError}</p>
      )}
    </div>
  );
}

interface DangerPanelProps {
  deleteConfirm: boolean;
  deleteError: string;
  deleteInput: string;
  deleteLoading: boolean;
  inputClass: string;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onDeleteInputChange: (value: string) => void;
  onStartDelete: () => void;
}

function DangerPanel({
  deleteConfirm,
  deleteError,
  deleteInput,
  deleteLoading,
  inputClass,
  onCancelDelete,
  onConfirmDelete,
  onDeleteInputChange,
  onStartDelete,
}: DangerPanelProps) {
  return (
    <div className="bg-white/[0.02] border border-red-900/30 p-6">
      <p className="text-[9px] tracking-[0.3em] uppercase text-red-900 mb-1">Danger Zone</p>
      <h2 className="text-sm tracking-wider text-red-400 mb-2">Delete Account</h2>
      <p className="text-xs text-neutral-500 mb-4">
        Permanently delete your account and all associated data including photos, competition entries, and equipment listings. This action cannot be undone.
      </p>
      <p className="text-[10px] text-neutral-600 mb-4">
        Active or pending equipment loans must be resolved before you can delete your account.
      </p>

      {!deleteConfirm ? (
        <button type="button"
          onClick={onStartDelete}
          className="px-4 py-2.5 border border-red-900 text-[10px] tracking-[0.15em] uppercase text-red-400 hover:bg-red-900/20 transition-colors"
        >
          Delete My Account
        </button>
      ) : (
        <div className="space-y-3 border-t border-neutral-800 pt-4">
          <p className="text-xs text-red-400">
            Type <span className="font-bold">DELETE</span> to confirm account deletion.
          </p>
          <input aria-label="DELETE to confirm"
            type="text"
            value={deleteInput}
            onChange={(e) => onDeleteInputChange(e.target.value)}
            placeholder="Type DELETE to confirm"
            className={inputClass}
          />
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={onConfirmDelete}
              disabled={deleteLoading || deleteInput !== "DELETE"}
              className="px-4 py-2.5 bg-red-600 text-[10px] tracking-[0.15em] uppercase text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteLoading ? "Deleting" : "Permanently Delete"}
            </button>
            <button type="button"
              onClick={onCancelDelete}
              className="px-4 py-2.5 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
          </div>
          {deleteError && (
            <p className="text-xs text-red-400">{deleteError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel({ initialUser }: SettingsPanelProps) {
  const { data: session } = authClient.useSession();
  const user = (session?.user as SettingsUser | undefined) ?? initialUser;

  const [state, dispatchState] = useReducer(
    keyedStateReducer<SettingsPanelState>,
    createInitialSettingsPanelState(),
  );
  const {
    password,
    totpUri,
    backupCodes,
    verifyCode,
    step,
    error,
    loading,
    deleteConfirm,
    deleteInput,
    deleteError,
    deleteLoading,
    passkeyLoading,
    passkeyError,
    passkeyName,
    discordLinkLoading,
    discordUnlinkLoading,
    discordLinkError,
    tab,
  } = state;
  const setPassword = createKeyedStateSetter(dispatchState, "password");
  const setTotpUri = createKeyedStateSetter(dispatchState, "totpUri");
  const setBackupCodes = createKeyedStateSetter(dispatchState, "backupCodes");
  const setVerifyCode = createKeyedStateSetter(dispatchState, "verifyCode");
  const setStep = createKeyedStateSetter(dispatchState, "step");
  const setError = createKeyedStateSetter(dispatchState, "error");
  const setLoading = createKeyedStateSetter(dispatchState, "loading");
  const setDeleteConfirm = createKeyedStateSetter(dispatchState, "deleteConfirm");
  const setDeleteInput = createKeyedStateSetter(dispatchState, "deleteInput");
  const setDeleteError = createKeyedStateSetter(dispatchState, "deleteError");
  const setDeleteLoading = createKeyedStateSetter(dispatchState, "deleteLoading");
  const setPasskeyLoading = createKeyedStateSetter(dispatchState, "passkeyLoading");
  const setPasskeyError = createKeyedStateSetter(dispatchState, "passkeyError");
  const setPasskeyName = createKeyedStateSetter(dispatchState, "passkeyName");
  const setDiscordLinkLoading = createKeyedStateSetter(dispatchState, "discordLinkLoading");
  const setDiscordUnlinkLoading = createKeyedStateSetter(dispatchState, "discordUnlinkLoading");
  const setDiscordLinkError = createKeyedStateSetter(dispatchState, "discordLinkError");
  const setTab = createKeyedStateSetter(dispatchState, "tab");
  const shouldLoadDiscordProfile = Boolean(user.discordId && !user.discordUsername);
  const { data: discordProfile = null } = useSWR<DiscordProfileState | null>(
    shouldLoadDiscordProfile ? "/api/account/discord-profile" : null,
    fetchJson
  );
  const {
    data: passkeys = [],
    error: loadPasskeyError,
    mutate: loadPasskeys,
  } = useSWR<PasskeyEntry[]>(["passkeys", user.id], async () => {
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) throw new Error(error.message || "Failed to load passkeys.");
    return data ?? [];
  });

  const discordDisplayUser: SettingsUser = {
    ...user,
    discordId: discordProfile?.discordId ?? user.discordId,
    discordUsername: discordProfile?.discordUsername ?? user.discordUsername,
  };

  const handleAddPasskey = async () => {
    setPasskeyError("");
    setPasskeyLoading(true);
    try {
      const { error } = await authClient.passkey.addPasskey({
        name: passkeyName || undefined,
      });
      if (error) {
        setPasskeyError(error.message || "Failed to register passkey.");
      } else {
        setPasskeyName("");
        await loadPasskeys();
      }
    } catch {
      setPasskeyError("Passkey registration was cancelled or failed.");
    }
    setPasskeyLoading(false);
  };

  const handleDeletePasskey = async (id: string) => {
    setPasskeyError("");
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) {
      setPasskeyError(error.message || "Failed to delete passkey.");
    } else {
      await loadPasskeys();
    }
  };

  const handleEnable2FA = async () => {
    setError("");
    setLoading(true);

    // Better Auth only needs a password when the account actually has a password credential.
    const passwordPayload = password.trim() ? { password } : {};
    const { data, error } = await authClient.twoFactor.enable(passwordPayload as { password?: string });

    if (error) {
      setError(friendlyTwoFactorError(error, "Failed to enable 2FA."));
      setLoading(false);
      return;
    }

    if (data) {
      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes);
      setStep("setup");
    }
    setLoading(false);
  };

  const handleVerifyTotp = async () => {
    setError("");
    setLoading(true);

    const { error } = await authClient.twoFactor.verifyTotp({
      code: verifyCode,
    });

    if (error) {
      setError(error.message || "Invalid code.");
      setLoading(false);
      return;
    }

    setStep("codes");
    setLoading(false);
  };

  const handleDisable2FA = async () => {
    setError("");
    setLoading(true);

    // Passwordless login accounts can disable 2FA without sending an empty password string.
    const passwordPayload = password.trim() ? { password } : {};
    const { error } = await authClient.twoFactor.disable(passwordPayload as { password?: string });

    if (error) {
      setError(friendlyTwoFactorError(error, "Failed to disable 2FA."));
      setLoading(false);
      return;
    }

    setStep("idle");
    setPassword("");
    window.location.reload();
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const res = await fetchApi("/api/account/delete", { method: "DELETE" });

      if (!res.ok) {
        setDeleteError(await readErrorMessage(res, "Failed to delete account."));
        setDeleteLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  };

  const handleLinkDiscord = async () => {
    await startDiscordLink(setDiscordLinkError, setDiscordLinkLoading);
  };

  const handleUnlinkDiscord = async () => {
    setDiscordLinkError("");
    setDiscordUnlinkLoading(true);

    try {
      // Better Auth handles the account unlink; API hooks remove managed Discord roles and write the audit log.
      const res = await fetchApi("/api/auth/unlink-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: "discord" }),
      });

      if (!res.ok) {
        const message = await readErrorMessage(res, "Failed to unlink Discord.");
        setDiscordLinkError(friendlyDiscordUnlinkError(message));
        setDiscordUnlinkLoading(false);
        return;
      }

      // After unlinking a login method, end the current session so the user signs back in cleanly.
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
      window.location.href = "/login";
    } catch {
      setDiscordLinkError("Unable to unlink Discord. Please try again.");
      setDiscordUnlinkLoading(false);
    }
  };

  const finishTwoFactorSetup = () => {
    setStep("idle");
    setPassword("");
    setVerifyCode("");
    window.location.reload();
  };

  const cancelDeleteAccount = () => {
    setDeleteConfirm(false);
    setDeleteInput("");
    setDeleteError("");
  };

  return (
    <div>
      <SettingsTabs activeTab={tab} onTabChange={setTab} />

      <div className="max-w-lg">
      {tab === "information" && (
        <InformationPanel discordDisplayUser={discordDisplayUser} user={user} />
      )}

      {tab === "security" && (
        <SecurityPanel
          backupCodes={backupCodes}
          error={error}
          inputClass={inputClass}
          loadPasskeyError={loadPasskeyError}
          loading={loading}
          onAddPasskey={handleAddPasskey}
          onDeletePasskey={handleDeletePasskey}
          onDisable2FA={handleDisable2FA}
          onEnable2FA={handleEnable2FA}
          onFinish2FASetup={finishTwoFactorSetup}
          onPasskeyNameChange={setPasskeyName}
          onPasswordChange={setPassword}
          onVerifyCodeChange={setVerifyCode}
          onVerifyTotp={handleVerifyTotp}
          passkeyError={passkeyError}
          passkeyLoading={passkeyLoading}
          passkeyName={passkeyName}
          passkeys={passkeys}
          password={password}
          step={step}
          totpUri={totpUri}
          user={user}
          verifyCode={verifyCode}
        />
      )}

      {tab === "connections" && (
        <ConnectionsPanel
          discordDisplayUser={discordDisplayUser}
          discordLinkError={discordLinkError}
          discordLinkLoading={discordLinkLoading}
          discordUnlinkLoading={discordUnlinkLoading}
          onLinkDiscord={handleLinkDiscord}
          onUnlinkDiscord={handleUnlinkDiscord}
        />
      )}

      {tab === "danger" && (
        <DangerPanel
          deleteConfirm={deleteConfirm}
          deleteError={deleteError}
          deleteInput={deleteInput}
          deleteLoading={deleteLoading}
          inputClass={inputClass}
          onCancelDelete={cancelDeleteAccount}
          onConfirmDelete={handleDeleteAccount}
          onDeleteInputChange={setDeleteInput}
          onStartDelete={() => setDeleteConfirm(true)}
        />
      )}
      </div>
    </div>
  );
}

function formatDiscordId(discordId: string) {
  return discordId.length > 6 ? `...${discordId.slice(-6)}` : discordId;
}

function formatDiscordDisplay(user: Pick<SettingsUser, "discordId" | "discordUsername">) {
  return user.discordUsername || (user.discordId ? `Discord user ${formatDiscordId(user.discordId)}` : "Discord");
}

function friendlyTwoFactorError(errorLike: unknown, fallback: string) {
  const message = readAuthClientError(errorLike);
  const normalized = message.toLowerCase().replace(/_/g, " ");

  if (normalized.includes("invalid password")) {
    return "That password is incorrect. Please try again.";
  }
  if (normalized.includes("password")) {
    return "Enter your current password to manage 2FA.";
  }

  return message || fallback;
}

function readAuthClientError(errorLike: unknown) {
  if (typeof errorLike === "string") return errorLike;
  if (!errorLike || typeof errorLike !== "object") return "";

  const error = errorLike as {
    code?: string;
    error?: string;
    message?: string;
    statusText?: string;
  };

  return error.message || error.error || error.code || error.statusText || "";
}

function friendlyDiscordLinkError(error: string | null) {
  const normalized = (error || "").toLowerCase();
  if (normalized.includes("different_user") || normalized.includes("already_linked")) {
    return "That Discord account is already linked to another website account.";
  }
  if (normalized.includes("failed_to_unlink_last_account")) {
    return "Add another sign-in method before unlinking Discord.";
  }

  return "Discord linking could not be completed. Please try again.";
}

function friendlyDiscordUnlinkError(error: string | null) {
  const normalized = (error || "").toLowerCase();
  if (normalized.includes("last account") || normalized.includes("failed_to_unlink_last_account")) {
    return "Add another sign-in method before unlinking Discord.";
  }

  return error || "Failed to unlink Discord.";
}
