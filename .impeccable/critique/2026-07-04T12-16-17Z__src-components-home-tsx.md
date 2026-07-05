---
target: src/components/Home.tsx
total_score: 21
p0_count: 0
p1_count: 2
timestamp: 2026-07-04T12-16-17Z
slug: src-components-home-tsx
---
Method: dual-agent (A: 019f2d0b-11a0-74a0-9c4a-f8d57b98e3a1 | B: 019f2d0b-32e7-7011-9146-70b593dd8a91)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 2 | Skeletons exist, but homepage async error states are weak or visually quiet. |
| 2 | Match System / Real World | 3 | The photo-club/darkroom language is strong; the locked newsletter feels like system state copy. |
| 3 | User Control and Freedom | 2 | Main public navigation is hidden behind icon/menu behavior on desktop. |
| 4 | Consistency and Standards | 2 | Header/footer navigation differ and the desktop nav container is always hidden. |
| 5 | Error Prevention | 2 | Disabled newsletter fields prevent submission but invite a dead interaction. |
| 6 | Recognition Rather Than Recall | 2 | Desktop users must discover routes through a menu; gallery metadata is mostly hover-only. |
| 7 | Flexibility and Efficiency | 2 | Links exist, but visitor intent paths are not made explicit early. |
| 8 | Aesthetic and Minimalist Design | 3 | Strong atmosphere; repeated eyebrow/card grammar creates some template noise. |
| 9 | Error Recovery | 1 | Async failures often have minimal recovery guidance. |
| 10 | Help and Documentation | 2 | Routes exist, but joining, requesting, and attending are not sequenced clearly. |
| **Total** |  | **21/40** | **Acceptable; strong brand base, meaningful UX cleanup needed.** |

## Anti-Patterns Verdict

**LLM assessment**: The homepage does not read as generic AI slop. The darkroom identity is specific and coherent: monochrome surfaces, film grain, real imagery, square edges, Playfair headings, Space Mono labels, and photographic motifs. The main slop risk is repeated tiny uppercase section labels and similar card/CTA cadence across too many homepage modules.

**Deterministic scan**: The detector found 1 warning: `single-font` in `src/layouts/Layout.astro:25`, reporting that only Space Mono is used. This appears to be a false positive for the composed homepage because `Home.tsx`, `Header.tsx`, and `Footer.tsx` explicitly use Playfair Display for headings and logo text, matching `DESIGN.md`.

**Visual overlays**: Browser overlay evidence was not available. `npm run dev` failed with `listen EPERM: operation not permitted 0.0.0.0:9229` from the Cloudflare Vite plugin, so no reliable user-visible overlay was produced.

## Overall Impression

The site has a strong brand foundation and should be polished, not redesigned. The most valuable improvements are practical: restore orientation, remove dead-end newsletter UI, clarify first-time visitor paths, and reduce repetitive homepage scaffolding.

## What's Working

- The public visual register matches `PRODUCT.md` and `DESIGN.md`: darkroom black, fine borders, film grain, real imagery, Playfair/Space Mono, and restrained contrast.
- The merch print collage is a strong brand moment because depth is tied to stacked physical prints.
- The public and dashboard surfaces share a coherent system while preserving dashboard utility.

## Priority Issues

**[P1] Desktop navigation is effectively hidden**
Why it matters: public visitors need orientation immediately. If routes are discoverable only through icon/menu behavior, the site asks visitors to remember or hunt.
Fix: expose a desktop nav with the primary routes and keep hamburger behavior mobile-focused.
Suggested command: `/impeccable adapt src/components/Header.tsx`

**[P1] Homepage lacks a primary narrative path**
Why it matters: joining, merch, gallery, events, competitions, newsletter, and requests all compete. First-time visitors need a clearer next step.
Fix: add a compact audience/path split after the hero and make the first two folds answer what PPC is and what to do next.
Suggested command: `/impeccable clarify src/components/Home.tsx`

**[P2] Repeated eyebrow-and-card grammar weakens the brand**
Why it matters: the design system warns against tiny tracked labels becoming universal scaffolding.
Fix: keep labels where they add meaning and vary other sections with stronger titles, contact-sheet treatment, or image-led transitions.
Suggested command: `/impeccable typeset src/components/Home.tsx`

**[P2] Locked newsletter creates a dead-end trust dip**
Why it matters: disabled newsletter fields on a marketing page look broken and duplicate a dead interaction in the footer.
Fix: replace the homepage newsletter block with live Discord/Instagram update paths until newsletter signup exists.
Suggested command: `/impeccable distill src/components/Home.tsx`

**[P2] Accessibility-dependent users get weak interaction affordances**
Why it matters: hover-only metadata, icon-first controls, weak focus treatment, and global `select-none` reduce confidence.
Fix: add ARIA state to toggles, visible focus states, non-hover context where practical, and avoid page-wide selection suppression.
Suggested command: `/impeccable audit src/components/Home.tsx src/components/Header.tsx`

## Persona Red Flags

**Jordan (First-Timer)**: Desktop nav is hidden; merch arrives before the club story is fully established; locked newsletter feels like a broken promise.

**Riley (Stress Tester)**: Inconsistent header/footer navigation, disabled form controls, and vague async failures read as credibility leaks.

**Casey (Distracted Mobile User)**: Long menu plus many CTAs creates scanning fatigue; uppercase tracked labels are stylish but slow to parse when interrupted.

**Sam (Accessibility-Dependent User)**: Hover-only photo metadata, icon-only controls, weak focus styling, and disabled form fields add avoidable friction.

## Minor Observations

- Hero alt text should either be more specific if meaningful, or empty if purely atmospheric.
- Global `select-none` fights normal reading and copying behavior.
- Past events on the homepage repeat the Events page card language without a distinct homepage reason.

## Questions to Consider

- Is the homepage's primary conversion joining, requesting photographers, or proving PPC's creative credibility?
- Should merch be the second major story beat before facilities, community, or meetings?
- Should a locked newsletter exist at all on the public homepage?
