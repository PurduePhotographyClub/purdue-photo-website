# Website Codex Guide

## Project

This is an Astro 6, React 18, TypeScript, and Cloudflare Workers website for the photography project.

## Commands

- Install dependencies with `npm install`.
- Develop locally with `npm run dev`.
- Build with `npm run build`.
- Typecheck with `npm run typecheck`.
- Run React Doctor with `npm run doctor`.
- Run the full local verification gate with `npm run verify`.
- Test the built Cloudflare worker locally with `npm run dev:wrangler`.
- Deploy with `npm run deploy` only when explicitly requested.

## Workflow

- Prefer focused changes that follow existing Astro, React, and Cloudflare patterns.
- Use `$website-verification` before handoff after code, config, dependency, or UI changes.
- Use `$impeccable` for frontend design, visual quality, layout, accessibility, or responsive UI work.
- Use Cloudflare, Wrangler, React Doctor, and web performance skills when the task matches them.
- Do not overwrite unrelated user changes. Check `git status --short` before broad edits.

## Do Not

- Do not hardcode secrets or edit `.dev.vars` unless explicitly requested.
- Do not manually edit generated output in `dist/`, `.wrangler/`, or `worker-configuration.d.ts`.
- Do not run deploys, publish external changes, or rotate credentials without explicit approval.
