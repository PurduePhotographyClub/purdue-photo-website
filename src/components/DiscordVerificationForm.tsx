import { useEffect, useReducer, useRef } from "react";
import { Camera, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { fetchApi, readErrorMessage, readJsonOrNull } from "@/lib/http";

interface DiscordVerificationFormProps {
  token: string;
  turnstileSiteKey: string;
}

interface VerificationSuccess {
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
  loading: boolean;
  success: boolean;
  turnstileError: string;
  turnstileReady: boolean;
  turnstileToken: string;
}

type VerificationAction =
  | { type: "codeChanged"; code: string }
  | { type: "errorSet"; error: string }
  | { type: "submitStarted" }
  | { type: "submitFailed"; error: string }
  | { type: "submitSucceeded" }
  | { type: "turnstileCompleted"; token: string }
  | { type: "turnstileExpired" }
  | { type: "turnstileFailed"; error: string }
  | { type: "turnstileReady" }
  | { type: "turnstileReset" }
  | { type: "turnstileSetupStarted" };

const initialVerificationState: VerificationState = {
  code: "",
  error: "",
  loading: false,
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
    case "submitStarted":
      return { ...state, error: "", loading: true };
    case "submitFailed":
      return { ...state, error: action.error, loading: false, turnstileToken: "" };
    case "submitSucceeded":
      return { ...state, loading: false, success: true };
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

    dispatch({ type: "submitStarted" });

    try {
      const response = await fetchApi("/api/discord-verification/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: state.code.trim(),
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
        dispatch({ type: "submitSucceeded" });
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

  const digits = Array.from({ length: 6 }, (_, index) => state.code[index] ?? "");

  const inputClass =
    "absolute inset-0 h-full w-full cursor-text opacity-0";

  if (!token) {
    return (
      <div className="relative overflow-hidden border border-red-900/40 bg-red-950/20 p-6 text-sm leading-6 text-red-300 shadow-2xl shadow-black/20">
        <div className="mb-4 flex size-10 items-center justify-center border border-red-900/60 text-red-300">
          <LockKeyhole size={18} aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-red-300">Link Missing</h2>
        <p className="text-xs leading-6 text-red-200/80">
          This verification link is missing its token. Return to Discord and request a new code.
        </p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="border border-green-900/50 bg-green-950/20 p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-green-800/70 text-green-300">
          <CheckCircle2 size={21} aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-green-300">Verified</h2>
        <p className="text-xs leading-6 text-neutral-400">
          Your role has been updated. The bot will send a private confirmation in Discord.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-neutral-800 bg-white/[0.02] p-6">
      <div className="mb-5">
        <p className="mb-3 block text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Verification Code
        </p>
        <label className="relative block">
          <span className="sr-only">Verification Code</span>
          <div className="grid grid-cols-6 gap-2" aria-hidden="true">
            {digits.map((digit, index) => (
              <div
                key={index}
                className={`flex aspect-square min-h-11 items-center justify-center border text-lg text-neutral-100 transition-colors sm:min-h-12 ${
                  digit
                    ? "border-neutral-500 bg-white/[0.06]"
                    : "border-neutral-800 bg-white/[0.02]"
                }`}
              >
                {digit || ""}
              </div>
            ))}
          </div>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={state.code}
            onChange={(event) => dispatch({ type: "codeChanged", code: event.target.value.replace(/\D/g, "").slice(0, 6) })}
            required
            minLength={6}
            maxLength={6}
            className={inputClass}
          />
        </label>
      </div>

      {state.error && (
        <p className="mb-4 break-words border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">{state.error}</p>
      )}

      <div className="mb-4 min-h-[65px]">
        {turnstileSiteKey ? (
          <div ref={turnstileContainerRef} className="flex justify-center" />
        ) : (
          <p className="border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">
            Verification is temporarily unavailable.
          </p>
        )}
        {state.turnstileError && (
          <p className="mt-3 border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">{state.turnstileError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={state.loading || state.code.length !== 6 || !turnstileSiteKey || !state.turnstileReady || !state.turnstileToken}
        className="flex min-h-12 w-full items-center justify-center gap-2 bg-white px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
      >
        {state.loading ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : <Camera size={15} aria-hidden="true" />}
        {state.loading ? "Verifying" : "Verify"}
      </button>

      <p className="mt-4 text-center text-[10px] leading-5 text-neutral-600">
        Codes expire after 10 minutes. Three incorrect attempts will lock this code.
      </p>
    </form>
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
