import "./helpers/register-typescript-jsx-paths.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const {
  default: MemberReportForm,
  limitUnicodeLength,
  normalizeMemberReportReason,
  unicodeLength,
} = await import(
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

test("the report introduction follows the website style without repeating the privacy warning", async () => {
  const component = await readFile(
    new URL("../src/components/MemberReportForm.tsx", import.meta.url),
    "utf8",
  );
  const html = renderToStaticMarkup(createElement(MemberReportForm, {
    turnstileSiteKey: "test-site-key",
  }));

  assert.match(html, /Anonymous Reporting/);
  assert.match(html, /Report a Concern/);
  assert.match(html, /Executive team/);
  assert.match(html, /No sign-in or contact information is required\./);
  assert.doesNotMatch(html, /details that identify you/i);
  assert.doesNotMatch(html, /member-report-privacy-note/);
  assert.doesNotMatch(component, /\bShield\b/);
});

test("the report form includes a separate optional reason without native serialization", () => {
  const html = renderToStaticMarkup(createElement(MemberReportForm, {
    turnstileSiteKey: "test-site-key",
  }));

  assert.match(
    html,
    /<form[^>]+action="\/report"[^>]+method="post"[^>]*>/,
  );
  const reportedNameInput =
    html.match(/<input[^>]+id="MemberReport-reported-name"[^>]*>/)?.[0] ?? "";
  const behaviorInput =
    html.match(/<textarea[^>]+id="MemberReport-behavior"[^>]*>/)?.[0] ?? "";
  const reasonInput =
    html.match(/<textarea[^>]+id="MemberReport-reason"[^>]*>/)?.[0] ?? "";
  assert.match(
    reportedNameInput,
    /minLength="2"[^>]+maxLength="120"[^>]+required=""/,
  );
  assert.match(
    behaviorInput,
    /minLength="20"[^>]+maxLength="2000"[^>]+required=""/,
  );
  assert.match(html, /Reason for Report/);
  assert.match(html, /Optional/);
  assert.match(html, /id="member-report-reason-help"/);
  assert.match(reasonInput, /maxLength="1000"/);
  assert.match(
    reasonInput,
    /aria-describedby="member-report-reason-help member-report-reason-count"/,
  );
  assert.match(behaviorInput, /aria-describedby="member-report-behavior-count"/);
  assert.doesNotMatch(reportedNameInput, /aria-describedby=/);
  assert.doesNotMatch(reasonInput, /\srequired(?:=|\s|>)/);
  assert.doesNotMatch(reportedNameInput, /\sname="/);
  assert.doesNotMatch(behaviorInput, /\sname="/);
  assert.doesNotMatch(reasonInput, /\sname="/);
  assert.doesNotMatch(html, /name="(?:email|reporter|reporterName|pageUrl|userAgent)"/);
});

test("the optional reason limit counts Unicode code points", () => {
  const overLimit = `${"😀".repeat(500)}x`;
  const limited = limitUnicodeLength(overLimit, 500);

  assert.equal(unicodeLength(overLimit), 501);
  assert.equal(unicodeLength(limited), 500);
  assert.equal(limited, "😀".repeat(500));
});

test("an omitted optional reason is normalized to an empty string", () => {
  assert.equal(normalizeMemberReportReason(" \n\t "), "");
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
    /body: JSON\.stringify\(\{\s*behavior,\s*reason,\s*reportedName,\s*turnstileToken,\s*\}\)/s,
  );
  assert.match(
    component,
    /const reason = normalizeMemberReportReason\(state\.reason\)/,
  );
  assert.match(component, /unicodeLength\(reason\) > REASON_MAX_LENGTH/);
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
