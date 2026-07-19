export interface PublicProfileStatistics {
  clubTenureMonths: number | null;
  competitionTopThreePlacements: number | null;
  photographs: number;
}

const EMPTY_PUBLIC_PROFILE_STATISTICS: PublicProfileStatistics = {
  clubTenureMonths: null,
  competitionTopThreePlacements: 0,
  photographs: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function readNullableCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function normalizePublicProfileStatistics(
  value: unknown,
  anonymous: boolean,
): PublicProfileStatistics {
  const statistics = isRecord(value) ? value : {};
  const photographs = readCount(statistics.photographs);

  if (anonymous) {
    return {
      clubTenureMonths: null,
      competitionTopThreePlacements: null,
      photographs,
    };
  }

  return {
    clubTenureMonths: readNullableCount(statistics.clubTenureMonths),
    competitionTopThreePlacements: readCount(statistics.competitionTopThreePlacements),
    photographs,
  };
}

export function formatClubTenure(months: number | null) {
  if (months === null) return "Not available";
  if (months < 1) return "New member";
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export function createEmptyPublicProfileStatistics() {
  return { ...EMPTY_PUBLIC_PROFILE_STATISTICS };
}
