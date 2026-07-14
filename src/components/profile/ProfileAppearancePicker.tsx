import {
  PROFILE_DECORATIONS,
  PROFILE_TEMPLATES,
  type ProfileDecoration,
  type ProfileDraft,
  type ProfileTemplate,
} from "@/lib/profile-model";

const TEMPLATE_LABELS: Record<ProfileTemplate, { description: string; label: string }> = {
  "contact-sheet": { description: "Portrait and intro side by side.", label: "Contact sheet" },
  "print-index": { description: "A centered, compact introduction.", label: "Print index" },
  "split-frame": { description: "Bold name beside a narrow portrait.", label: "Split frame" },
  "negative-strip": { description: "A horizontal film-strip header.", label: "Negative strip" },
};

const DECORATION_LABELS: Record<ProfileDecoration, { description: string; label: string }> = {
  none: { description: "Clean edges and quiet spacing.", label: "None" },
  "film-frame": { description: "A subtle printed-film border.", label: "Film frame" },
  "contact-marks": { description: "Contact-sheet numbers and crop marks.", label: "Contact marks" },
  viewfinder: { description: "Fine focusing corners around the intro.", label: "Viewfinder" },
};

interface Props {
  idPrefix: string;
  onChange: (profile: ProfileDraft) => void;
  profile: ProfileDraft;
}

function LayoutPreview({ template }: { template: ProfileTemplate }) {
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
      : "border border-neutral-800";
  return (
    <span className={`relative flex h-12 items-center justify-center ${frameClass}`}>
      <span className="h-1 w-1/2 bg-neutral-600" />
      {decoration === "contact-marks" && <span className="absolute inset-x-2 bottom-1 flex justify-between font-mono text-[7px] text-neutral-600"><i>01</i><i>36</i></span>}
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
    </section>
  );
}
