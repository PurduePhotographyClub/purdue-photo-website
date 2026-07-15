import {
  PROFILE_DECORATIONS,
  PROFILE_PALETTES,
  PROFILE_TEMPLATES,
  type ProfileDecoration,
  type ProfileDraft,
  type ProfilePalette,
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

export default function ProfileAppearancePicker({ idPrefix, onChange, profile }: Props) {
  return (
    <section aria-labelledby={`${idPrefix}-appearance-heading`} className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5">
      <h2 id={`${idPrefix}-appearance-heading`} className="text-sm tracking-wide text-neutral-100">Layout and details</h2>
      <p className="mt-1 text-xs leading-5 text-neutral-500">Pick the structure, then add a light finishing detail.</p>

      <fieldset className="mt-4">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Layout</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PROFILE_TEMPLATES.map((template) => (
            <label key={template} className={`cursor-pointer border p-3 transition-colors ${profile.template === template ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
              <LayoutPreview template={template} />
              <span className="mt-3 flex items-start gap-2.5">
                <input type="radio" name={`${idPrefix}-template`} checked={profile.template === template} onChange={() => onChange({ ...profile, template })} className="mt-0.5 accent-white" />
                <span><span className="block text-xs text-neutral-200">{TEMPLATE_LABELS[template].label}</span><span className="mt-0.5 block text-[10px] leading-4 text-neutral-500">{TEMPLATE_LABELS[template].description}</span></span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Decoration</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PROFILE_DECORATIONS.map((decoration) => (
            <label key={decoration} className={`cursor-pointer border p-2.5 transition-colors ${profile.decoration === decoration ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
              <DecorationPreview decoration={decoration} />
              <span className="mt-2 flex items-start gap-2">
                <input type="radio" name={`${idPrefix}-decoration`} checked={profile.decoration === decoration} onChange={() => onChange({ ...profile, decoration })} className="mt-0.5 accent-white" />
                <span><span className="block text-[10px] text-neutral-300">{DECORATION_LABELS[decoration].label}</span><span className="sr-only">{DECORATION_LABELS[decoration].description}</span></span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Color palette</legend>
        <p className="mt-1 text-[10px] leading-4 text-neutral-600">Choose a fixed, readable accent for your profile header.</p>
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
    </section>
  );
}
