---
name: Purdue Photography Club Website
description: Darkroom-inspired public website and member dashboard for Purdue Photography Club.
colors:
  neutral-950: "#0a0a0a"
  neutral-900: "#171717"
  neutral-800: "#262626"
  neutral-700: "#404040"
  neutral-600: "#525252"
  neutral-500: "#737373"
  neutral-400: "#a3a3a3"
  neutral-300: "#d4d4d4"
  neutral-200: "#e5e5e5"
  neutral-100: "#f5f5f5"
  white: "#ffffff"
  black: "#000000"
  ppc-gold: "#ceb888"
  discord-blue: "#5865f2"
  success-green: "#86efac"
  warning-amber: "#fcd34d"
  info-blue: "#93c5fd"
  danger-red: "#f87171"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.05em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.04em"
  title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.04em"
  body:
    fontFamily: "Space Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.04em"
  label:
    fontFamily: "Space Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.2em"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "10px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "12px 32px"
  button-secondary:
    backgroundColor: "{colors.neutral-950}"
    textColor: "{colors.neutral-300}"
    rounded: "{rounded.none}"
    padding: "12px 32px"
  input-default:
    backgroundColor: "{colors.neutral-950}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  card-dark:
    backgroundColor: "{colors.neutral-950}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.none}"
    padding: "24px"
  floating-pill:
    backgroundColor: "{colors.neutral-950}"
    textColor: "{colors.ppc-gold}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
---

# Design System: Purdue Photography Club Website

## 1. Overview

**Creative North Star: "The Darkroom Contact Sheet"**

The system is a dark, photographic environment built from monochrome surfaces, thin neutral borders, film-grain texture, measured spacing, and real club imagery. It should feel like visitors are moving through a contact sheet, darkroom archive, and club operations desk in one coherent system.

The public site is brand-first: immersive hero photography, grayscale treatment, large Playfair Display headings, uppercase mono labels, and image-led sections carry the impression. The dashboard is product-first: the same dark palette and mono voice, but denser, flatter, and more task-focused.

**Key Characteristics:**
- Dark monochrome base with white/gray hierarchy and rare color accents.
- Playfair Display for club identity and editorial headings; Space Mono for labels, controls, navigation, and body copy.
- Fine borders, square corners, low-opacity panels, and subtle texture instead of heavy card depth.
- Photographic media, film-strip details, contact-sheet grids, and analog/digital tags as signature motifs.
- Motion is state feedback and polish, not spectacle.

## 2. Colors

The palette is nearly monochrome: black and neutral grays form the environment; white is reserved for primary actions and peak contrast; color appears only for system states, Discord, and Purdue gold donation moments.

### Primary
- **Darkroom Black** (`neutral-950`): The page background and dashboard shell. It is the default atmosphere.
- **Contact White** (`white`): The strongest action color and highest-contrast text.
- **Print Paper** (`neutral-100`): Primary display text on dark surfaces.

### Secondary
- **Purdue Gold** (`ppc-gold`): Donation/support moments and club-affinity accents. Use sparingly so it stays special.
- **Discord Blue** (`discord-blue`): Discord sign-in or Discord-specific actions only.

### Tertiary
- **Success Green** (`success-green`), **Warning Amber** (`warning-amber`), **Info Blue** (`info-blue`), and **Danger Red** (`danger-red`): Semantic dashboard and form states. Do not use these as decoration.

### Neutral
- **Film Gate** (`neutral-800`): Default border color for cards, inputs, dividers, and dashboard rails.
- **Muted Silver** (`neutral-500`): Secondary labels, inactive navigation, and helper text.
- **Soft Gray** (`neutral-400`): Body copy and non-primary text on dark backgrounds.
- **Deep Panel** (`neutral-900`): Slightly raised or disabled surfaces.

### Named Rules
**The Monochrome First Rule.** A screen should read as black, white, and gray before any accent color is noticed.

**The Rare Gold Rule.** Purdue gold is for donation/support or special club moments; never wash the site in gold.

**The Semantic Color Rule.** Green, amber, blue, red, and Discord blue carry meaning. Do not use them for arbitrary section variety.

## 3. Typography

**Display Font:** Playfair Display (with Georgia fallback)  
**Body Font:** Space Mono (with system mono fallbacks)  
**Label/Mono Font:** Space Mono

**Character:** Playfair gives the club its archival, photographic identity; Space Mono keeps navigation, labels, controls, and dashboard work precise. The pairing is already committed in code and should not be swapped during polish.

### Hierarchy
- **Display** (400, `clamp(2.25rem, 6vw, 4.5rem)`, 1.1): Public hero headings and major page titles only.
- **Headline** (400, `clamp(1.875rem, 4vw, 3rem)`, 1.2): Section headings, feature introductions, and page-level dashboard titles.
- **Title** (400, `1.5rem`, 1.25): Cards, event titles, competition titles, and form success states.
- **Body** (400, `0.875rem`, 1.7): Descriptions and explanatory copy. Keep prose readable and cap long lines around 65-75ch.
- **Label** (400, `0.625rem`, 1.5, uppercase, tracked): Nav items, chips, badges, field labels, small section labels, and status markers.

