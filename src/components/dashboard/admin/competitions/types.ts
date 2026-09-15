export type CompetitionStatus = "draft" | "open" | "judging" | "closed";

export interface CompetitionResult {
  id: string;
  entryId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  place: 1 | 2 | 3;
  entryTitle: string | null;
  entryDescription: string | null;
  medium: "film" | "digital" | null;
  userId: string | null;
  pairedUserId: string | null;
  photographerName: string | null;
  photographerInstagram: string | null;
  discordEntryId: string | null;
}

export interface Competition {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  status: CompetitionStatus;
  submissionDeadline: string | null;
  createdAt: string;
  results?: CompetitionResult[];
  discordForumChannelId: string | null;
  discordSyncStatus: "pending" | "synced" | "failed";
  discordSyncError: string | null;
}

export interface CompetitionDiscordEntry {
  id: string;
  attachmentUrl: string;
  description: string;
  discordDisplayName: string | null;
  discordPostUrl: string;
  discordUserId: string;
  submittedAt: string;
  title: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export const STATUS_TRANSITIONS: Record<CompetitionStatus, CompetitionStatus | null> = {
  draft: "open",
  open: "judging",
  judging: "closed",
  closed: null,
};

export const adminCompetitionStatusColor: Record<CompetitionStatus, string> = {
  draft: "text-neutral-500",
  open: "text-green-400",
  judging: "text-yellow-500",
  closed: "text-neutral-500",
};

export const emptyResultForm = {
  discordEntryId: "",
  place: "1",
  title: "",
  photographerName: "",
  photographerInstagram: "",
  description: "",
  medium: "digital" as "film" | "digital",
  userId: "",
};

export type ResultFormState = typeof emptyResultForm;
