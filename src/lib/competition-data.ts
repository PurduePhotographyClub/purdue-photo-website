export interface CompetitionPageMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CompetitionPage<T> {
  competitions: T[];
  legacy: boolean;
  meta: CompetitionPageMeta;
}

interface CompetitionPageFallback {
  page: number;
  perPage: number;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasCompetitionPageMeta(value: unknown): value is CompetitionPageMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const meta = value as Partial<CompetitionPageMeta>;
  return typeof meta.hasNextPage === "boolean" &&
    typeof meta.hasPreviousPage === "boolean" &&
    isPositiveInteger(meta.page) &&
    isPositiveInteger(meta.perPage) &&
    typeof meta.total === "number" &&
    Number.isSafeInteger(meta.total) &&
    meta.total >= 0 &&
    isPositiveInteger(meta.totalPages);
}

export function normalizeCompetitionPage<T>(
  value: unknown,
  fallback: CompetitionPageFallback,
): CompetitionPage<T> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const page = value as Partial<CompetitionPage<T>>;
    if (Array.isArray(page.competitions) && hasCompetitionPageMeta(page.meta)) {
      return {
        competitions: page.competitions,
        legacy: false,
        meta: page.meta,
      };
    }
  }

  const competitions = Array.isArray(value) ? value as T[] : [];
  const hasNextPage = competitions.length === fallback.perPage;
  const total = ((fallback.page - 1) * fallback.perPage) +
    competitions.length +
    (hasNextPage ? 1 : 0);

  return {
    competitions,
    legacy: true,
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

export function normalizeCompetitionPageForUrl<T>(
  value: unknown,
  url: string,
  defaultPerPage: number,
): CompetitionPage<T> {
  const requestUrl = new URL(url, "https://competitions.local");
  const requestedPage = Number(requestUrl.searchParams.get("page"));
  const requestedPerPage = Number(requestUrl.searchParams.get("per_page"));

  return normalizeCompetitionPage<T>(value, {
    page: isPositiveInteger(requestedPage) ? requestedPage : 1,
    perPage: isPositiveInteger(requestedPerPage) ? requestedPerPage : defaultPerPage,
  });
}
