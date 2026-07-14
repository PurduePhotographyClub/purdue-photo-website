import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import {
  PROFILE_SOCIAL_ICONS,
  PROFILE_SOCIAL_PLATFORMS,
  getDefaultProfileSocialIcon,
  getProfileSocialValidationError,
  normalizeProfileSocialValue,
  type ProfileSocial,
  type ProfileSocialIconName,
  type ProfileSocialPlatform,
} from "@/lib/profile-model";
import ProfileSocialIcon from "./ProfileSocialIcon";

const INPUT_CLASS = "min-h-11 w-full border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const LABELS: Record<ProfileSocialPlatform, string> = {
  discord: "Discord",
  email: "Email",
  instagram: "Instagram",
  vsco: "VSCO",
  website: "Website",
};

const ICON_LABELS: Record<ProfileSocialIconName, string> = {
  discord: "Discord",
  globe: "Website",
  instagram: "Instagram",
  mail: "Email",
  vsco: "VSCO",
};

const PLACEHOLDERS: Record<ProfileSocialPlatform, string> = {
  discord: "https://discord.com/users/...",
  email: "you@example.com",
  instagram: "https://instagram.com/your-name/",
  vsco: "https://vsco.co/your-name/gallery",
  website: "https://your-site.example",
};

interface SocialDraft {
  icon: ProfileSocialIconName;
  originalPlatform: ProfileSocialPlatform | null;
  platform: ProfileSocialPlatform;
  value: string;
}

interface Props {
  disabled?: boolean;
  idPrefix: string;
  onChange: (socials: ProfileSocial[]) => void;
  socials: ProfileSocial[];
}

function firstAvailablePlatform(socials: ProfileSocial[]) {
  const used = new Set(socials.map((social) => social.platform));
  return PROFILE_SOCIAL_PLATFORMS.find((platform) => !used.has(platform)) ?? null;
}

function createDraft(platform: ProfileSocialPlatform): SocialDraft {
  return {
    icon: getDefaultProfileSocialIcon(platform),
    originalPlatform: null,
    platform,
    value: "",
  };
}

