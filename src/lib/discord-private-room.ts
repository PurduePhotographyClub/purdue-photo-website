export type PrivateRoomDiscordSyncStatus =
  | "archived"
  | "failed"
  | "pending"
  | "synced";

export function getPrivateRoomSyncLabel(status: PrivateRoomDiscordSyncStatus) {
  return status === "archived" ? "deleted" : status;
}
