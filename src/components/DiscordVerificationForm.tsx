import { useEffect, useReducer, useRef } from "react";
import { fetchApi, readErrorMessage, readJsonOrNull } from "@/lib/http";

interface DiscordVerificationFormProps {
  token: string;
  turnstileSiteKey: string;
}

interface VerificationSuccess {
  nicknameUpdateReason?: string;
  nicknameUpdated?: boolean;
  ok?: boolean;
}

interface TurnstileRenderOptions {
  "error-callback": () => void;
  "expired-callback": () => void;
  action: string;
  callback: (token: string) => void;
  sitekey: string;
  theme: "dark";
}

interface TurnstileApi {
  remove: (widgetId: string) => void;
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_ACTION = "discord_verification";

let turnstileScriptPromise: Promise<void> | null = null;

interface VerificationState {
  code: string;
  error: string;
  firstName: string;
  lastName: string;
  loading: boolean;
  nicknameUpdateReason: string;
  nicknameUpdated: boolean | null;
  success: boolean;
  turnstileError: string;
  turnstileReady: boolean;
  turnstileToken: string;
}

type VerificationAction =
  | { type: "codeChanged"; code: string }
  | { type: "errorSet"; error: string }
  | { type: "nameChanged"; field: "firstName" | "lastName"; value: string }
  | { type: "submitStarted" }
  | { type: "submitFailed"; error: string }
  | { type: "submitSucceeded"; nicknameUpdateReason?: string; nicknameUpdated?: boolean }
  | { type: "turnstileCompleted"; token: string }
  | { type: "turnstileExpired" }
  | { type: "turnstileFailed"; error: string }
  | { type: "turnstileReady" }
  | { type: "turnstileReset" }
  | { type: "turnstileSetupStarted" };

const initialVerificationState: VerificationState = {
  code: "",
  error: "",
  firstName: "",
  lastName: "",
  loading: false,
  nicknameUpdateReason: "",
  nicknameUpdated: null,
  success: false,
  turnstileError: "",
  turnstileReady: false,
  turnstileToken: "",
};

function verificationReducer(state: VerificationState, action: VerificationAction): VerificationState {
  switch (action.type) {
    case "codeChanged":
      return { ...state, code: action.code };
    case "errorSet":
      return { ...state, error: action.error };
    case "nameChanged":
      return { ...state, [action.field]: action.value };
    case "submitStarted":
      return { ...state, error: "", loading: true };
    case "submitFailed":
      return { ...state, error: action.error, loading: false, turnstileToken: "" };
    case "submitSucceeded":
      return {
        ...state,
        loading: false,
        nicknameUpdateReason: action.nicknameUpdateReason ?? "",
        nicknameUpdated: action.nicknameUpdated ?? null,
        success: true,
      };
    case "turnstileCompleted":
      return { ...state, turnstileError: "", turnstileToken: action.token };
    case "turnstileExpired":
      return {
        ...state,
        turnstileError: "Human verification expired. Complete the check again.",
        turnstileToken: "",
      };
    case "turnstileFailed":
      return { ...state, turnstileError: action.error, turnstileToken: "" };
    case "turnstileReady":
      return { ...state, turnstileReady: true };
    case "turnstileReset":
      return { ...state, turnstileToken: "" };
    case "turnstileSetupStarted":
      return { ...state, turnstileError: "", turnstileReady: false, turnstileToken: "" };
    default:
      return state;
  }
}

export default function DiscordVerificationForm({ token, turnstileSiteKey }: DiscordVerificationFormProps) {
  const [state, dispatch] = useReducer(verificationReducer, initialVerificationState);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !turnstileSiteKey || state.success) {
      return;
    }

    let isActive = true;
    let renderedWidgetId: string | null = null;
    dispatch({ type: "turnstileSetupStarted" });

    loadTurnstileScript()
      .then(() => {
        if (!isActive || !window.turnstile || !turnstileContainerRef.current) {
          return;
        }

        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
          "error-callback": () => {
            dispatch({ type: "turnstileFailed", error: "Human verification failed to load. Refresh and try again." });
          },
          "expired-callback": () => {
            dispatch({ type: "turnstileExpired" });
          },
          callback: (nextToken) => {
            dispatch({ type: "turnstileCompleted", token: nextToken });
          },
          action: TURNSTILE_ACTION,
          sitekey: turnstileSiteKey,
          theme: "dark",
        });

