import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Bell, ChevronRight, Circle } from "lucide-react";
import { fetchJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";
import {
  patchNotificationReadState,
  RECENT_NOTIFICATIONS_URL,
  revalidateNotificationCaches,
} from "@/lib/notification-cache";

interface NotificationItem {
  body: string;
  category: "competitions" | "dashboard" | "darkroom" | "film" | "studio";
  createdAt: string;
  href: string;
  id: string;
  priority: "high" | "normal";
  readAt: string | null;
  title: string;
  type: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  meta: {
    unreadCount: number;
  };
}

type DashboardNotificationBellPlacement = "floating" | "inline";

interface DashboardNotificationBellProps {
  placement?: DashboardNotificationBellPlacement;
}

const categoryLabels: Record<NotificationItem["category"], string> = {
  competitions: "Competition",
  dashboard: "Dashboard",
  darkroom: "Darkroom",
  film: "Film",
  studio: "Studio",
};

export default function DashboardNotificationBell({
  placement = "floating",
}: DashboardNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInline = placement === "inline";
  const popoverId = `dashboard-notifications-popover-${placement}`;
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    RECENT_NOTIFICATIONS_URL,
    fetchJson,
    {
      ...PUBLIC_API_SWR_OPTIONS,
      refreshInterval: 60_000,
    },
  );
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.meta.unreadCount ?? 0;
  const containerClassName = isInline
    ? "relative shrink-0"
    : "fixed right-4 top-4 z-[65] md:right-6 md:top-6";
  const buttonClassName = isInline
    ? "relative flex h-9 w-9 items-center justify-center border border-neutral-800 bg-neutral-950/70 text-neutral-400 backdrop-blur transition-colors hover:border-neutral-700 hover:text-white"
    : "relative flex h-10 w-10 items-center justify-center border border-neutral-800 bg-neutral-950/90 text-neutral-400 shadow-xl shadow-black/40 backdrop-blur transition-colors hover:border-neutral-700 hover:text-white";
  const popoverClassName = isInline
    ? "fixed right-4 top-[4.75rem] z-20 w-[min(calc(100vw-2rem),22rem)] border border-neutral-700 bg-neutral-950 shadow-2xl shadow-black/70"
    : "absolute right-0 top-12 w-[min(calc(100vw-2rem),22rem)] border border-neutral-700 bg-neutral-950 shadow-2xl shadow-black/70";

  const markRecentNotificationRead = async (notification: NotificationItem) => {
    if (notification.readAt) return;

    const readAt = new Date().toISOString();
    void mutate((current) => current
      ? {
          ...current,
          meta: {
            ...current.meta,
            unreadCount: Math.max(0, current.meta.unreadCount - 1),
          },
          notifications: current.notifications.map((item) =>
            item.id === notification.id ? { ...item, readAt } : item,
          ),
        }
      : current, { revalidate: false });

    try {
      await patchNotificationReadState({
        ids: [notification.id],
        keepalive: true,
        read: true,
      });
      await revalidateNotificationCaches();
    } catch {
      await mutate();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={containerClassName}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={buttonClassName}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        aria-controls={popoverId}
      >
        <Bell size={17} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(120,53,15,0.35)]" />
        )}
      </button>

      {isOpen && (
        <div
          id={popoverId}
          className={popoverClassName}
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Bell size={15} className="shrink-0 text-neutral-400" aria-hidden="true" />
              <p className="truncate text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                Notifications
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="min-w-6 shrink-0 border border-amber-700/70 bg-amber-950/40 px-1.5 py-0.5 text-center text-[9px] leading-none text-amber-300">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <div className="grid min-h-32">
            {isLoading && (
              <p className="px-4 py-4 text-[10px] leading-relaxed text-neutral-600">Loading recent updates</p>
            )}

            {!isLoading && error && (
              <p className="px-4 py-4 text-[10px] leading-relaxed text-red-400">Notifications unavailable</p>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <p className="px-4 py-4 text-[10px] leading-relaxed text-neutral-600">No notifications yet</p>
            )}

            {!isLoading && !error && notifications.length > 0 && (
              <ul className="divide-y divide-neutral-800/80">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <a
                      href={notification.href}
                      onClick={() => {
                        void markRecentNotificationRead(notification);
                      }}
                      className="group block px-4 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start gap-3">
                        <Circle
                          size={8}
                          className={`mt-1.5 shrink-0 ${notification.readAt ? "fill-neutral-700 text-neutral-700" : "fill-amber-400 text-amber-400"}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs leading-snug text-neutral-200 group-hover:text-white">
                            {notification.title}
                          </p>
                          <p className="mt-2 truncate text-[9px] uppercase tracking-[0.18em] text-neutral-600">
                            {categoryLabels[notification.category]}
                          </p>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <a
            href="/dashboard/notifications"
            className="flex items-center justify-between border-t border-neutral-800 px-4 py-3 text-[9px] uppercase tracking-[0.22em] text-neutral-500 transition-colors hover:bg-white/[0.03] hover:text-white"
          >
            View more
            <ChevronRight size={14} aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
