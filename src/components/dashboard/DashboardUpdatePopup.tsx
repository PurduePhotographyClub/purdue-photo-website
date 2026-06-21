import { useState } from "react";
import useSWR from "swr";
import { Bell, X } from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage
} from "@/lib/http";

interface DashboardUpdate {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface DashboardUpdateResponse {
  update?: DashboardUpdate | null;
  updates?: DashboardUpdate[];
}

type DismissState = "idle" | "loading" | "error";

export default function DashboardUpdatePopup() {
  const { data, mutate } = useSWR<DashboardUpdateResponse>("/api/dashboard/update", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const update = data?.update ?? null;
  const [dismissState, setDismissState] = useState<DismissState>("idle");
  const [error, setError] = useState("");

  const dismissUpdate = async () => {
    if (!update || dismissState === "loading") return;

    setDismissState("loading");
    setError("");

    try {
      const res = await fetchApi("/api/dashboard/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId: update.id }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Could not close update."));
      }

      void mutate((current) => current ? { ...current, update: null } : { update: null }, { revalidate: false });
      setDismissState("idle");
    } catch (err) {
      setDismissState("error");
      setError(err instanceof Error ? err.message : "Could not close update.");
    }
  };

  if (!update) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-[120] m-0 flex h-dvh max-h-none w-dvw max-w-none items-center justify-center bg-black/85 px-4 py-8 backdrop:bg-transparent"
      aria-labelledby="dashboard-update-title"
      onCancel={(event) => {
        event.preventDefault();
        void dismissUpdate();
      }}
    >
      <div className="relative max-h-[calc(100vh-4rem)] w-full max-w-xl overflow-y-auto border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/70">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative flex items-start justify-between gap-4 border-b border-neutral-800/80 px-5 py-4">
          <div className="flex items-start gap-3">
            <div>
              <p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-neutral-500">
                <Bell size={12} />
                PPC Dashboard
              </p>
              <h2
                id="dashboard-update-title"
                className="mt-1 text-xl leading-snug text-neutral-100"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {update.title}
              </h2>
            </div>
          </div>
          <button type="button"
            onClick={() => void dismissUpdate()}
            disabled={dismissState === "loading"}
            className="p-1 text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close dashboard update"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative space-y-5 p-5">
          <MarkdownMessage value={update.message} />
          <p className="border-t border-neutral-800/70 pt-4 text-[10px] uppercase tracking-[0.16em] text-neutral-600">
            Sent {new Date(update.createdAt).toLocaleDateString()}
          </p>

          {error && (
            <p className="text-[10px] tracking-wider text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
