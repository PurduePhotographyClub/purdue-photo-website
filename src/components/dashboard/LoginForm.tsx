import { useEffect, useReducer } from "react";
import { authClient } from "@/lib/auth-client";
import { fetchApi } from "@/lib/http";

const SERVICE_UNAVAILABLE_MESSAGE = "Service unavailable. The API is not responding right now. Please try again in a moment.";
const API_HEALTH_ENDPOINT = "/api/stats";

class ApiUnavailableError extends Error {
  constructor() {
    super(SERVICE_UNAVAILABLE_MESSAGE);
  }
}

type ErrorLike = {
  message?: string;
  status?: number;
  statusCode?: number;
  statusText?: string;
};

interface LoginState {
  email: string;
  error: string;
  loading: boolean;
  passkeyLoading: boolean;
  password: string;
}

type LoginAction =
  | { type: "fieldChanged"; field: "email" | "password"; value: string }
  | { type: "errorSet"; error: string }
  | { type: "loginStarted"; method: "email" | "passkey" }
  | { type: "loginFinished"; method: "email" | "passkey" };

const initialLoginState: LoginState = {
  email: "",
  error: "",
  loading: false,
  passkeyLoading: false,
  password: "",
};

function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case "fieldChanged":
      return { ...state, [action.field]: action.value };
    case "errorSet":
      return { ...state, error: action.error };
    case "loginStarted":
      return {
        ...state,
        error: "",
        loading: action.method === "email" ? true : state.loading,
        passkeyLoading: action.method === "passkey" ? true : state.passkeyLoading,
      };
    case "loginFinished":
      return {
        ...state,
        loading: action.method === "email" ? false : state.loading,
        passkeyLoading: action.method === "passkey" ? false : state.passkeyLoading,
      };
  }
}

function friendlyAuthError(errorLike: unknown) {
  if (isServiceUnavailableError(errorLike)) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }

  const msg = getErrorMessage(errorLike) || "Invalid email or password.";
  const lower = msg.toLowerCase();
  if (lower.includes("user not found") || lower.includes("no user"))
    return "No account found with this email. Please register first.";
  if (lower.includes("invalid password") || lower.includes("incorrect password"))
    return "Incorrect password. Please try again.";
  if (lower.includes("too many") || lower.includes("rate"))
    return "Too many login attempts. Please wait a moment and try again.";
  if (lower.includes("email"))
    return "Please check your email address and try again.";
  return msg;
}

async function assertApiAvailable() {
  try {
    const response = await fetchApi(API_HEALTH_ENDPOINT, { cache: "no-store" });
    if (isServiceUnavailableResponse(response)) {
      throw new ApiUnavailableError();
    }
  } catch (error) {
    if (isServiceUnavailableError(error)) {
      throw error;
    }

    throw new ApiUnavailableError();
  }
}

