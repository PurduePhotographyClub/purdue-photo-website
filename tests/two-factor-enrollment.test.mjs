import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { readTotpEnrollment } = await import("../src/lib/two-factor-enrollment.ts");
const settingsSource = await readFile(
  new URL("../src/components/dashboard/SettingsPanel.tsx", import.meta.url),
  "utf8",
);

test("settings requests TOTP and guards Better Auth's 1.7 response union", () => {
  assert.match(settingsSource, /readTotpEnrollment/);
  assert.match(settingsSource, /method:\s*"totp"/);
  assert.match(settingsSource, /Authenticator setup did not return the required details/);
});

test("TOTP enrollment exposes a copied URI and backup-code list", () => {
  const backupCodes = ["first-code", "second-code"];

  const enrollment = readTotpEnrollment({
    method: "totp",
    totpURI: "otpauth://totp/PurduePhotographyClub",
    backupCodes,
  });

  assert.deepEqual(enrollment, {
    totpURI: "otpauth://totp/PurduePhotographyClub",
    backupCodes,
  });
  assert.notEqual(enrollment?.backupCodes, backupCodes);
});

test("legacy TOTP enrollment responses still work during mixed-version rollouts", () => {
  const backupCodes = ["legacy-code"];

  const enrollment = readTotpEnrollment({
    totpURI: "otpauth://totp/PurduePhotographyClub?legacy=true",
    backupCodes,
  });

  assert.deepEqual(enrollment, {
    totpURI: "otpauth://totp/PurduePhotographyClub?legacy=true",
    backupCodes,
  });
  assert.notEqual(enrollment?.backupCodes, backupCodes);
});

test("OTP-only responses do not masquerade as TOTP enrollment", () => {
  assert.equal(readTotpEnrollment({ method: "otp" }), null);
  assert.equal(readTotpEnrollment(null), null);
  assert.equal(readTotpEnrollment(undefined), null);
  assert.equal(
    readTotpEnrollment({ method: "totp", totpURI: 42, backupCodes: ["ok"] }),
    null,
  );
  assert.equal(
    readTotpEnrollment({
      method: "totp",
      totpURI: "otpauth://totp/PurduePhotographyClub",
      backupCodes: [123],
    }),
    null,
  );
});
