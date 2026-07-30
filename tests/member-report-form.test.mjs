import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: MemberReportForm } = await import(
  "../src/components/MemberReportForm.tsx"
);

test("the public report page is server-rendered, noindex, and protected by Turnstile", async () => {
  const [page, component, layout] = await Promise.all([
    readFile(new URL("../src/pages/report.astro", import.meta.url), "utf8"),
    readFile(new URL("../src/components/MemberReportForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export const prerender = false/);
  assert.match(page, /robots="noindex, nofollow, noarchive"/);
  assert.match(page, /env\.TURNSTILE_SITE_KEY/);
  assert.match(page, /showFloatingWidgets=\{false\}/);
  assert.match(page, /<MemberReportForm client:load turnstileSiteKey=\{turnstileSiteKey\} \/>/);
  assert.match(component, /const TURNSTILE_ACTION = "member_report"/);
  assert.match(component, /action=\{TURNSTILE_ACTION\}/);
  assert.match(layout, /\{showFloatingWidgets && <DonateWidget client:load \/>\}/);
  assert.match(layout, /\{showFloatingWidgets && <FilterWidget client:load \/>\}/);
});

test("the report form asks only for the reported member and the behavior", () => {
  const html = renderToStaticMarkup(createElement(MemberReportForm, {
    turnstileSiteKey: "test-site-key",
  }));

  assert.match(html, /Anonymous Member Report/);
  assert.match(html, /club officers/i);
  assert.match(html, /do not include details that identify you/i);
  assert.match(
    html,
    /<form[^>]+action="\/report"[^>]+method="post"[^>]*>/,
  );
  const reportedNameInput =
    html.match(/<input[^>]+id="MemberReport-reported-name"[^>]*>/)?.[0] ?? "";
  const behaviorInput =
    html.match(/<textarea[^>]+id="MemberReport-behavior"[^>]*>/)?.[0] ?? "";
  assert.match(
    reportedNameInput,
    /minLength="2"[^>]+maxLength="120"[^>]+required=""/,
  );
  assert.match(
    behaviorInput,
    /minLength="20"[^>]+maxLength="2000"[^>]+required=""/,
  );
  assert.doesNotMatch(reportedNameInput, /\sname="/);
  assert.doesNotMatch(behaviorInput, /\sname="/);
  assert.doesNotMatch(html, /name="(?:email|reporter|reporterName|pageUrl|userAgent)"/);
});

test("submission omits credentials and sends only the anonymous report payload", async () => {
  const component = await readFile(
    new URL("../src/components/MemberReportForm.tsx", import.meta.url),
    "utf8",
  );

  assert.match(component, /fetchApi\("\/api\/member-reports"/);
  assert.match(component, /credentials: "omit"/);
  assert.match(
    component,
    /body: JSON\.stringify\(\{\s*behavior,\s*reportedName,\s*turnstileToken,\s*\}\)/s,
  );
  assert.doesNotMatch(component, /\bauthClient\b|\buseSession\b/);
  assert.doesNotMatch(
    component,
    /\b(?:email|reporter|reporterName|pageUrl|userAgent)\s*:/,
  );
});

test("the footer links to the anonymous report page", async () => {
  const footer = await readFile(
    new URL("../src/components/Footer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(footer, /\{ to: "\/report", label: "Report a Concern" \}/);
});
