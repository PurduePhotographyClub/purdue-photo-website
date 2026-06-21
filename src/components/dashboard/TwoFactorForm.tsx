import { useReducer } from "react";
import { authClient } from "@/lib/auth-client";

interface TwoFactorState {
  code: string;
  error: string;
  loading: boolean;
  trustDevice: boolean;
  useBackup: boolean;
}

type TwoFactorAction =
  | { type: "codeChanged"; code: string }
  | { type: "trustDeviceChanged"; trustDevice: boolean }
  | { type: "verificationStarted" }
  | { type: "verificationFailed"; error: string }
  | { type: "backupModeToggled" };

const initialTwoFactorState: TwoFactorState = {
  code: "",
  error: "",
  loading: false,
  trustDevice: true,
  useBackup: false,
};

function twoFactorReducer(state: TwoFactorState, action: TwoFactorAction): TwoFactorState {
  switch (action.type) {
    case "codeChanged":
      return { ...state, code: action.code };
    case "trustDeviceChanged":
      return { ...state, trustDevice: action.trustDevice };
    case "verificationStarted":
      return { ...state, error: "", loading: true };
    case "verificationFailed":
      return { ...state, error: action.error, loading: false };
    case "backupModeToggled":
      return { ...state, code: "", error: "", useBackup: !state.useBackup };
  }
}

export default function TwoFactorForm() {
  const [{ code, error, loading, trustDevice, useBackup }, dispatch] = useReducer(twoFactorReducer, initialTwoFactorState);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "verificationStarted" });

    try {
      let result;
      if (useBackup) {
        result = await authClient.twoFactor.verifyBackupCode({ code, trustDevice });
      } else {
        result = await authClient.twoFactor.verifyTotp({ code, trustDevice });
      }

      if (result.error) {
        dispatch({ type: "verificationFailed", error: result.error.message || "Invalid verification code." });
        return;
      }

      // Fetch fresh session to guarantee we have the fully populated user object
      const sessionRes = await authClient.getSession();
      const userData = (sessionRes.data as any)?.user;

      if (userData?.suspendedUntil) {
        const suspDate = new Date(userData.suspendedUntil);
        const now = new Date();
        if (suspDate > now) {
          await authClient.signOut({
            fetchOptions: { onSuccess: () => {} }
          });

          const diffMs = suspDate.getTime() - now.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          let remainderStr = "";
          if (diffDays > 0) remainderStr = `${diffDays} day(s) and ${diffHours} hour(s)`;
          else if (diffHours > 0) remainderStr = `${diffHours} hour(s) and ${diffMins} minute(s)`;
          else remainderStr = `${diffMins} minute(s)`;

          dispatch({ type: "verificationFailed", error: `Your account is suspended. Remainder: ${remainderStr}.` });
          return;
        }
      }

      window.location.href = "/dashboard";
    } catch {
      dispatch({ type: "verificationFailed", error: "Verification failed. Please try again." });
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors text-center tracking-[0.3em]";

  return (
    <div>
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="TwoFactorForm-field-72" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            {useBackup ? "Backup Code" : "Verification Code"}
          </label>
          <input id="TwoFactorForm-field-72"
            type="text"
            value={code}
            onChange={(e) => dispatch({ type: "codeChanged", code: e.target.value })}
            placeholder={useBackup ? "Enter backup code" : "000000"}
            required
            maxLength={useBackup ? 20 : 6}
            autoComplete="one-time-code"
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => dispatch({ type: "trustDeviceChanged", trustDevice: e.target.checked })}
            className="size-3.5 bg-transparent border border-neutral-700 rounded-sm"
          />
          <span className="text-[10px] tracking-wider text-neutral-500">
            Trust this device for 30 days
          </span>
        </label>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black text-[11px] tracking-[0.2em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Verifying" : "Verify"}
        </button>
      </form>

      <button type="button"
        onClick={() => dispatch({ type: "backupModeToggled" })}
        className="w-full mt-4 text-[10px] tracking-wider text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
      </button>
    </div>
  );
}
