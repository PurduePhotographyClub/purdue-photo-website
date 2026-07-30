# Product

## Register

brand

## Users

Purdue Photography Club serves Purdue students, club members, officers, event organizers, alumni, donors, and visitors who want to understand the club, browse member photography, join activities, request photographers, or manage member workflows. Public visitors are often deciding whether the club feels credible and welcoming. Authenticated members and officers are in a task-focused context: activation, dashboard notifications, gallery uploads, competitions, darkroom, studio, equipment, and account settings.

## Product Purpose

The website is the club's public face and member portal. It presents the club's history, meetings, facilities, competitions, gallery, merch, and request forms while keeping authenticated dashboard work connected to the private API Worker through same-origin `/api/*` routes. Success means the public site feels unmistakably like a photography club with analog roots and digital workflows, and the dashboard remains calm, legible, and reliable for repeated member tasks.

## Anonymous Member Reports

The report system gives people a private route for sharing concerns about a member's behavior. The public `/report` page uses Turnstile, and the Discord `/report` command is limited to members. Both surfaces send the same bounded report data to the API.

Reporter identity is not stored with the report or included in the officer-facing Discord message. Website submissions omit account cookies, and Discord uses the caller only long enough to check access. Reports are unverified accounts, not findings of misconduct. Similar member names may be grouped to show how many reports share a match, but that count is not a severity or guilt score.

Officers can correct a mistaken name match from each Discord message. Counts come from stored reports and update for every affected message; officers cannot type or override a count. This feature does not notify the reported member, resolve investigations, issue sanctions, accept emergency requests, or replace Purdue and emergency reporting channels.

## Brand Personality

Analog, archival, and technical. The public site should feel like a darkroom contact sheet crossed with a contemporary student organization site: photographic, restrained, textural, and confident. The dashboard should keep the same monochrome and film-lab character, but let utility lead over atmosphere.

## Anti-references

Do not redesign the site from scratch. Do not replace the existing identity, layout direction, colors, vibe, or brand style. Avoid generic AI-looking design: random gradients, glassmorphism, huge shadows, over-rounded cards, fake depth, unnecessary animation, cheerful SaaS colors, beige/cream editorial templates, and decorative effects that do not relate to photography or task feedback.

## Design Principles

1. Preserve the darkroom identity first: dark monochrome surfaces, photographic imagery, film grain, fine borders, and restrained accents are the source of truth.
2. Let photographs carry the public pages. Imagery should feel inspectable and club-owned when possible, not like abstract decoration.
3. Keep typography disciplined. Playfair Display is for brand and section headings; Space Mono carries UI labels, navigation, body copy, and dashboard controls.
4. Make polish systematic, not ornamental. Improve rhythm, contrast, alignment, states, and responsive behavior without introducing a new visual language.
5. Separate public atmosphere from dashboard efficiency. The dashboard may be denser and quieter, but it should still feel like the same club system.

## Accessibility & Inclusion

Target WCAG AA for text contrast, keyboard focus, labeled controls, touch targets, and motion preferences. Interactive UI should expose hover, focus, active, disabled, loading, error, and success states where applicable. Decorative film grain, filters, and motion must never be the only way information is conveyed.
