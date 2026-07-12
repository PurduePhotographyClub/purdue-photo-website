import { useEffect, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { Bell, ChevronRight, Circle, ExternalLink, Loader2, Megaphone, X } from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import { fetchJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";
import {
  patchNotificationReadState,
  RECENT_NOTIFICATIONS_URL,
} from "@/lib/notification-cache";
import {
  getNotificationCategoryLabel,
  type NotificationItem,
  type RecentNotificationsResponse,
} from "@/lib/notification-model";

interface DashboardUpdate {
  id: string;
  isActive?: number;
  title: string;
  message: string;
  createdAt: string;
}

interface DashboardUpdateResponse {
  update?: DashboardUpdate | null;
  updates?: DashboardUpdate[];
}

export default function DashboardHomePanels() {
  const [selectedUpdate, setSelectedUpdate] = useState<DashboardUpdate | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const pendingReadIdsRef = useRef(new Set<string>());
  const {
    data: updateData,
    error: updateError,
    isLoading: updateLoading,
  } = useSWR<DashboardUpdateResponse>("/api/dashboard/update", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const {
    data: notificationsData,
    error: notificationsError,
    isLoading: notificationsLoading,
    mutate: mutateNotifications,
  } = useSWR<RecentNotificationsResponse>(RECENT_NOTIFICATIONS_URL, fetchJson, {
    ...PUBLIC_API_SWR_OPTIONS,
    errorRetryCount: 3,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const updates = updateData?.updates ?? [];
  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.meta.unreadCount ?? 0;

  const markRecentNotificationRead = async (notification: NotificationItem) => {
    if (notification.readAt || pendingReadIdsRef.current.has(notification.id)) return;

    pendingReadIdsRef.current.add(notification.id);

    const readAt = new Date().toISOString();
    void mutateNotifications((current) => current
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
        read: true,
      });
    } catch {
      await mutateNotifications();
    } finally {
      pendingReadIdsRef.current.delete(notification.id);
    }
  };

  const openNotification = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    void markRecentNotificationRead(notification);
  };

  return (
    <>
      <section className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article>
          <div className="mb-3 border border-neutral-800/80 bg-white/[0.02] px-4 py-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">Dashboard announcements</p>
                <h2 className="mt-2 text-lg tracking-[0.08em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Club updates
                </h2>
              </div>
              <span className="hidden text-neutral-600 sm:block">
                <Megaphone size={16} aria-hidden="true" />
              </span>
            </div>
          </div>

          {updateLoading && (
            <div className="flex items-center gap-3 py-8 text-xs text-neutral-500">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Loading announcements
            </div>
          )}

          {!updateLoading && updateError && (
            <p className="border-l border-red-800/70 pl-4 text-xs leading-6 text-red-300">
              Dashboard announcements are unavailable.
            </p>
          )}

          {!updateLoading && !updateError && updates.length === 0 && (
            <div className="py-8">
              <p className="text-sm text-neutral-300">No dashboard announcements yet.</p>
              <p className="mt-3 max-w-2xl text-[10px] leading-5 tracking-wider text-neutral-600">
                New club-wide notes will appear here when officers post them.
              </p>
            </div>
          )}

          {!updateLoading && !updateError && updates.length > 0 && (
            <div
              className="max-h-64 overflow-y-auto overscroll-contain pr-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-700"
              aria-label="Dashboard announcement history"
            >
              <ul className="divide-y divide-neutral-800/80 border-y border-neutral-800/80">
                {updates.map((update) => (
                  <li key={update.id}>
                    <button
                      type="button"
                      className="group grid min-h-16 w-full items-center gap-3 py-3 text-left transition-colors hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_auto]"
                      onClick={() => setSelectedUpdate(update)}
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-sm leading-6 text-neutral-100 transition-colors group-hover:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {update.title}
                        </span>
                        <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${
                          update.isActive
                            ? "border-emerald-800/60 text-emerald-300"
                            : "border-neutral-800 text-neutral-600"
                        }`}>
                          {update.isActive ? "Active" : "Past"}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 text-[9px] uppercase tracking-[0.16em] text-neutral-600 sm:justify-end">
                        <time dateTime={update.createdAt}>
                          {formatDate(update.createdAt)}
                        </time>
                        <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-neutral-800/80 pb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">Notifications</p>
              <h2 className="mt-2 text-lg tracking-[0.08em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                Recent
              </h2>
            </div>
            {unreadCount > 0 && (
              <span className="border border-amber-700/70 bg-amber-950/40 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-amber-300">
                {unreadCount > 99 ? "99+" : unreadCount} unread
              </span>
            )}
          </div>

          {notificationsLoading && (
            <div className="flex items-center gap-3 py-6 text-xs text-neutral-500">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Loading notifications
            </div>
          )}

          {!notificationsLoading && notificationsError && notifications.length === 0 && (
            <p role="alert" className="border-l border-red-800/70 pl-4 text-xs leading-6 text-red-300">
              Notifications are unavailable.
            </p>
          )}

          {!notificationsLoading && !notificationsError && notifications.length === 0 && (
            <div className="py-6">
              <Bell size={16} className="mb-3 text-neutral-600" aria-hidden="true" />
              <p className="text-sm text-neutral-300">No notifications yet.</p>
            </div>
          )}

          {!notificationsLoading && notifications.length > 0 && (
            <div
              className="max-h-80 overflow-y-auto overscroll-contain pr-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-700"
              aria-label="Recent notifications"
            >
              <ul className="divide-y divide-neutral-800/80 border-y border-neutral-800/80">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="group block min-h-20 w-full py-3 text-left transition-colors hover:bg-white/[0.025]"
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
                          <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-neutral-600">
                            {notification.body}
                          </p>
                          <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-neutral-700">
                            {getNotificationCategoryLabel(notification.category)} / {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!notificationsLoading && notificationsError && notifications.length > 0 && (
            <p role="status" className="mt-3 text-[10px] text-amber-300">
              Showing saved notifications while updates reconnect.
            </p>
          )}

          <a
            href="/dashboard/notifications"
            className="mt-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
          >
            Open notification center
            <ChevronRight size={14} aria-hidden="true" />
          </a>
        </article>
      </section>

      {selectedUpdate && (
        <DashboardUpdateDialog update={selectedUpdate} onClose={() => setSelectedUpdate(null)} />
      )}

      {selectedNotification && (
        <NotificationDialog notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
      )}
    </>
  );
}

interface ModalShellProps {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
}

function ModalShell({ children, labelledBy, onClose }: ModalShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[130] m-0 flex h-dvh max-h-none w-dvw max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent px-4 py-8 text-neutral-100 backdrop:bg-black/80"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        tabIndex={-1}
        className="fixed inset-0 cursor-default bg-black/80"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/70 focus:outline-none"
      >
        {children}
      </div>
    </dialog>
  );
}

interface DashboardUpdateDialogProps {
  update: DashboardUpdate;
  onClose: () => void;
}

function DashboardUpdateDialog({ update, onClose }: DashboardUpdateDialogProps) {
  const titleId = `dashboard-update-dialog-${update.id}`;

  return (
    <ModalShell labelledBy={titleId} onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-neutral-800/80 px-5 py-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">
            Dashboard announcement
          </p>
          <h2
            id={titleId}
            className="mt-1 text-xl leading-snug text-neutral-100"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {update.title}
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-600">
            {update.isActive ? "Active" : "Past"} / {formatDate(update.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
          aria-label="Close announcement"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="p-5">
        <MarkdownMessage value={update.message} />
      </div>
    </ModalShell>
  );
}

interface NotificationDialogProps {
  notification: NotificationItem;
  onClose: () => void;
}

function NotificationDialog({ notification, onClose }: NotificationDialogProps) {
  const titleId = `notification-dialog-${notification.id}`;

  return (
    <ModalShell labelledBy={titleId} onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-neutral-800/80 px-5 py-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">
            {getNotificationCategoryLabel(notification.category)} notification
          </p>
          <h2
            id={titleId}
            className="mt-1 text-xl leading-snug text-neutral-100"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {notification.title}
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-600">
            {formatDate(notification.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
          aria-label="Close notification"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-300">
          {notification.body}
        </p>

        {notification.href && (
          <a
            href={notification.href}
            className="inline-flex items-center gap-2 border border-neutral-800 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Open related page
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>
    </ModalShell>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
