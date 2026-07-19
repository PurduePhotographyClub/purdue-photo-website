import {
  PROFILE_AVATAR_SHAPES,
  PROFILE_DECORATIONS,
  PROFILE_PALETTE_MODES,
  PROFILE_PALETTES,
  PROFILE_SOCIAL_STYLES,
  PROFILE_TEMPLATES,
  getCompatibleProfileDecorations,
  resolveProfileDecoration,
  type ProfileAvatarShape,
  type ProfileDecoration,
  type ProfileDraft,
  type ProfilePalette,
  type ProfilePaletteMode,
  type ProfileSocialStyle,
  type ProfileTemplate,
} from "@/lib/profile-model";

const TEMPLATE_LABELS: Record<ProfileTemplate, { description: string; label: string }> = {
  "contact-sheet": { description: "Portrait and intro side by side.", label: "Contact sheet" },
  "print-index": { description: "A centered, compact introduction.", label: "Print index" },
  "split-frame": { description: "Bold name beside a narrow portrait.", label: "Split frame" },
  "negative-strip": { description: "A horizontal film-strip header.", label: "Negative strip" },
  "editorial-grid": { description: "An asymmetric magazine-style introduction.", label: "Editorial grid" },
  "darkroom-card": { description: "A focused portrait card with generous space.", label: "Darkroom card" },
  diptych: { description: "Portrait and details in two balanced panels.", label: "Diptych" },
};

const DECORATION_LABELS: Record<ProfileDecoration, { description: string; label: string }> = {
  none: { description: "Clean edges and quiet spacing.", label: "None" },
  "film-frame": { description: "A subtle printed-film border.", label: "Film frame" },
  "contact-marks": { description: "Contact-sheet numbers and crop marks.", label: "Contact marks" },
  viewfinder: { description: "Fine focusing corners around the intro.", label: "Viewfinder" },
  sprocket: { description: "Film perforations along the profile header.", label: "Sprocket holes" },
  "archival-stamp": { description: "A restrained archive stamp in one corner.", label: "Archive stamp" },
  "grid-lines": { description: "Fine layout lines behind the introduction.", label: "Grid lines" },
};

const PALETTE_LABELS: Record<ProfilePalette, { description: string; label: string }> = {
  monochrome: { description: "Neutral black, white, and silver.", label: "Monochrome" },
  amber: { description: "Warm darkroom amber.", label: "Amber" },
  cyanotype: { description: "Cool cyanotype blue.", label: "Cyanotype" },
  forest: { description: "Muted botanical green.", label: "Forest" },
  burgundy: { description: "Deep red print tones.", label: "Burgundy" },
  violet: { description: "Soft ultraviolet accents.", label: "Violet" },
};

const PALETTE_MODE_LABELS: Record<ProfilePaletteMode, { description: string; label: string }> = {
  "accent-only": {
    description: "Keep the header neutral and apply the selected color only to key accents.",
    label: "Accent only",
  },
  "background-accent": {
    description: "Apply the selected palette to the header background and its accents.",
    label: "Background + accent",
  },
};

const AVATAR_SHAPE_LABELS: Record<ProfileAvatarShape, { description: string; label: string }> = {
  auto: { description: "Let each layout choose its natural crop.", label: "Match layout" },
  circle: { description: "A classic circular portrait.", label: "Circle" },
  rounded: { description: "A softer editorial frame.", label: "Soft corners" },
  square: { description: "A sharp print-style crop.", label: "Square" },
};

const SOCIAL_STYLE_LABELS: Record<ProfileSocialStyle, { description: string; label: string }> = {
  tiles: { description: "Large icon tiles with a compact footprint.", label: "Icon tiles" },
  labels: { description: "Icons with readable service names.", label: "Named links" },
};

const PALETTE_SWATCHES: Record<ProfilePalette, { accent: string; border: string; surface: string }> = {
  monochrome: { accent: "bg-neutral-100", border: "border-neutral-600", surface: "bg-neutral-950" },
  amber: { accent: "bg-amber-300", border: "border-amber-800", surface: "bg-amber-950" },
  cyanotype: { accent: "bg-cyan-300", border: "border-cyan-800", surface: "bg-cyan-950" },
  forest: { accent: "bg-emerald-300", border: "border-emerald-800", surface: "bg-emerald-950" },
  burgundy: { accent: "bg-rose-300", border: "border-rose-900", surface: "bg-rose-950" },
  violet: { accent: "bg-violet-300", border: "border-violet-800", surface: "bg-violet-950" },
};

