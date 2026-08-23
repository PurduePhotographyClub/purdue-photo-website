export interface TotpEnrollment {
  backupCodes: string[];
  totpURI: string;
}

function isBackupCodeList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function readTotpEnrollment(
  data: unknown,
): TotpEnrollment | null {
  if (!data || typeof data !== "object") return null;

  const enrollment = data as {
    backupCodes?: unknown;
    method?: unknown;
    totpURI?: unknown;
  };

  // Better Auth 1.7 adds a `method` discriminator; older responses returned only the TOTP fields.
  if (enrollment.method != null && enrollment.method !== "totp") return null;
  if (typeof enrollment.totpURI !== "string" || !isBackupCodeList(enrollment.backupCodes)) return null;

  return {
    backupCodes: [...enrollment.backupCodes],
    totpURI: enrollment.totpURI,
  };
}
