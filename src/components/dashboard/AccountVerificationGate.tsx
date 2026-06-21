import { useMemo, useState, useSyncExternalStore } from "react";
import { fetchApi, readErrorMessage } from "@/lib/http";

interface AccountVerificationGateProps {
  name?: string | null;
}

export default function AccountVerificationGate({ name }: AccountVerificationGateProps) {
  const search = useSyncExternalStore(subscribeToLocationSearch, getLocationSearch, () => "");
  const searchMessages = useMemo(() => getVerificationMessages(search), [search]);
  const [messages, setMessages] = useState<{ notice: string; error: string } | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);
  const { notice, error } = messages ?? searchMessages;

  const handleLinkDiscord = async () => {
    setMessages({ notice: "", error: "" });
    setDiscordLoading(true);

    try {
      const response = await fetchApi("/api/auth/link-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callbackURL: "/dashboard/verify?discord=linked",
          errorCallbackURL: "/dashboard/verify?discord=error",
          provider: "discord",
        }),
      });

      if (!response.ok) {
        setMessages({ notice: "", error: await readErrorMessage(response, "Failed to start Discord verification.") });
        setDiscordLoading(false);
        return;
      }

      const data = await response.json().catch(() => null) as { url?: string } | null;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setMessages({ notice: "", error: "Unable to connect to Discord right now." });
      setDiscordLoading(false);
    }
  };

  const firstName = name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
      <section className="w-full border border-neutral-800 bg-white/[0.02] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="mb-2 text-[9px] uppercase tracking-[0.3em] text-amber-400">Verification Required</p>
        <h1 className="mb-3 text-xl uppercase tracking-[0.1em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
          Verify your account
        </h1>
        <p className="mb-6 text-xs leading-6 text-neutral-500">
          Hi {firstName}. The dashboard is locked until this account is verified through Discord. Join the club Discord server, then connect your Discord account to continue.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleLinkDiscord}
            disabled={discordLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#5865F2] px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.32 4.37a19.79 19.79 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.89 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.1.25.2.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03z" />
            </svg>
            {discordLoading ? "Connecting" : "Connect Discord"}
          </button>
          <a
            href="/discord"
            className="flex min-h-11 w-full items-center justify-center border border-neutral-700 px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            Join Discord Server
          </a>
        </div>

        <div className="mt-5 border-t border-neutral-800 pt-4">
          <p className="break-words text-[10px] leading-5 text-neutral-600">
            Discord verification checks server membership before unlocking the dashboard and will return you here when complete.
          </p>
        </div>

        {notice && (
          <p className="mt-4 border border-green-900/50 bg-green-950/20 px-4 py-3 text-xs leading-5 text-green-300">{notice}</p>
        )}

        {error && (
          <p className="mt-4 border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">{error}</p>
        )}
      </section>
    </div>
  );
}

function subscribeToLocationSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getLocationSearch() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function getVerificationMessages(search: string) {
  const params = new URLSearchParams(search);
  const created = params.get("created");
  const discordStatus = params.get("discord");
  const authError = params.get("error");
  const authErrorDescription = params.get("error_description");

  let notice = "";
  if (created === "1") {
    notice = "Account created. Join the Discord server, then connect Discord to unlock the dashboard.";
  } else if (discordStatus === "linked") {
    notice = "Discord connected. Refresh the dashboard if you are not redirected automatically.";
  }

  return {
    notice,
    error: discordStatus === "error" || authError ? friendlyDiscordLinkError(authError, authErrorDescription) : "",
  };
}

function friendlyDiscordLinkError(error: string | null, description: string | null) {
  const normalized = `${error || ""} ${description || ""}`.toLowerCase();
  if (
    normalized.includes("discord_guild_membership_required") ||
    normalized.includes("unable_to_link_account") ||
    normalized.includes("linking_failed")
  ) {
    return "Discord could not confirm that account is in the club server. Join the Discord server, then try connecting again.";
  }
  if (normalized.includes("different_user") || normalized.includes("already_linked")) {
    return "That Discord account is already linked to another website account.";
  }
  if (normalized.includes("access_denied")) {
    return "Discord verification was cancelled.";
  }

  return "Discord verification could not be completed. Please try again.";
}