interface Props {
  idPrefix: string;
  onChange: (profile: ProfileDraft) => void;
  profile: ProfileDraft;
}

function LayoutPreview({ template }: { template: ProfileTemplate }) {
  if (template === "diptych") {
    return <span className="grid h-16 grid-cols-2 gap-1.5 border border-neutral-800 p-2"><i className="block bg-neutral-700" /><i className="flex flex-col justify-center gap-1.5 px-1"><b className="h-2 bg-neutral-500" /><b className="h-1 bg-neutral-700" /><b className="h-1 w-2/3 bg-neutral-700" /></i></span>;
  }
  if (template === "darkroom-card") {
    return <span className="flex h-16 items-center justify-center border border-neutral-800 bg-neutral-950 p-2"><i className="grid w-2/3 grid-cols-[20px_1fr] gap-2 border border-neutral-700 p-2"><b className="size-5 rounded-full bg-neutral-600" /><b className="space-y-1"><em className="block h-1.5 bg-neutral-500" /><em className="block h-1 bg-neutral-700" /></b></i></span>;
  }
  if (template === "editorial-grid") {
    return <span className="grid h-16 grid-cols-[20px_1fr_30px] gap-2 border border-neutral-800 p-2"><i className="text-xl not-italic text-neutral-700">01</i><i className="space-y-1.5 pt-1"><b className="block h-2 bg-neutral-500" /><b className="block h-1 bg-neutral-700" /></i><i className="block bg-neutral-700" /></span>;
  }
  if (template === "negative-strip") {
    return <span className="grid h-16 grid-cols-[28px_1fr_1fr] gap-1.5 border-y-4 border-neutral-700 p-2"><i className="block rounded-full bg-neutral-600" /><i className="block bg-neutral-800" /><i className="block bg-neutral-800" /></span>;
  }
  if (template === "split-frame") {
    return <span className="grid h-16 grid-cols-[1fr_34px] gap-3 border border-neutral-800 p-2"><i className="block space-y-1.5"><b className="block h-2 w-3/4 bg-neutral-500" /><b className="block h-1 w-full bg-neutral-700" /><b className="block h-1 w-2/3 bg-neutral-700" /></i><i className="block bg-neutral-700" /></span>;
  }
  if (template === "print-index") {
    return <span className="flex h-16 flex-col items-center justify-center gap-1.5 border border-neutral-800"><i className="block size-4 rounded-full bg-neutral-600" /><i className="block h-1.5 w-1/2 bg-neutral-500" /><i className="block h-1 w-2/3 bg-neutral-700" /></span>;
  }
  return <span className="grid h-16 grid-cols-[32px_1fr] gap-3 border border-neutral-800 p-2"><i className="block rounded-full bg-neutral-600" /><i className="block space-y-1.5"><b className="block h-1.5 w-2/3 bg-neutral-500" /><b className="block h-1 w-full bg-neutral-700" /><b className="block h-1 w-4/5 bg-neutral-700" /></i></span>;
}

function DecorationPreview({ decoration }: { decoration: ProfileDecoration }) {
  const frameClass = decoration === "film-frame"
    ? "border-[3px] border-double border-neutral-600"
    : decoration === "viewfinder"
      ? "border border-neutral-700 before:absolute before:left-1 before:top-1 before:size-3 before:border-l before:border-t before:border-neutral-400 after:absolute after:bottom-1 after:right-1 after:size-3 after:border-b after:border-r after:border-neutral-400"
      : decoration === "sprocket"
        ? "border-y-4 border-dotted border-neutral-600"
        : decoration === "grid-lines"
          ? "border border-neutral-700 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:12px_12px]"
      : "border border-neutral-800";
  return (
    <span className={`relative flex h-12 items-center justify-center ${frameClass}`}>
      <span className="h-1 w-1/2 bg-neutral-600" />
      {decoration === "contact-marks" && <span className="absolute inset-x-2 bottom-1 flex justify-between font-mono text-[7px] text-neutral-600"><i>01</i><i>36</i></span>}
      {decoration === "archival-stamp" && <span className="absolute right-2 top-1 -rotate-6 border border-neutral-600 px-1 font-mono text-[6px] uppercase text-neutral-500">Archive</span>}
    </span>
  );
}