export default function LoginForm() {
  const [{ email, error, loading, passkeyLoading, password }, dispatch] = useReducer(loginReducer, initialLoginState);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordError = params.get("error");
    if (discordError) {
      dispatch({ type: "errorSet", error: friendlyDiscordError(discordError) });
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "loginStarted", method: "email" });

    try {
      await assertApiAvailable();

      const { error } = await authClient.signIn.email(
        { email, password },
        {
          onSuccess: async (ctx) => {
            // Check if user is suspended. We fetch the session to guarantee the user data has additionalFields
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

                dispatch({ type: "errorSet", error: `Your account is suspended. Remainder: ${remainderStr}.` });
                dispatch({ type: "loginFinished", method: "email" });
                return;
              }
            }
            if (ctx.data.twoFactorRedirect) {
              window.location.href = "/2fa";
              return;
            }
            window.location.href = "/dashboard";
          },
        }
      );

      if (error) {
        dispatch({ type: "errorSet", error: friendlyAuthError(error) });
      }
    } catch (error) {
      dispatch({
        type: "errorSet",
        error: isServiceUnavailableError(error)
          ? SERVICE_UNAVAILABLE_MESSAGE
          : "Unable to connect. Please check your internet connection and try again.",
      });
    }
    dispatch({ type: "loginFinished", method: "email" });
  };

  const handleDiscordLogin = async () => {
    dispatch({ type: "errorSet", error: "" });

    try {
      await assertApiAvailable();

      await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login",
      });
    } catch (error) {
      dispatch({
        type: "errorSet",
        error: isServiceUnavailableError(error)
          ? SERVICE_UNAVAILABLE_MESSAGE
          : "Unable to connect to Discord. Please try again.",
      });
    }
  };

  const handlePasskeyLogin = async () => {
    dispatch({ type: "loginStarted", method: "passkey" });
    try {
      await assertApiAvailable();

      const res = await authClient.signIn.passkey();
      if (res.error) {
        dispatch({ type: "errorSet", error: friendlyAuthError(res.error) });
        dispatch({ type: "loginFinished", method: "passkey" });
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

          dispatch({ type: "errorSet", error: `Your account is suspended. Remainder: ${remainderStr}.` });
          dispatch({ type: "loginFinished", method: "passkey" });
          return;
        }
      }
      window.location.href = "/dashboard";
    } catch (error) {
      dispatch({
        type: "errorSet",
        error: isServiceUnavailableError(error)
          ? SERVICE_UNAVAILABLE_MESSAGE
          : "Passkey authentication was cancelled or failed.",
      });
    }
    dispatch({ type: "loginFinished", method: "passkey" });
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";

  return (
    <div>
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="LoginForm-email" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Email
          </label>
          <input id="LoginForm-email" aria-label="you@purdue.edu"
            type="email"
            value={email}
            onChange={(e) => dispatch({ type: "fieldChanged", field: "email", value: e.target.value })}
            placeholder="you@purdue.edu"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="LoginForm-password" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Password
          </label>
          <input id="LoginForm-password" aria-label="••••••••"
            type="password"
            value={password}
            onChange={(e) => dispatch({ type: "fieldChanged", field: "password", value: e.target.value })}
            placeholder="••••••••"
            required
            className={inputClass}
          />
        </div>

        {error && (
          <p className="break-words text-xs leading-relaxed text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black text-[11px] tracking-[0.2em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in" : "Sign In"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-neutral-950 px-4 text-[10px] tracking-widest text-neutral-600 uppercase">
            or
          </span>
        </div>
      </div>

      <button type="button"
        onClick={handleDiscordLogin}
        className="w-full py-3 bg-[#5865F2] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[#4752C4] transition-colors flex items-center justify-center gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.32 4.37a19.79 19.79 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.89 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.1.25.2.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03z" />
        </svg>
        Continue with Discord
      </button>

      <button type="button"
        onClick={handlePasskeyLogin}
        disabled={passkeyLoading}
        className="w-full py-3 mt-3 bg-white/[0.02] border border-neutral-800 text-neutral-300 text-[11px] tracking-[0.2em] uppercase hover:bg-white/[0.05] hover:border-neutral-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
          <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
        </svg>
        {passkeyLoading ? "Authenticating" : "Sign in with Passkey"}
      </button>

      <p className="mt-8 text-center text-xs text-neutral-500">
        Don't have an account?{" "}
        <a href="/register" className="text-neutral-300 hover:text-white transition-colors underline underline-offset-4">
          Register
        </a>
      </p>
    </div>
  );
}

function getErrorMessage(errorLike: unknown) {
  if (typeof errorLike === "string") return errorLike;
  if (!errorLike || typeof errorLike !== "object") return "";
  return (errorLike as ErrorLike).message || "";
}

function getErrorStatus(errorLike: unknown) {
  if (!errorLike || typeof errorLike !== "object") return 0;
  const error = errorLike as ErrorLike;
  return Number(error.status || error.statusCode || 0);
}

function isServiceUnavailableResponse(response: Response) {
  return response.status >= 500;
}

function isServiceUnavailableError(errorLike: unknown) {
  if (errorLike instanceof ApiUnavailableError) return true;

  const status = getErrorStatus(errorLike);
  if (status >= 500) return true;

  const lower = getErrorMessage(errorLike).toLowerCase();
  return (
    lower.includes("service unavailable") ||
    lower.includes("api service unavailable") ||
    lower.includes("api is not responding") ||
    lower.includes("internal server error") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("fetch failed")
  );
}

function friendlyDiscordError(error: string) {
  const normalized = error.toLowerCase();
  if (normalized.includes("signup_disabled")) {
    return "No account is linked to that Discord login. Create an account first, then link Discord in settings.";
  }
  if (normalized.includes("account_not_linked") || normalized.includes("different_user")) {
    return "That Discord account is not linked to this site account yet.";
  }
  return "Discord sign-in could not be completed. Please try again.";
}
