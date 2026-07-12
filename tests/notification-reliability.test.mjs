import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notification category metadata is shared and includes equipment", async () => {
  const [modelSource, bellSource, homeSource, centerSource] = await Promise.all([
    readFile(new URL("../src/lib/notification-model.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardNotificationBell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardHomePanels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/NotificationCenter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(modelSource, /equipment:\s*"Equipment"/);
  assert.match(modelSource, /return\s+"Update"/);
  for (const source of [bellSource, homeSource, centerSource]) {
    assert.match(source, /@\/lib\/notification-model/);
  }
});

test("notification mutations survive navigation and avoid redundant success reloads", async () => {
  const [cacheSource, centerSource] = await Promise.all([
    readFile(new URL("../src/lib/notification-cache.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/NotificationCenter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(cacheSource, /keepalive\s*=\s*true/);
  assert.match(centerSource, /recoverFromMutationError/);
  assert.match(centerSource, /mutationInFlightRef/);
  assert.doesNotMatch(
    centerSource,
    /await Promise\.all\(\[\s*loadNotifications\(meta\.page/,
  );
});

test("unread filtering is requested from the paginated API", async () => {
  const centerSource = await readFile(
    new URL("../src/components/dashboard/NotificationCenter.tsx", import.meta.url),
    "utf8",
  );

  assert.match(centerSource, /filter=unread/);
  assert.match(centerSource, /loadNotifications\([^)]*filter/);
  assert.match(centerSource, /aria-pressed=\{filter === mode\}/);
});

test("a successful notification refresh clears a transient warning", async () => {
  const centerSource = await readFile(
    new URL("../src/components/dashboard/NotificationCenter.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    centerSource,
    /loadState:\s*"idle",[\s\S]{0,120}message:\s*"",[\s\S]{0,120}notifications:/,
  );
  assert.match(centerSource, /loadState === "idle" \|\| loadState === "error"/);
  assert.match(centerSource, />\s*Retry\s*</);
});

test("clear all uses the unfiltered notification count", async () => {
  const centerSource = await readFile(
    new URL("../src/components/dashboard/NotificationCenter.tsx", import.meta.url),
    "utf8",
  );

  assert.match(centerSource, /disabled=\{meta\.allCount === 0 \|\| isBusy\}/);
});
