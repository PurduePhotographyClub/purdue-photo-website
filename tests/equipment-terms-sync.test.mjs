import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardSource = await readFile(
  new URL("../src/components/dashboard/EquipmentDashboard.tsx", import.meta.url),
  "utf8",
);

test("equipment terms revalidate after an external Discord decision without polling accepted members", () => {
  assert.match(
    dashboardSource,
    /const EQUIPMENT_TERMS_REFRESH_INTERVAL_MS\s*=\s*([1-9]|[12]\d|30)_000;/,
    "pending equipment terms should use a short refresh interval of 1–30 seconds",
  );
  assert.match(dashboardSource, /revalidateOnFocus:\s*true/);
  assert.match(dashboardSource, /revalidateOnReconnect:\s*true/);
  assert.match(dashboardSource, /refreshWhenHidden:\s*false/);
  assert.match(dashboardSource, /dedupingInterval:\s*5_000/);
  assert.match(dashboardSource, /focusThrottleInterval:\s*5_000/);
  assert.match(
    dashboardSource,
    /refreshInterval:\s*\([^)]*\)\s*=>[\s\S]{0,180}isAccepted\s*===\s*true\s*\?\s*0\s*:\s*EQUIPMENT_TERMS_REFRESH_INTERVAL_MS/,
    "the terms request should stop polling as soon as the accepted status arrives",
  );
  assert.match(
    dashboardSource,
    /useSWR<EquipmentTermsResponse>\([\s\S]{0,180}EQUIPMENT_TERMS_SWR_OPTIONS\)/,
    "the terms endpoint should use its live revalidation options",
  );
});

test("equipment terms warning shows the Discord channel name instead of its ID", () => {
  assert.match(
    dashboardSource,
    /const EQUIPMENT_TERMS_CHANNEL_LABEL\s*=\s*"#terms";/,
  );
  assert.match(
    dashboardSource,
    />\{EQUIPMENT_TERMS_CHANNEL_LABEL\}<\/span>/,
  );
  assert.doesNotMatch(
    dashboardSource,
    /1512505024792760421/,
    "the dashboard must not display or duplicate the Discord channel ID",
  );
  assert.doesNotMatch(dashboardSource, /officers can repost it/i);
  assert.doesNotMatch(dashboardSource, /equipment-terms-message/);
});