export default function ProfileSocialLinksEditor({
  disabled = false,
  idPrefix,
  onChange,
  socials,
}: Props) {
  const [draft, setDraft] = useState<SocialDraft | null>(null);
  const availablePlatform = firstAvailablePlatform(socials);
  const validationError = draft
    ? getProfileSocialValidationError(draft.platform, draft.value)
    : null;

  const beginAdd = () => {
    if (disabled || !availablePlatform) return;
    setDraft(createDraft(availablePlatform));
  };

  const beginEdit = (social: ProfileSocial) => {
    if (disabled) return;
    setDraft({
      icon: social.icon,
      originalPlatform: social.platform,
      platform: social.platform,
      value: social.value,
    });
  };

  const remove = (platform: ProfileSocialPlatform) => {
    onChange(socials.filter((social) => social.platform !== platform));
  };

  const save = () => {
    if (!draft) return;
    const normalizedValue = normalizeProfileSocialValue(draft.platform, draft.value);
    if (!normalizedValue) return;
    const nextSocial: ProfileSocial = {
      icon: draft.icon,
      platform: draft.platform,
      value: normalizedValue,
    };
    const remaining = socials.filter(
      (social) => social.platform !== draft.originalPlatform && social.platform !== draft.platform,
    );
    const next = PROFILE_SOCIAL_PLATFORMS.flatMap((platform) =>
      [...remaining, nextSocial].filter((social) => social.platform === platform),
    );
    onChange(next);
    setDraft(null);
  };

  const platformOptions = draft
    ? PROFILE_SOCIAL_PLATFORMS.filter((platform) =>
        platform === draft.originalPlatform || !socials.some((social) => social.platform === platform),
      )
    : [];

  return (
    <section aria-labelledby={`${idPrefix}-socials-heading`} className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${idPrefix}-socials-heading`} className="text-sm tracking-wide text-neutral-100">Social links</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Add only the places you want people to find you.</p>
        </div>
        <button
          type="button"
          disabled={disabled || !availablePlatform}
          onClick={beginAdd}
          className="inline-flex min-h-11 items-center gap-2 border border-neutral-700 px-3 text-[10px] uppercase tracking-[0.14em] text-neutral-200 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus aria-hidden="true" size={15} /> Add social
        </button>
      </div>

      {socials.length === 0 ? (
        <button
          type="button"
          disabled={disabled || !availablePlatform}
          onClick={beginAdd}
          className="mt-4 flex min-h-20 w-full items-center justify-center gap-2 border border-dashed border-neutral-800 px-4 text-xs text-neutral-500 hover:border-neutral-600 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden="true" size={16} /> Add your first link
        </button>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {socials.map((social) => (
            <li key={social.platform} className="flex min-w-0 items-center gap-3 border border-neutral-800 bg-neutral-950/50 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center border border-neutral-800 text-neutral-400">
                <ProfileSocialIcon platform={social.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-400">{LABELS[social.platform]}</span>
                <span className="mt-0.5 block truncate text-xs text-neutral-600">{social.value}</span>
              </span>
              <button type="button" onClick={() => beginEdit(social)} className="flex size-11 shrink-0 items-center justify-center text-neutral-500 hover:text-white" aria-label={`Edit ${LABELS[social.platform]}`}>
                <Pencil aria-hidden="true" size={15} />
              </button>
              <button type="button" onClick={() => remove(social.platform)} className="flex size-11 shrink-0 items-center justify-center text-neutral-600 hover:text-red-400" aria-label={`Remove ${LABELS[social.platform]}`}>
                <Trash2 aria-hidden="true" size={15} /><span className="sr-only">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <ModalDialog ariaLabel={draft.originalPlatform ? "Edit social link" : "Add social link"} onClose={() => setDraft(null)}>
          <div className="flex min-h-dvh items-end justify-center bg-black/75 p-0 sm:items-center sm:p-5">
            <div className="w-full border border-neutral-700 bg-neutral-950 p-5 shadow-2xl sm:max-w-lg sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">Profile link</p>
                  <h3 className="mt-1 text-xl text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {draft.originalPlatform ? "Edit social" : "Add social"}
                  </h3>
                </div>
                <button type="button" onClick={() => setDraft(null)} className="flex size-11 items-center justify-center text-neutral-500 hover:text-white" aria-label="Close social link dialog">
                  <X aria-hidden="true" size={19} />
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Service</span>
                  <select
                    value={draft.platform}
                    onChange={(event) => {
                      const platform = event.target.value as ProfileSocialPlatform;
                      setDraft({ ...draft, icon: getDefaultProfileSocialIcon(platform), platform });
                    }}
                    className={INPUT_CLASS}
                  >
                    {platformOptions.map((platform) => <option key={platform} value={platform}>{LABELS[platform]}</option>)}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Icon</span>
                  <select value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value as ProfileSocialIconName })} className={INPUT_CLASS}>
                    {PROFILE_SOCIAL_ICONS.map((icon) => <option key={icon} value={icon}>{ICON_LABELS[icon]}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-4 block space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">{draft.platform === "email" ? "Email address" : "Link"}</span>
                <input
                  id={`${idPrefix}-social-value`}
                  autoFocus
                  type={draft.platform === "email" ? "email" : "url"}
                  value={draft.value}
                  onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      save();
                    }
                  }}
                  maxLength={300}
                  placeholder={PLACEHOLDERS[draft.platform]}
                  aria-invalid={validationError ? "true" : undefined}
                  aria-describedby={validationError ? `${idPrefix}-social-value-error` : undefined}
                  className={INPUT_CLASS}
                />
                {validationError && (
                  <span id={`${idPrefix}-social-value-error`} role="alert" className="block text-[10px] leading-4 text-red-300">
                    {validationError}
                  </span>
                )}
              </label>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDraft(null)} className="min-h-11 border border-neutral-700 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-500 hover:text-white">Cancel</button>
                <button type="button" disabled={!draft.value.trim() || Boolean(validationError)} onClick={save} className="min-h-11 bg-white px-4 text-[10px] uppercase tracking-wider text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40">{draft.originalPlatform ? "Save link" : "Add link"}</button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </section>
  );
}