function PalettePreview({ palette }: { palette: ProfilePalette }) {
  const swatch = PALETTE_SWATCHES[palette];
  return (
    <span className={`flex h-10 items-center gap-2 border p-2 ${swatch.border} ${swatch.surface}`}>
      <i className={`block size-4 rounded-full ${swatch.accent}`} />
      <i className={`block h-1.5 w-1/2 ${swatch.accent}`} />
    </span>
  );
}

function PaletteModePreview({ mode, palette }: { mode: ProfilePaletteMode; palette: ProfilePalette }) {
  const swatch = PALETTE_SWATCHES[palette];
  const surfaceClass = mode === "background-accent" ? swatch.surface : "bg-neutral-950";
  const borderClass = mode === "background-accent" ? swatch.border : "border-neutral-700";
  return (
    <span className={`flex h-12 items-center gap-2 border p-2 ${borderClass} ${surfaceClass}`}>
      <i className={`block size-5 rounded-full ${swatch.accent}`} />
      <i className="flex flex-1 flex-col gap-1">
        <b className={`block h-1.5 w-2/3 ${swatch.accent}`} />
        <b className="block h-1 w-full bg-neutral-500" />
      </i>
    </span>
  );
}

function AvatarShapePreview({ shape }: { shape: ProfileAvatarShape }) {
  const shapeClass = shape === "square"
    ? "rounded-none"
    : shape === "rounded"
      ? "rounded-[18%]"
      : "rounded-full";
  return (
    <span className="flex h-12 items-center justify-center border border-neutral-800 bg-neutral-950">
      <i className={`block size-7 border border-neutral-500 bg-neutral-700 ${shapeClass}`} />
      {shape === "auto" && <em className="ml-2 font-mono text-[7px] not-italic uppercase tracking-wider text-neutral-500">Auto</em>}
    </span>
  );
}

function SocialStylePreview({ style }: { style: ProfileSocialStyle }) {
  return (
    <span className="flex h-12 items-center justify-center gap-2 border border-neutral-800 bg-neutral-950 px-2">
      <i className="flex size-8 shrink-0 items-center justify-center border border-neutral-600 bg-neutral-800 text-[9px] not-italic text-neutral-300">◎</i>
      {style === "labels" && <em className="truncate text-[8px] not-italic uppercase tracking-wider text-neutral-500">Instagram</em>}
      {style === "tiles" && <i className="flex size-8 items-center justify-center border border-neutral-600 bg-neutral-800 text-[9px] not-italic text-neutral-300">↗</i>}
    </span>
  );
}

