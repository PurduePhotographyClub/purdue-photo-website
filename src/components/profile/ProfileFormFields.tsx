import type { ChangeEvent } from "react";
import { Camera, KeyRound, Trash2 } from "lucide-react";
import {
  PROFILE_NAME_STYLES,
  PROFILE_SPECIALTIES,
  type ProfileDraft,
  type ProfileNameStyle,
  type ProfileSpecialty,
} from "@/lib/profile-model";
import ProfileAppearancePicker from "./ProfileAppearancePicker";
import ProfileSocialLinksEditor from "./ProfileSocialLinksEditor";

const INPUT_CLASS = "min-h-11 w-full border border-neutral-800 bg-neutral-950/60 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const NAME_STYLE_LABELS: Record<ProfileNameStyle, string> = {
  classic: "Classic",
  "film-credit": "Film credit",
  editorial: "Editorial",
  "bold-print": "Bold print",
  condensed: "Condensed",
  typewriter: "Typewriter",
  "small-caps": "Small caps",
};

const NAME_STYLE_CLASSES: Record<ProfileNameStyle, string> = {
  classic: "font-normal tracking-[0.04em]",
  "film-credit": "font-mono font-bold uppercase tracking-[0.14em]",
  editorial: "italic tracking-[0.02em]",
  "bold-print": "font-bold tracking-[0.01em]",
  condensed: "font-sans font-semibold uppercase tracking-[-0.03em]",
  typewriter: "font-mono tracking-[0.08em]",
  "small-caps": "font-serif uppercase tracking-[0.18em]",
};

const SERIF_NAME_STYLES = new Set<ProfileNameStyle>([
  "classic",
  "editorial",
  "bold-print",
  "small-caps",
]);

interface Props {
  access?: {
    avatarBusy?: boolean;
    canDisable?: boolean;
    canEnable?: boolean;
    disabled?: boolean;
  };
  avatarPreviewUrl?: string | null;
  idPrefix?: string;
  onAvatarChange?: (file: File) => void;
  onAvatarRemove?: () => void;
  onChange: (profile: ProfileDraft) => void;
  profile: ProfileDraft;
  variant?: "member" | "staff";
}

