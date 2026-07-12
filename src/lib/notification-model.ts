export const NOTIFICATION_CATEGORY_LABELS = {
  competitions: "Competition",
  dashboard: "Dashboard",
  darkroom: "Darkroom",
  equipment: "Equipment",
  film: "Film",
  studio: "Studio",
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORY_LABELS;

export interface NotificationItem {
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

export interface RecentNotificationsResponse {
  notifications: NotificationItem[];
  meta: {
    unreadCount: number;
  };
}

export function getNotificationCategoryLabel(category: string) {
  if (Object.prototype.hasOwnProperty.call(NOTIFICATION_CATEGORY_LABELS, category)) {
    return NOTIFICATION_CATEGORY_LABELS[category as NotificationCategory];
  }

  return "Update";
}
