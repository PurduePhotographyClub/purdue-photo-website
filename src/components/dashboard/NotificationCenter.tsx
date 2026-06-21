import {
  useCallback,
  useEffect,
  useMemo,
  useReducer
} from "react";
import {
  Bell,
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Film,
  FlaskConical,
  Loader2,
  PackageOpen,
  Trash2,
  Trophy,
} from "lucide-react";
import { fetchApi, fetchJson, readErrorMessage } from "@/lib/http";
import {
  patchNotificationReadState,
  revalidateNotificationCaches,
} from "@/lib/notification-cache";
import { keyedStateReducer } from "@/lib/reducer-state";

type NotificationCategory = "competitions" | "dashboard" | "darkroom" | "equipment" | "film" | "studio";

interface NotificationItem {
  body: string;
  category: NotificationCategory;
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
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    totalReturned: number;
    unreadCount: number;
  };
}

type FilterMode = "all" | "unread";
type LoadState = "idle" | "loading" | "updating" | "error";

const PER_PAGE = 8;

const categoryMeta: Record<NotificationCategory, {
  icon: typeof Bell;
  label: string;
  tone: string;
}> = {
  competitions: {
    icon: Trophy,
    label: "Competition",
    tone: "border-amber-700/40 bg-amber-950/20 text-amber-300",
  },
  dashboard: {
    icon: Bell,
    label: "Dashboard",
    tone: "border-neutral-700 bg-white/[0.03] text-neutral-300",
  },
  darkroom: {
    icon: FlaskConical,
    label: "Darkroom",
    tone: "border-cyan-800/50 bg-cyan-950/20 text-cyan-300",
  },
  equipment: {
    icon: PackageOpen,
    label: "Equipment",
    tone: "border-amber-800/50 bg-amber-950/20 text-amber-300",
  },
  film: {
    icon: Film,
    label: "Film",
    tone: "border-emerald-800/50 bg-emerald-950/20 text-emerald-300",
  },
  studio: {
    icon: Camera,
    label: "Studio",
    tone: "border-indigo-800/50 bg-indigo-950/20 text-indigo-300",
  },
};

const emptyMeta: NotificationsResponse["meta"] = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  perPage: PER_PAGE,
  total: 0,
  totalPages: 1,
  totalReturned: 0,
  unreadCount: 0,
};

interface NotificationCenterState {
  filter: FilterMode;
  loadState: LoadState;
  message: string;
  meta: NotificationsResponse["meta"];
  notifications: NotificationItem[];
}

const initialNotificationCenterState: NotificationCenterState = {
  filter: "all",
  loadState: "loading",
  message: "",
  meta: emptyMeta,
  notifications: [],
};

