export const ADMIN_MEMBERS_PAGE_SIZE = 20;

export interface AdminMember {
  activatedAt: string | null;
  createdAt: string;
  discordId: string | null;
  email: string;
  id: string;
  membershipExpiresAt: string | null;
  name: string;
  profileEnabled: boolean;
  profileUsername: string | null;
  role: string;
  suspendedUntil: string | null;
  tier: string | null;
}

export interface AdminMembersPageMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminMembersPage<T = AdminMember> {
  legacy: boolean;
  members: T[];
  meta: AdminMembersPageMeta;
}

interface AdminMembersPageFallback {
  page: number;
  perPage: number;
}

interface BuildAdminMembersUrlOptions {
  discordLinked?: boolean;
  excludeSuspended?: boolean;
  page: number;
  perPage?: number;
  role?: string;
  status?: string;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasAdminMembersPageMeta(value: unknown): value is AdminMembersPageMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const meta = value as Partial<AdminMembersPageMeta>;
  return typeof meta.hasNextPage === "boolean" &&
    typeof meta.hasPreviousPage === "boolean" &&
    isPositiveInteger(meta.page) &&
    isPositiveInteger(meta.perPage) &&
    typeof meta.total === "number" &&
    Number.isSafeInteger(meta.total) &&
    meta.total >= 0 &&
    isPositiveInteger(meta.totalPages);
}

export function normalizeAdminMembersPage<T>(
  value: unknown,
  fallback: AdminMembersPageFallback,
): AdminMembersPage<T> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const page = value as Partial<AdminMembersPage<T>>;
    if (Array.isArray(page.members) && hasAdminMembersPageMeta(page.meta)) {
      return { legacy: false, members: page.members, meta: page.meta };
    }
  }

  const members = Array.isArray(value) ? value as T[] : [];
  const hasNextPage = members.length === fallback.perPage;
  const total = ((fallback.page - 1) * fallback.perPage) +
    members.length +
    (hasNextPage ? 1 : 0);

  return {
    legacy: true,
    members,
    meta: {
      hasNextPage,
      hasPreviousPage: fallback.page > 1,
      page: fallback.page,
      perPage: fallback.perPage,
      total,
      totalPages: fallback.page + (hasNextPage ? 1 : 0),
    },
  };
}

export function normalizeAdminMembersPageForUrl<T>(
  value: unknown,
  url: string,
  defaultPerPage = ADMIN_MEMBERS_PAGE_SIZE,
) {
  const requestUrl = new URL(url, "https://admin-members.local");
  const requestedPage = Number(requestUrl.searchParams.get("page"));
  const requestedPerPage = Number(requestUrl.searchParams.get("per_page"));
  return normalizeAdminMembersPage<T>(value, {
    page: isPositiveInteger(requestedPage) ? requestedPage : 1,
    perPage: isPositiveInteger(requestedPerPage) ? requestedPerPage : defaultPerPage,
  });
}

export function buildAdminMembersUrl({
  discordLinked = false,
  excludeSuspended = false,
  page,
  perPage = ADMIN_MEMBERS_PAGE_SIZE,
  role = "all",
  status = "all",
}: BuildAdminMembersUrlOptions) {
  const searchParams = new URLSearchParams({
    format: "page",
    page: String(page),
    per_page: String(perPage),
  });
  if (role && role !== "all") searchParams.set("role", role);
  if (status && status !== "all") searchParams.set("status", status);
  if (discordLinked) searchParams.set("discord_linked", "true");
  if (excludeSuspended) searchParams.set("exclude_suspended", "true");
  return `/api/admin/members?${searchParams.toString()}`;
}