### Named Rules
**The Two-Font Rule.** Do not introduce a third display, sans, or mono family. If something feels off, tune size, weight, spacing, or hierarchy inside the current pair.

**The Label Restraint Rule.** Uppercase tracked labels are part of the brand, but they must not become a tiny eyebrow before every section unless the section actually needs a label.

## 4. Elevation

Depth is conveyed through tonal layering, borders, imagery, and occasional photographic shadows rather than conventional app-card elevation. Public image collages can use strong black shadows because they mimic stacked prints. Dashboard and forms should stay flat by default.

### Shadow Vocabulary
- **Photographic Print Shadow** (`shadow-2xl shadow-black/50`): Use only for overlapping photo-print compositions, such as the merch collage.
- **Floating Utility Shadow** (`shadow-lg shadow-neutral-900/50`): Use only for floating widgets like donate and filters.
- **Modal Overlay Darkness** (`bg-black/95`): Use for lightboxes and blocking overlays.

### Named Rules
**The Flat Interface Rule.** Operational UI is flat at rest. Borders and surface opacity distinguish layers before shadows do.

**The Print Shadow Rule.** Big shadows belong to physical-photo metaphors, not ordinary cards.

## 5. Components

### Buttons
- **Shape:** Square corners for standard buttons (`0px`). Floating utility buttons use full pills (`9999px`).
- **Primary:** White background, black text, mono uppercase label, strong tracking, `12px 32px` or comparable padding.
- **Hover / Focus:** Primary buttons shift to neutral-200 or invert to white/black. Secondary buttons lift by contrast: brighter border and text, not extra depth.
- **Secondary / Ghost / Tertiary:** Transparent or low-opacity background, neutral border, neutral-300 or neutral-400 text. Use for filters, login alternates, and secondary dashboard actions.

### Chips
- **Style:** Tiny uppercase mono labels, `9px-10px`, strong tracking, neutral border, and subtle dark backgrounds.
- **State:** Film/digital/media chips can use neutral fills and icons. Semantic chips use green, amber, blue, red, or Discord blue only when state meaning is explicit.

### Cards / Containers
- **Corner Style:** Square by default. Small radii only for badges, pills, and existing floating panels.
- **Background:** `bg-white/[0.02]`, `bg-black/20`, `bg-neutral-900/50`, or transparent over `neutral-950`.
- **Shadow Strategy:** No shadow on ordinary cards. Use borders and opacity instead.
- **Border:** `neutral-800` is the default; hover may move to `neutral-600`.
- **Internal Padding:** Public cards use `24px-32px`; dashboard panels use `16px-24px` depending on density.

### Inputs / Fields
- **Style:** Transparent or `bg-white/[0.02]`, one-pixel neutral border, square corners, mono text, and generous horizontal padding.
- **Focus:** Border brightens to neutral-500/600. Focus indicators must remain visible and keyboard accessible.
- **Error / Disabled:** Errors use red text near the field or form; disabled controls lower opacity and keep labels readable.

### Navigation
- **Style:** Fixed public top bar on `neutral-950/90` with blur, fine bottom border, logo, social icons, dashboard affordance, and mobile menu.
- **Typography:** Mono uppercase labels, `10px-12px`, tracked. Logo text uses Playfair.
- **Default / Hover / Active:** Inactive links are neutral-500/600; hover and active move to white. Active dashboard nav gets `bg-white/[0.04]`.
- **Mobile:** Collapse links into stacked full-width text rows with social links grouped under a small label.

### Signature Component
**Lens Filter Widget.** The floating filter control is a brand-specific utility. It uses a pill button, camera icon, low-opacity dark panel, mono labels, and optional page-wide photographic filter effects. It must remain clearly optional and reversible.

## 6. Do's and Don'ts

### Do:
- **Do** preserve the existing darkroom identity: `neutral-950`, fine neutral borders, film grain, real photography, Playfair headings, and Space Mono UI copy.
- **Do** use photographs and club assets as the public site's strongest visual material.
- **Do** keep dashboard UI dense, flat, predictable, and aligned with existing member workflows.
- **Do** use white primary buttons for clear action moments and neutral outline buttons for secondary actions.
- **Do** check contrast whenever muted neutral text appears on dark or tinted backgrounds.
- **Do** respect reduced motion for confetti, widget motion, hover transitions, and any future animation.

### Don't:
- **Don't** redesign the website from scratch or replace the existing identity, layout direction, colors, vibe, or brand style.
- **Don't** add random gradients, glassmorphism, huge shadows, over-rounded cards, fake depth, or unnecessary animation.
- **Don't** introduce cheerful SaaS colors, beige/cream editorial templates, purple-blue gradients, or generic AI-looking design motifs.
- **Don't** use color as decoration when it already has semantic meaning.
- **Don't** use big shadows on normal dashboard cards or form panels.
- **Don't** add a third font family or replace the committed Playfair Display and Space Mono pairing.