        turnstileWidgetIdRef.current = widgetId;
        renderedWidgetId = widgetId;
        dispatch({ type: "turnstileReady" });
      })
      .catch(() => {
        if (isActive) {
          dispatch({ type: "turnstileFailed", error: "Human verification could not load. Refresh and try again." });
        }
      });

    return () => {
      isActive = false;
      if (renderedWidgetId && window.turnstile) {
        window.turnstile.remove(renderedWidgetId);
      }
    };
  }, [state.success, token, turnstileSiteKey]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!state.turnstileToken) {
      dispatch({ type: "errorSet", error: "Complete the human verification check before verifying." });
      return;
    }

    if (!state.firstName.trim() || !state.lastName.trim()) {
      dispatch({ type: "errorSet", error: "Enter your real first and last name before verifying." });
      return;
    }

    dispatch({ type: "submitStarted" });

    try {
      const response = await fetchApi("/api/discord-verification/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: state.code.trim(),
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          token,
          turnstileToken: state.turnstileToken,
        }),
      });

      if (!response.ok) {
        dispatch({ type: "submitFailed", error: await readErrorMessage(response, "Verification failed.") });
        resetTurnstile();
        return;
      }

      const data = await readJsonOrNull<VerificationSuccess>(response);
      if (data?.ok) {
        dispatch({
          type: "submitSucceeded",
          nicknameUpdateReason: data.nicknameUpdateReason,
          nicknameUpdated: data.nicknameUpdated,
        });
      } else {
        dispatch({ type: "submitFailed", error: "Verification completed, but the server response was unexpected." });
        resetTurnstile();
      }
    } catch {
      dispatch({ type: "submitFailed", error: "Unable to verify right now. Please try again." });
      resetTurnstile();
    }
  };

  const resetTurnstile = () => {
    dispatch({ type: "turnstileReset" });
    const widgetId = turnstileWidgetIdRef.current;
    if (widgetId) {
      window.turnstile?.reset(widgetId);
    }
  };

  const hasRequiredNameFields = Boolean(state.firstName.trim() && state.lastName.trim());

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-red-300">Link Missing</h2>
        <p className="text-xs leading-6 text-red-300">
          This verification link is missing its token. Return to Discord and request a new code.
        </p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-green-300">Verified</h2>
        <p className="text-xs leading-6 text-neutral-400">
          {state.nicknameUpdated === true
            ? "Your role and nickname have been updated. The bot will send a private confirmation in Discord."
            : "Your role has been updated. The bot will send a private confirmation in Discord."}
        </p>
        {state.nicknameUpdated === false && (
          <p className="mt-4 text-xs leading-5 text-amber-300">
            Discord did not allow the bot to update your nickname. Reason: {formatNicknameUpdateReason(state.nicknameUpdateReason)}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Real Name
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="sr-only">First Name</span>
              <input
                type="text"
                autoComplete="given-name"
                value={state.firstName}
                onChange={(event) => dispatch({ type: "nameChanged", field: "firstName", value: event.target.value })}
                placeholder="First name"
                required
                maxLength={32}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="sr-only">Last Name</span>
              <input
                type="text"
                autoComplete="family-name"
                value={state.lastName}
                onChange={(event) => dispatch({ type: "nameChanged", field: "lastName", value: event.target.value })}
                placeholder="Last name"
                required
                maxLength={32}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Use your real first and last name. This will become your Discord nickname after verification.
          </p>
        </div>

        <div>
          <label htmlFor="DiscordVerificationForm-code" className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Verification Code
          </label>
          <input
            id="DiscordVerificationForm-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={state.code}
            onChange={(event) => dispatch({ type: "codeChanged", code: event.target.value.replace(/\D/g, "").slice(0, 6) })}
            placeholder="000000"
            required
            minLength={6}
            maxLength={6}
            className={inputClass}
          />
        </div>

        {state.error && (
          <p className="break-words text-xs leading-relaxed text-red-400">{state.error}</p>
        )}

        <div className="min-h-[65px]">
          {turnstileSiteKey ? (
            <div ref={turnstileContainerRef} className="flex justify-center" />
          ) : (
            <p className="text-xs leading-relaxed text-red-400">
              Verification is temporarily unavailable.
            </p>
          )}
          {state.turnstileError && (
            <p className="mt-3 text-xs leading-relaxed text-red-400">{state.turnstileError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={state.loading || !hasRequiredNameFields || state.code.length !== 6 || !turnstileSiteKey || !state.turnstileReady || !state.turnstileToken}
          className="w-full bg-white px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {state.loading ? "Verifying" : "Verify"}
        </button>

        <p className="text-center text-[10px] leading-5 text-neutral-600">
          Codes expire after 10 minutes. Three incorrect attempts will lock this code.
        </p>
      </form>
    </div>
  );
}

function loadTurnstileScript() {
  if (typeof window === "undefined" || window.turnstile) {
    return Promise.resolve();
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

function formatNicknameUpdateReason(reason: string) {
  switch (reason) {
    case "missing_manage_nicknames":
      return "the bot is missing Manage Nicknames permission";
    case "role_hierarchy":
      return "the bot role is below your highest Discord role";
    case "missing_access":
      return "the bot cannot access this server member";
    case "missing_member":
      return "the Discord member was not found";
    case "missing_permissions":
      return "Discord reported missing permissions";
    case "discord_api_error":
      return "Discord rejected the nickname update";
    default:
      return "unknown";
  }
}
