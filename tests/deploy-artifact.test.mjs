import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  collectAstroAssetPaths,
  validateHtmlArtifact,
} from "../scripts/verify-deploy-artifact.mjs";

test("deploy validation rejects truncated HTML responses", () => {
  const truncatedHtml = "<!DOCTYPE html><html><body><main>Partial";

  assert.deepEqual(validateHtmlArtifact(truncatedHtml, "index.html"), [
    "index.html is missing a closing </body> tag.",
    "index.html is missing a closing </html> tag.",
  ]);
});

test("deploy validation accepts complete HTML and extracts local Astro assets", () => {
  const completeHtml = [
    "<!DOCTYPE html>",
    "<html>",
    "<head><link rel=\"stylesheet\" href=\"/_astro/Layout.hash.css\"></head>",
    "<body><main>Ready</main><script src=\"/_astro/app.hash.js\"></script></body>",
    "</html>",
  ].join("");

  assert.deepEqual(validateHtmlArtifact(completeHtml, "index.html"), []);
  assert.deepEqual(collectAstroAssetPaths(completeHtml), [
    "_astro/Layout.hash.css",
    "_astro/app.hash.js",
  ]);
});

test("deploy validation accepts Astro redirect documents", () => {
  const redirectHtml = [
    "<!doctype html>",
    "<title>Redirecting</title>",
    "<meta http-equiv=\"refresh\" content=\"2;url=/events/\">",
    "<body><a href=\"/events/\">Redirecting</a></body>",
  ].join("");

  assert.deepEqual(validateHtmlArtifact(redirectHtml, "discord/index.html"), []);
});

test("CI runs tests and validates the built artifact before upload", async () => {
  const [workflow, packageSource] = await Promise.all([
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageSource);

  assert.match(workflow, /- name: Test\s+run: npm test/);
  assert.match(workflow, /- name: Validate deploy artifact\s+run: npm run verify:deploy-artifact/);
  assert.match(packageJson.scripts.deploy, /npm run verify/);
  assert.match(packageJson.scripts.deploy, /npm run verify:deploy-artifact/);
});
