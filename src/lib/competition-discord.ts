export const DISCORD_GUILD_ID = "1182061172309106708";

export const STATUS_LABELS = {
  closed: "Ended",
  draft: "Draft",
  judging: "Voting",
  open: "Open for entries",
} as const;

export const STATUS_ACTION_LABELS = {
  closed: "End Competition",
  draft: "Draft",
  judging: "Start Voting",
  open: "Open Entries",
} as const;

export function getCompetitionDiscordUrl(channelId: string | null | undefined) {
  return channelId
    ? `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`
    : null;
}