export default function ProfileAppearancePicker({ idPrefix, onChange, profile }: Props) {
  const compatibleDecorations = getCompatibleProfileDecorations(profile.template);
  const resolvedDecoration = resolveProfileDecoration(profile);

  return (
    <section aria-labelledby={`${idPrefix}-appearance-heading`} className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5">
      <h2 id={`${idPrefix}-appearance-heading`} className="text-sm tracking-wide text-neutral-100">Mini-portfolio appearance</h2>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">Choose a compatible introduction layout and decoration. Header color stops at the decoration frame so photographs keep a neutral gallery backdrop.</p>

      <fieldset className="mt-4">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Layout</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PROFILE_TEMPLATES.map((template) => (
            <label key={template} className={`cursor-pointer border p-3 transition-colors ${profile.template === template ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
              <LayoutPreview template={template} />
              <span className="mt-3 flex items-start gap-2.5">
                <input
                  type="radio"
                  name={`${idPrefix}-template`}
                  checked={profile.template === template}
                  onChange={() => onChange({
                    ...profile,
                    decoration: resolveProfileDecoration({
                      decoration: profile.decoration,
                      template,
                    }),
                    template,
                  })}
                  className="mt-0.5 accent-white"
                />
                <span><span className="block text-xs text-neutral-200">{TEMPLATE_LABELS[template].label}</span><span className="mt-0.5 block text-[10px] leading-4 text-neutral-500">{TEMPLATE_LABELS[template].description}</span></span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Decoration</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {compatibleDecorations.map((decoration) => (
            <label key={decoration} className={`cursor-pointer border p-2.5 transition-colors ${resolvedDecoration === decoration ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
              <DecorationPreview decoration={decoration} />
              <span className="mt-2 flex items-start gap-2">
                <input type="radio" name={`${idPrefix}-decoration`} checked={resolvedDecoration === decoration} onChange={() => onChange({ ...profile, decoration })} className="mt-0.5 accent-white" />
                <span><span className="block text-[10px] text-neutral-300">{DECORATION_LABELS[decoration].label}</span><span className="sr-only">{DECORATION_LABELS[decoration].description}</span></span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Color application</legend>
        <p className="mt-1 text-[10px] leading-4 text-neutral-600">Choose whether the palette colors the whole framed header or its accents only.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PROFILE_PALETTE_MODES.map((paletteMode) => (
            <label key={paletteMode} className={`cursor-pointer border p-2.5 transition-colors ${profile.paletteMode === paletteMode ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
              <PaletteModePreview mode={paletteMode} palette={profile.palette} />
              <span className="mt-2 flex items-start gap-2">
                <input type="radio" name={`${idPrefix}-palette-mode`} checked={profile.paletteMode === paletteMode} onChange={() => onChange({ ...profile, paletteMode })} className="mt-0.5 accent-white" />
                <span><span className="block text-[10px] text-neutral-300">{PALETTE_MODE_LABELS[paletteMode].label}</span><span className="mt-0.5 block text-[9px] leading-4 text-neutral-600">{PALETTE_MODE_LABELS[paletteMode].description}</span></span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Color palette</legend>
        <p className="mt-1 text-[10px] leading-4 text-neutral-600">Choose a fixed, readable accent for the profile header.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PROFILE_PALETTES.map((palette) => (
            <label key={palette} className={`cursor-pointer border p-2 transition-colors ${profile.palette === palette ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
              <PalettePreview palette={palette} />
              <span className="mt-2 flex items-start gap-2">
                <input type="radio" name={`${idPrefix}-palette`} checked={profile.palette === palette} onChange={() => onChange({ ...profile, palette })} className="mt-0.5 accent-white" />
                <span><span className="block text-[10px] text-neutral-300">{PALETTE_LABELS[palette].label}</span><span className="sr-only">{PALETTE_LABELS[palette].description}</span></span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <fieldset>
          <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Portrait shape</legend>
          <p className="mt-1 text-[10px] leading-4 text-neutral-600">Use one crop shape everywhere, or let the layout decide.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PROFILE_AVATAR_SHAPES.map((avatarShape) => (
              <label key={avatarShape} className={`cursor-pointer border p-2.5 transition-colors ${profile.avatarShape === avatarShape ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
                <AvatarShapePreview shape={avatarShape} />
                <span className="mt-2 flex items-start gap-2">
                  <input type="radio" name={`${idPrefix}-avatar-shape`} checked={profile.avatarShape === avatarShape} onChange={() => onChange({ ...profile, avatarShape })} className="mt-0.5 accent-white" />
                  <span><span className="block text-[10px] text-neutral-300">{AVATAR_SHAPE_LABELS[avatarShape].label}</span><span className="sr-only">{AVATAR_SHAPE_LABELS[avatarShape].description}</span></span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Social link style</legend>
          <p className="mt-1 text-[10px] leading-4 text-neutral-600">Choose large icons or links with their service names.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PROFILE_SOCIAL_STYLES.map((socialStyle) => (
              <label key={socialStyle} className={`cursor-pointer border p-2.5 transition-colors ${profile.socialStyle === socialStyle ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
                <SocialStylePreview style={socialStyle} />
                <span className="mt-2 flex items-start gap-2">
                  <input type="radio" name={`${idPrefix}-social-style`} checked={profile.socialStyle === socialStyle} onChange={() => onChange({ ...profile, socialStyle })} className="mt-0.5 accent-white" />
                  <span><span className="block text-[10px] text-neutral-300">{SOCIAL_STYLE_LABELS[socialStyle].label}</span><span className="sr-only">{SOCIAL_STYLE_LABELS[socialStyle].description}</span></span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