export default function NotificationCenter() {
  const [state, dispatchState] = useReducer(
    keyedStateReducer<NotificationCenterState>,
    initialNotificationCenterState,
  );
  const { filter, loadState, message, meta, notifications } = state;

  const loadNotifications = useCallback(async (nextPage: number) => {
    dispatchState({ type: "patch", value: { loadState: "loading", message: "" } });

    try {
      const response = await fetchJson<NotificationsResponse>(
        `/api/notifications?page=${nextPage}&per_page=${PER_PAGE}`,
      );
      dispatchState({
        type: "patch",
        value: {
          loadState: "idle",
          meta: response.meta,
          notifications: response.notifications,
        },
      });
    } catch (error) {
      dispatchState({
        type: "patch",
        value: {
          loadState: "error",
          message: error instanceof Error ? error.message : "Failed to load notifications.",
        },
      });
    }
  }, []);

  useEffect(() => {
    void loadNotifications(1);
  }, [loadNotifications]);

  const visibleNotifications = useMemo(() => {
    return filter === "unread"
      ? notifications.filter((notification) => !notification.readAt)
      : notifications;
  }, [filter, notifications]);

  const updateReadState = useCallback(async (ids: string[], read = true) => {
    if (ids.length === 0) return;

    dispatchState({ type: "patch", value: { loadState: "updating", message: "" } });
    const readAt = read ? new Date().toISOString() : null;
    const targetIds = new Set(ids);
    const unreadIds = new Set<string>();
    for (const notification of notifications) {
      if (targetIds.has(notification.id) && !notification.readAt) {
        unreadIds.add(notification.id);
      }
    }
    dispatchState({
      type: "set",
      field: "notifications",
      value: (current) => current.map((notification) =>
        ids.includes(notification.id)
          ? { ...notification, readAt }
          : notification,
      ),
    });
    if (read) {
      dispatchState({
        type: "set",
        field: "meta",
        value: (current) => ({
          ...current,
          unreadCount: Math.max(0, current.unreadCount - unreadIds.size),
        }),
      });
    }

    try {
      await patchNotificationReadState({ ids, read });
      await Promise.all([
        loadNotifications(meta.page),
        revalidateNotificationCaches(),
      ]);
    } catch (error) {
      dispatchState({
        type: "set",
        field: "message",
        value: error instanceof Error ? error.message : "Failed to update notifications.",
      });
      await loadNotifications(meta.page);
    }
  }, [loadNotifications, meta.page, notifications]);

  const markAllRead = useCallback(async () => {
    if (meta.unreadCount === 0) return;

    dispatchState({ type: "patch", value: { loadState: "updating", message: "" } });
    const readAt = new Date().toISOString();
    dispatchState({
      type: "set",
      field: "notifications",
      value: (current) =>
        current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })),
    });
    dispatchState({
      type: "set",
      field: "meta",
      value: (current) => ({ ...current, unreadCount: 0 }),
    });

    try {
      await patchNotificationReadState({ all: true, read: true });
      await Promise.all([
        loadNotifications(meta.page),
        revalidateNotificationCaches(),
      ]);
    } catch (error) {
      dispatchState({
        type: "set",
        field: "message",
        value: error instanceof Error ? error.message : "Failed to update notifications.",
      });
      await loadNotifications(meta.page);
    }
  }, [loadNotifications, meta.page, meta.unreadCount]);

  const clearNotifications = useCallback(async (ids: string[], all = false) => {
    if (!all && ids.length === 0) return;

    dispatchState({ type: "patch", value: { loadState: "updating", message: "" } });
    if (!all) {
      dispatchState({
        type: "set",
        field: "notifications",
        value: (current) => current.filter((notification) => !ids.includes(notification.id)),
      });
    }

    try {
      const response = await fetchApi("/api/notifications", {
        body: JSON.stringify(all ? { all: true } : { ids }),
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to clear notifications."));
      }

      await loadNotifications(all ? 1 : meta.page);
      await revalidateNotificationCaches();
    } catch (error) {
      dispatchState({
        type: "set",
        field: "message",
        value: error instanceof Error ? error.message : "Failed to clear notifications.",
      });
      await loadNotifications(meta.page);
    }
  }, [loadNotifications, meta.page]);

  const isBusy = loadState === "loading" || loadState === "updating";

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-5 border-b border-neutral-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[9px] uppercase tracking-[0.3em] text-neutral-600">Dashboard</p>
          <h1 className="text-2xl uppercase tracking-[0.08em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
            Notifications
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-2 border border-neutral-800">
            {(["all", "unread"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => dispatchState({ type: "set", field: "filter", value: mode })}
                className={`min-w-24 px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  filter === mode
                    ? "bg-white/[0.07] text-white"
                    : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200"
                }`}
              >
                {mode === "all" ? "All" : meta.unreadCount > 0 ? `Unread ${meta.unreadCount}` : "Unread"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={meta.unreadCount === 0 || isBusy}
            className="inline-flex items-center gap-2 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={13} aria-hidden="true" />
            Mark all read
          </button>

          <button
            type="button"
            onClick={() => void clearNotifications([], true)}
            disabled={meta.total === 0 || isBusy}
            className="inline-flex items-center gap-2 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:border-red-900/70 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={13} aria-hidden="true" />
            Clear all
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-5 border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs text-red-300">
          {message}
        </p>
      )}

      {loadState === "loading" && (
        <div className="flex items-center gap-3 border border-neutral-800 bg-white/[0.02] px-4 py-5 text-xs text-neutral-500">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          Loading notifications
        </div>
      )}

      {loadState !== "loading" && visibleNotifications.length === 0 && (
        <div className="border border-neutral-800 bg-white/[0.02] px-5 py-8">
          <Bell size={18} className="mb-3 text-neutral-600" aria-hidden="true" />
          <p className="text-sm text-neutral-300">
            {filter === "unread" ? "No unread notifications on this page" : "No notifications yet"}
          </p>
        </div>
      )}

      {loadState !== "loading" && visibleNotifications.length > 0 && (
        <ul className="divide-y divide-neutral-800 border border-neutral-800">
          {visibleNotifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onClear={clearNotifications}
              onMarkRead={updateReadState}
            />
          ))}
        </ul>
      )}

      {loadState !== "loading" && meta.total > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadNotifications(Math.max(1, meta.page - 1))}
              disabled={!meta.hasPreviousPage || isBusy}
              className="inline-flex items-center gap-2 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={13} aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => void loadNotifications(Math.min(meta.totalPages, meta.page + 1))}
              disabled={!meta.hasNextPage || isBusy}
              className="inline-flex items-center gap-2 border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function NotificationRow({
  notification,
  onClear,
  onMarkRead,
}: {
  notification: NotificationItem;
  onClear: (ids: string[], all?: boolean) => Promise<void>;
  onMarkRead: (ids: string[], read?: boolean) => Promise<void>;
}) {
  const meta = categoryMeta[notification.category];
  const Icon = meta.icon;
  const isUnread = !notification.readAt;

  return (
    <li className={`bg-neutral-950 transition-colors ${isUnread ? "bg-white/[0.025]" : ""}`}>
      <div className="grid gap-4 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:grid-cols-[auto_1fr_auto]">
        <a
          href={notification.href}
          onClick={() => {
            if (isUnread) {
              void onMarkRead([notification.id]);
            }
          }}
          className={`flex h-10 w-10 shrink-0 items-center justify-center border ${meta.tone}`}
          aria-label={`Open ${notification.title}`}
        >
          <Icon size={17} aria-hidden="true" />
        </a>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${meta.tone}`}>
              {meta.label}
            </span>
            {isUnread && (
              <span className="border border-amber-700/60 bg-amber-950/30 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-amber-300">
                Unread
              </span>
            )}
          </div>
          <a
            href={notification.href}
            onClick={() => {
              if (isUnread) {
                void onMarkRead([notification.id]);
              }
            }}
            className="block"
          >
            <p className="text-sm leading-snug text-neutral-100 transition-colors hover:text-white">{notification.title}</p>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-500">{notification.body}</p>
          </a>
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <time className="text-[10px] uppercase tracking-[0.14em] text-neutral-600" dateTime={notification.createdAt}>
            {formatNotificationTime(notification.createdAt)}
          </time>
          {isUnread && (
            <button
              type="button"
              onClick={() => void onMarkRead([notification.id])}
              className="p-2 text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
              aria-label={`Mark ${notification.title} as read`}
            >
              <Check size={14} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void onClear([notification.id])}
            className="p-2 text-red-300 transition-colors hover:bg-red-950/20 hover:text-red-100"
            aria-label={`Clear ${notification.title}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