export default function ProfileFormFields({
  access = {},
  avatarPreviewUrl = null,
  idPrefix = "member-profile",
  onAvatarChange,
  onAvatarRemove,
  onChange,
  profile,
  variant = "member",
}: Props) {
  const {
    avatarBusy = false,
    canDisable = true,
    canEnable = true,
    disabled = false,
  } = access;
  const showMemberControls = variant === "member";
  const update = <Key extends keyof ProfileDraft>(key: Key, value: ProfileDraft[Key]) => {
    onChange({ ...profile, [key]: value });
  };

  const toggleSpecialty = (specialty: ProfileSpecialty) => {
    update(
      "specialties",
      profile.specialties.includes(specialty)
        ? profile.specialties.filter((entry) => entry !== specialty)
        : [...profile.specialties, specialty],
    );
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onAvatarChange?.(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-3">
      {showMemberControls && (
        <section className="border border-neutral-800 bg-white/[0.02] p-4 sm:p-5" aria-labelledby={`${idPrefix}-publishing-heading`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className={`size-2 rounded-full ${profile.enabled ? "bg-emerald-400" : "bg-neutral-700"}`} />
                <h2 id={`${idPrefix}-publishing-heading`} className="text-sm tracking-wide text-neutral-100">Public profile</h2>
              </div>
              <p id={`${idPrefix}-publishing-help`} className="mt-1 text-xs leading-5 text-neutral-500">
                {profile.enabled
                  ? "Anyone can visit your page and browse the photos you have shared."
                  : "Only you can see this draft. Turn it on when you are ready to share."}
              </p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-neutral-700 px-3 text-[10px] uppercase tracking-[0.14em] text-neutral-300">
              <input
                type="checkbox"
                role="switch"
                aria-describedby={`${idPrefix}-publishing-help`}
                checked={profile.enabled}
                disabled={profile.enabled ? !canDisable : !canEnable}
                onChange={(event) => onChange(event.target.checked
                  ? { ...profile, enabled: true }
                  : { ...profile, anonymous: false, anonymousId: null, enabled: false })}
                className="size-4 accent-white disabled:cursor-not-allowed"
              />
              Enable public profile
            </label>
          </div>
        </section>
      )}

      <fieldset disabled={disabled} className="contents">
        <legend className="sr-only">Profile information</legend>

        <section className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5" aria-labelledby={`${idPrefix}-identity-heading`}>
          <h2 id={`${idPrefix}-identity-heading`} className="text-sm tracking-wide text-neutral-100">Identity</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-[144px_minmax(0,1fr)]">
            <div>
              <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border border-neutral-700 bg-neutral-900 text-neutral-600">
                {avatarPreviewUrl || profile.avatarUrl ? (
                  <img src={avatarPreviewUrl || profile.avatarUrl || ""} alt={`${profile.displayName || "Member"} portrait`} className="size-full object-cover" />
                ) : (
                  <Camera aria-hidden="true" size={24} />
                )}
              </div>
              <label className={`mt-2 inline-flex min-h-11 items-center border border-neutral-700 px-3 text-[9px] uppercase tracking-[0.14em] text-neutral-300 ${disabled || avatarBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-neutral-500"}`}>
                <input type="file" accept="image/jpeg,.jpg,.jpeg" disabled={disabled || avatarBusy} onChange={handleAvatarChange} className="sr-only" />
                {avatarBusy ? "Optimizing" : "Change picture"}
              </label>
              {profile.avatarUrl && onAvatarRemove && (
                <button type="button" disabled={avatarBusy} onClick={onAvatarRemove} className="mt-1 flex min-h-11 items-center gap-2 text-[9px] uppercase tracking-wider text-red-400 disabled:opacity-50">
                  <Trash2 aria-hidden="true" size={13} /> Remove
                </button>
              )}
              <p className="mt-1 text-[9px] leading-4 text-neutral-600">JPG only. Up to 512px and 200KB.</p>
            </div>

            <div className="min-w-0 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Display name</span>
                <input value={profile.displayName} onChange={(event) => update("displayName", event.target.value)} maxLength={80} required className={INPUT_CLASS} />
              </label>
              <fieldset>
                <legend className="text-[10px] uppercase tracking-wider text-neutral-500">Name style</legend>
                <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {PROFILE_NAME_STYLES.map((style) => (
                    <label key={style} className={`min-w-0 cursor-pointer border p-2.5 ${profile.nameStyle === style ? "border-white bg-white/[0.055]" : "border-neutral-800 hover:border-neutral-600"}`}>
                      <span className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-neutral-500">
                        <input type="radio" name={`${idPrefix}-name-style`} checked={profile.nameStyle === style} onChange={() => update("nameStyle", style)} className="accent-white" />
                        {NAME_STYLE_LABELS[style]}
                      </span>
                      <span className={`mt-2 block truncate text-sm text-neutral-100 ${NAME_STYLE_CLASSES[style]}`} style={SERIF_NAME_STYLES.has(style) ? { fontFamily: "'Playfair Display', serif" } : undefined}>
                        {profile.displayName || "Member name"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </section>

        <section className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5" aria-labelledby={`${idPrefix}-details-heading`}>
          <h2 id={`${idPrefix}-details-heading`} className="text-sm tracking-wide text-neutral-100">Profile details</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Profile URL</span>
              <span className="flex min-w-0">
                <span className="flex min-h-11 items-center border border-r-0 border-neutral-800 bg-neutral-900 px-3 text-xs text-neutral-500">/profile/</span>
                <input aria-describedby={`${idPrefix}-username-help`} value={profile.username} onChange={(event) => update("username", event.target.value.toLowerCase())} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={INPUT_CLASS} />
              </span>
              <span id={`${idPrefix}-username-help`} className="block text-[9px] leading-4 text-neutral-600">
                {profile.anonymous ? "Hidden while anonymous; it returns when you switch back." : "3–30 lowercase letters, numbers, and single hyphens."}
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-wider text-neutral-500"><span>Bio</span><span>{profile.bio.length}/500</span></span>
              <textarea value={profile.bio} onChange={(event) => update("bio", event.target.value)} maxLength={500} rows={4} placeholder="A short introduction to your work." className={`${INPUT_CLASS} resize-y`} />
            </label>
          </div>
        </section>

        <ProfileSocialLinksEditor
          disabled={disabled}
          idPrefix={idPrefix}
          onChange={(socials) => update("socials", socials)}
          socials={profile.socials}
        />

        <section className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5">
          <fieldset>
            <legend className="text-sm tracking-wide text-neutral-100">Photography roles</legend>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Choose the kinds of work you want listed.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROFILE_SPECIALTIES.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  aria-pressed={profile.specialties.includes(specialty)}
                  disabled={disabled}
                  onClick={() => toggleSpecialty(specialty)}
                  className={`flex min-h-11 items-center border px-3 text-[10px] uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 ${profile.specialties.includes(specialty) ? "border-white bg-white/[0.055] text-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600"}`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        {showMemberControls && (
          <section className="border border-neutral-800 bg-white/[0.015] p-4 sm:p-5" aria-labelledby={`${idPrefix}-privacy-heading`}>
            <h2 id={`${idPrefix}-privacy-heading`} className="text-sm tracking-wide text-neutral-100">Privacy</h2>
            <label className={`mt-3 flex min-h-11 items-start gap-3 border border-neutral-800 p-3 ${profile.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <input type="checkbox" role="switch" checked={profile.anonymous} disabled={!profile.enabled} onChange={(event) => update("anonymous", event.target.checked)} className="mt-1 size-4 accent-white disabled:cursor-not-allowed" />
              <span>
                <span className="block text-[10px] uppercase tracking-[0.15em] text-neutral-300">Anonymous profile</span>
                <span className="mt-1 block max-w-3xl text-xs leading-5 text-neutral-500">
                  Your public page and gallery use PPC Member instead of your name. Camera and lens details are hidden; titles, captions, and tags stay visible. Photos uploaded anonymously remain excluded from your profile.
                </span>
                {!profile.enabled && <span className="mt-1 block text-[10px] text-neutral-600">Enable your public profile first.</span>}
              </span>
            </label>
            {profile.anonymous && (
              <div className="mt-3 flex items-start gap-3 border-l border-neutral-700 pl-3 text-[10px] leading-5 text-neutral-500">
                <KeyRound aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
                <span>{profile.anonymousId ? `Private profile link: /profile/${profile.anonymousId}` : "A private profile link will be created when you save."}</span>
              </div>
            )}
          </section>
        )}

        <ProfileAppearancePicker idPrefix={idPrefix} onChange={onChange} profile={profile} />
      </fieldset>
    </div>
  );
}
