import { mutate as mutateGlobal } from "swr";
import { fetchApi, readErrorMessage } from "@/lib/http";

const NOTIFICATIONS_API_URL = "/api/notifications";

export const RECENT_NOTIFICATIONS_URL = `${NOTIFICATIONS_API_URL}?page=1&per_page=3`;

interface PatchNotificationReadStateOptions {
  all?: boolean;
  ids?: string[];
  keepalive?: boolean;
  read?: boolean;
}

export function revalidateNotificationCaches() {
  return mutateGlobal((key) => typeof key === "string" && key.startsWith(NOTIFICATIONS_API_URL));
}

export async function patchNotificationReadState({
  all = false,
  ids = [],
  keepalive = false,
  read = true,
}: PatchNotificationReadStateOptions) {
  if (!all && ids.length === 0) return;

  const response = await fetchApi(NOTIFICATIONS_API_URL, {
    body: JSON.stringify(all ? { all: true, read } : { ids, read }),
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepalive,
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update notifications."));
  }
}
