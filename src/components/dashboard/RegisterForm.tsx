import { useCallback, useReducer, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { fetchApi } from "@/lib/http";

interface RegisterFormProps {
  turnstileSiteKey: string;
}

interface RegisterState {
  confirmPassword: string;
  email: string;
  error: string;
  loading: boolean;
  name: string;
  newsletter: boolean;
  password: string;
  turnstileError: string;
  turnstileReady: boolean;
  turnstileToken: string;
}

type RegisterTextField = "confirmPassword" | "email" | "name" | "password";

type RegisterAction =
  | { type: "fieldChanged"; field: RegisterTextField; value: string }
  | { type: "newsletterChanged"; newsletter: boolean }
  | { type: "submitStarted" }
  | { type: "errorSet"; error: string }
  | { type: "submitFinished" }
  | { type: "turnstileCompleted"; token: string }
  | { type: "turnstileFailed"; error: string }
  | { type: "turnstileReady" }
  | { type: "turnstileReset" };

const TURNSTILE_ACTION = "signup";

const initialRegisterState: RegisterState = {
  confirmPassword: "",
  email: "",
  error: "",
  loading: false,
  name: "",
  newsletter: false,
  password: "",
  turnstileError: "",
  turnstileReady: false,
  turnstileToken: "",
};

function registerReducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case "fieldChanged":
      return { ...state, [action.field]: action.value };
    case "newsletterChanged":
      return { ...state, newsletter: action.newsletter };
    case "submitStarted":
      return { ...state, error: "", loading: true };
    case "errorSet":
      return { ...state, error: action.error };
    case "submitFinished":
      return { ...state, loading: false };
    case "turnstileCompleted":
      return { ...state, turnstileError: "", turnstileToken: action.token };
    case "turnstileFailed":
      return { ...state, turnstileError: action.error, turnstileToken: "" };
    case "turnstileReady":
      return { ...state, turnstileReady: true };
    case "turnstileReset":
      return { ...state, turnstileToken: "" };
  }
}

export default function RegisterForm({ turnstileSiteKey }: RegisterFormProps) {
  const [
    { confirmPassword, email, error, loading, name, newsletter, password, turnstileError, turnstileReady, turnstileToken },
    dispatch,
  ] = useReducer(registerReducer, initialRegisterState);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  const resetTurnstile = useCallback(() => {
    dispatch({ type: "turnstileReset" });
    turnstileRef.current?.reset();
  }, []);

  const handleTurnstileError = useCallback((nextError: string) => {
    dispatch({ type: "turnstileFailed", error: nextError });
  }, []);

  const handleTurnstileReady = useCallback(() => {
    dispatch({ type: "turnstileReady" });
  }, []);

  const handleTurnstileReset = useCallback(() => {
    dispatch({ type: "turnstileReset" });
  }, []);

  const handleTurnstileToken = useCallback((token: string) => {
    dispatch({ type: "turnstileCompleted", token });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      dispatch({ type: "errorSet", error: "Passwords do not match." });
      return;
    }

    if (password.length < 8) {
      dispatch({ type: "errorSet", error: "Password must be at least 8 characters." });
      return;
    }

    if (!turnstileSiteKey) {
      dispatch({ type: "errorSet", error: "Human verification is temporarily unavailable." });
      return;
    }

    if (!turnstileToken) {
      dispatch({ type: "errorSet", error: "Complete the human verification check before creating an account." });
      return;
    }

    dispatch({ type: "submitStarted" });

    try {
      const { error } = await authClient.signUp.email(
        { name, email, password },
        {
          headers: { "x-captcha-response": turnstileToken },
          onSuccess: async () => {
            if (newsletter) {
              await fetchApi("/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, name }),
              }).catch(() => {});
            }
            window.location.href = "/dashboard/verify?created=1";
          },
        }
      );

      if (error) {
        const lower = (error.message || "").toLowerCase();
        if (lower.includes("already") || lower.includes("exists") || lower.includes("duplicate"))
          dispatch({ type: "errorSet", error: "An account with this email already exists. Try signing in instead." });
        else if (lower.includes("password"))
          dispatch({ type: "errorSet", error: "Password does not meet requirements. Use at least 8 characters." });
        else
          dispatch({ type: "errorSet", error: error.message || "Registration failed. Please try again." });
        resetTurnstile();
      }
    } catch {
      dispatch({ type: "errorSet", error: "Unable to connect. Please check your internet connection and try again." });
      resetTurnstile();
    }
    dispatch({ type: "submitFinished" });
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";

  return (
    <div>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="RegisterForm-full-name" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Full Name
          </label>
          <input id="RegisterForm-full-name"
            type="text"
            value={name}
            onChange={(e) => dispatch({ type: "fieldChanged", field: "name", value: e.target.value })}
            placeholder="John Doe"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="RegisterForm-email" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Email
          </label>
          <input id="RegisterForm-email"
            type="email"
            value={email}
            onChange={(e) => dispatch({ type: "fieldChanged", field: "email", value: e.target.value })}
            placeholder="you@purdue.edu"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="RegisterForm-password" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Password
          </label>
          <input id="RegisterForm-password"
            type="password"
            value={password}
            onChange={(e) => dispatch({ type: "fieldChanged", field: "password", value: e.target.value })}
            placeholder="Min. 8 characters"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="RegisterForm-confirm-password" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Confirm Password
          </label>
          <input id="RegisterForm-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => dispatch({ type: "fieldChanged", field: "confirmPassword", value: e.target.value })}
            placeholder="••••••••"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer group w-fit">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => dispatch({ type: "newsletterChanged", newsletter: e.target.checked })}
                className="peer appearance-none size-4 border border-neutral-700 bg-white/[0.02] checked:bg-white checked:border-white transition-colors cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
              />
              <svg
                className="absolute size-2.5 text-black opacity-0 peer-checked:opacity-100 pointer-events-none stroke-[3] transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[11px] tracking-widest uppercase text-neutral-400 group-hover:text-neutral-300 transition-colors select-none">
              Subscribe to Newsletter
            </span>
          </label>
        </div>

        <div className="min-h-[65px]">
          {turnstileSiteKey ? (
            <TurnstileWidget
              ref={turnstileRef}
              action={TURNSTILE_ACTION}
              className="flex justify-center"
              onError={handleTurnstileError}
              onReady={handleTurnstileReady}
              onReset={handleTurnstileReset}
              onTokenChange={handleTurnstileToken}
              siteKey={turnstileSiteKey}
            />
          ) : (
            <p className="border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">
              Human verification is temporarily unavailable.
            </p>
          )}
          {turnstileError && (
            <p className="mt-3 border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">{turnstileError}</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !turnstileSiteKey || !turnstileReady || !turnstileToken}
          className="w-full py-3 bg-white text-black text-[11px] tracking-[0.2em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
        >
          {loading ? "Creating account" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-600">
        Discord sign-up is disabled. You can verify by linking Discord after creating an account.
      </p>

      <p className="mt-3 text-center text-[10px] leading-5 text-neutral-600">
        Your name and last name will be used as your Discord nickname when you connect your account.
      </p>

      <p className="text-center mt-6 text-xs text-neutral-500">
        Already have an account?{" "}
        <a href="/login" className="text-neutral-300 hover:text-white transition-colors underline underline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
          Sign In
        </a>
      </p>
    </div>
  );
}
