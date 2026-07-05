---
name: website-verification
description: Verify this Astro, React, TypeScript, and Cloudflare website before handoff. Use after modifying src, public assets, package/dependency files, Astro config, Wrangler config, Cloudflare worker behavior, authentication flows, or UI components; also use before commits, PR summaries, deploys, or when asked to check build/type/security quality for this repo.
---

# Website Verification

## Overview

Run the smallest verification set that covers the changed surface, then report exact commands and results. Prefer the repo scripts in `package.json` over invented commands.

## Baseline

1. Inspect `git status --short` and `git diff --stat` to understand the changed surface without reverting unrelated work.
2. Read `package.json` before selecting commands.
3. Use `npm run verify` as the default full local check because it runs build, typecheck, and React Doctor for this repo.
4. If `npm run verify` fails, run the smallest failing subcommand next (`npm run build`, `npm run typecheck`, or `npm run doctor`) to isolate the issue.

## Changed Surface Matrix

- UI, layout, React components, routes, or CSS: run `npm run verify`; start a local preview/dev server when visual behavior matters, then inspect desktop and mobile viewports.
- Cloudflare adapter, worker behavior, bindings, `wrangler.jsonc`, or environment assumptions: run `npm run build`; if runtime behavior matters, run `npm run dev:wrangler` and verify the built worker path.
- TypeScript contracts, auth, API calls, or data handling: run `npm run typecheck` plus `npm run build`.
- Dependency, lockfile, or package changes: run `npm run verify`; run `npm audit` before commits or when security risk is relevant.
- Documentation-only changes: inspect rendered Markdown or changed links; full build is optional unless docs feed the app.

## Gotchas

- Do not edit `.dev.vars`, `.wrangler/`, `dist/`, or generated configuration unless the task explicitly targets generated/runtime output.
- `npm run dev:wrangler` depends on a fresh build because it uses `dist/server/wrangler.json`.
- React Doctor is intentionally part of `npm run verify`; do not skip it after UI or React hook changes.
- Networked checks such as `npm audit` may need approval in sandboxed sessions; report that clearly if skipped.

## Reporting

Summarize only the checks that were run, their pass/fail status, and any skipped checks with the concrete reason. If a command needs network or elevated access and is not essential for the current change, say it was skipped rather than forcing it.
