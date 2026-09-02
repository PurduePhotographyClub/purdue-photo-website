import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scannerPath = new URL(
  "../src/components/dashboard/admin/EquipmentScanner.tsx",
  import.meta.url,
);
const adminEquipmentPath = new URL(
  "../src/components/dashboard/admin/AdminEquipment.tsx",
  import.meta.url,
);

test("the PPC scanner uses keyboard HID input with an explicit checkout or return mode", async () => {
  const scanner = await readFile(scannerPath, "utf8");

  assert.match(scanner, /type ScanAction = "checkout" \| "return"/);
  assert.match(scanner, /<form[\s\S]*onSubmit=/);
  assert.match(scanner, /inputRef\.current\?\.focus\(\)/);
  assert.match(scanner, /fetchApi\("\/api\/equipment\/scan"/);
  assert.match(scanner, /aria-live="polite"/);
  assert.match(scanner, /Desk mode/);
  assert.match(scanner, /Scan or type an asset tag/);
  assert.doesNotMatch(scanner, /NETUM setup/);
  assert.doesNotMatch(scanner, /Code 128 label values/);
  assert.doesNotMatch(scanner, /Enter suffix/);
  assert.doesNotMatch(scanner, /navigator\.bluetooth|requestDevice/);
});

test("scanner results keep the selected mode so duplicate scans cannot reverse an action", async () => {
  const scanner = await readFile(scannerPath, "utf8");

  assert.match(scanner, /body:\s*JSON\.stringify\(\{\s*action,\s*barcode/);
  assert.match(scanner, /setBarcode\(""\)/);
  assert.doesNotMatch(scanner, /setAction\(action === "checkout" \? "return"/);
});

test("the admin equipment page exposes the scan station and refreshes after a scan", async () => {
  const adminEquipment = await readFile(adminEquipmentPath, "utf8");

  assert.match(adminEquipment, /import EquipmentScanner/);
  assert.match(adminEquipment, /type View = "scanner" \| "ppc" \| "loans" \| "history"/);
  assert.match(adminEquipment, />Scan Station</);
  assert.match(adminEquipment, /<EquipmentScanner[\s\S]*onCompleted=\{refresh\}/);
});
