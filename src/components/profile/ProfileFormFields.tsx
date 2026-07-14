import type { ChangeEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import {
  PROFILE_NAME_STYLES,
  PROFILE_SOCIAL_ICONS,
  PROFILE_SOCIAL_PLATFORMS,
  PROFILE_SPECIALTIES,
  PROFILE_TEMPLATES,
  getDefaultProfileSocialIcon,
  type ProfileDraft,
  type ProfileNameStyle,
  type ProfileSocialIconName,
  type ProfileSocialPlatform,
  type ProfileSpecialty,
  type ProfileTemplate,
} from "@/lib/profile-model";
import ProfileSocialIcon from "./ProfileSocialIcon";

const INPUT_CLASS = "min-h-11 w-full border border-neutral-800 bg-white/[0.02] px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const NAME_STYLE_LABELS: Record<ProfileNameStyle, string> = {
  classic: "Classic",
  "film-credit": "Film credit",
  editorial: "Editorial",
  "bold-print": "Bold print",
};

const NAME_STYLE_CLASSES: Record<ProfileNameStyle, string> = {
  classic: "font-normal tracking-[0.04em]",
  "film-credit": "font-mono font-bold uppercase tracking-[0.14em]",
  editorial: "italic tracking-[0.02em]",
  "bold-print": "font-bold tracking-[0.01em]",
};

const TEMPLATE_LABELS: Record<ProfileTemplate, { description: string; label: string }> = {
  "contact-sheet": {
    description: "An editorial split header followed by a wide contact sheet.",
    label: "Contact sheet",
  },
  "print-index": {
    description: "A compact centered identity block above the same work.",
    label: "Print index",
  },
};

const SOCIAL_LABELS: Record<ProfileSocialPlatform, string> = {
  instagram: "Instagram",
  discord: "Discord",
  vsco: "VSCO",
  website: "Website",
  email: "Email",
};

const SOCIAL_ICON_LABELS: Record<ProfileSocialIconName, string> = {
  discord: "Discord",
  globe: "Website",
  instagram: "Instagram",
  mail: "Email",
  vsco: "VSCO",
};

const SOCIAL_PLACEHOLDERS: Record<ProfileSocialPlatform, string> = {
  instagram: "https://www.instagram.com/your-name/",
  discord: "https://discord.com/users/...",
  vsco: "https://vsco.co/your-name/gallery",
  website: "https://your-site.example",
  email: "you@example.com",
};

interface Props {
  avatarBusy?: boolean;
  avatarPreviewUrl?: string | null;
  canDisable?: boolean;
  canEnable?: boolean;
  disabled?: boolean;
  idPrefix?: string;
  onAvatarChange?: (file: File) => void;
  onAvatarRemove?: () => void;
  onChange: (profile: ProfileDraft) => void;
  profile: ProfileDraft;
  showPrivacy?: boolean;
  showPublishing?: boolean;
}

export default function ProfileFormFields({
  avatarBusy = false,
  avatarPreviewUrl = null,
  canDisable = true,
  canEnable = true,
  disabled = false,
  idPrefix = "member-profile",
  onAvatarChange,
  onAvatarRemove,
  onChange,
  profile,
  showPrivacy = true,
  showPublishing = true,
}: Props) {
  const update = <Key extends keyof ProfileDraft>(key: Key, nextValue: ProfileDraft[Key]) => {
    onChange({ ...profile, [key]: nextValue });
  };

  const updateSocial = (platform: ProfileSocialPlatform, nextValue: string) => {
    const current = profile.socials.find((social) => social.platform === platform);
    const remaining = profile.socials.filter((social) => social.platform !== platform);
    const socials = nextValue
      ? [...remaining, { icon: current?.icon ?? getDefaultProfileSocialIcon(platform), platform, value: nextValue }]
      : remaining;
    const ordered = PROFILE_SOCIAL_PLATFORMS.flatMap((allowedPlatform) =>
      socials.filter((social) => social.platform === allowedPlatform),
    );
    update("socials", ordered);
  };

  const updateSocialIcon = (platform: ProfileSocialPlatform, icon: ProfileSocialIconName) => {
    const current = profile.socials.find((social) => social.platform === platform);
    if (!current) return;
    update("socials", profile.socials.map((social) =>
      social.platform === platform ? { ...social, icon } : social,
    ));
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
    <div className="divide-y divide-neutral-800 border border-neutral-800 bg-white/[0.02]">
      {showPublishing && (
        <section className="p-4 sm:p-6" aria-labelledby={`${idPrefix}-publishing-heading`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h2 id={`${idPrefix}-publishing-heading`} className="text-sm tracking-wider text-neutral-100">Publishing</h2>
              <p id={`${idPrefix}-publishing-help`} className="mt-1 text-xs leading-5 text-neutral-500">
                Profiles start disabled. Active membership is required to publish or edit; an existing profile can always be disabled.
              </p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-neutral-300">
              <input
                type="checkbox"
                role="switch"
                aria-describedby={`${idPrefix}-publishing-help`}
                checked={profile.enabled}
                disabled={profile.enabled ? !canDisable : !canEnable}
                onChange={(event) => update("enabled", event.target.checked)}
                className="size-4 accent-white disabled:cursor-not-allowed"
              />
              Enable public profile
            </label>
          </div>
        </section>
      )}

      <fieldset disabled={disabled} className="contents">
        <legend className="sr-only">Profile information</legend>
        <section className="p-4 sm:p-6" aria-labelledby={`${idPrefix}-identity-heading`}>
          <h2 id={`${idPrefix}-identity-heading`} className="text-sm tracking-wider text-neutral-100">Identity</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div>
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-neutral-700 bg-neutral-900 text-neutral-600">
                {avatarPreviewUrl || profile.avatarUrl ? (
                  <img src={avatarPreviewUrl || profile.avatarUrl || ""} alt="Profile picture preview" className="size-full object-cover" />
                ) : (
                  <Camera aria-hidden="true" size={24} />
                )}
              </div>
              <label className={`mt-3 inline-flex min-h-11 items-center border border-neutral-700 px-3 text-[9px] uppercase tracking-[0.14em] text-neutral-300 ${disabled || avatarBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-neutral-500"}`}>
                <input type="file" accept="image/jpeg,.jpg,.jpeg" disabled={disabled || avatarBusy} onChange={handleAvatarChange} className="sr-only" />
                {avatarBusy ? "Optimizing" : "Change picture"}
              </label>
              {profile.avatarUrl && onAvatarRemove && (
                <button type="button" disabled={avatarBusy} onClick={onAvatarRemove} className="mt-2 flex min-h-11 items-center gap-2 text-[9px] uppercase tracking-wider text-red-400 disabled:opacity-50">
                  <Trash2 aria-hidden="true" size={13} /> Remove
                </button>
              )}
              <p className="mt-2 text-[9px] leading-4 text-neutral-600">JPG only. Optimized to 512 px and 200 KB or less.</p>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Display name</span>
                <input value={profile.displayName} onChange={(event) => update("displayName", event.target.value)} maxLength={80} required className={INPUT_CLASS} />
              </label>
              <fieldset>
                <legend className="text-[10px] uppercase tracking-wider text-neutral-500">Display name style</legend>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PROFILE_NAME_STYLES.map((style) => (
                    <label key={style} className={`flex min-h-14 cursor-pointer items-center gap-3 border px-3 py-2 ${profile.nameStyle === style ? "border-white bg-white/[0.06]" : "border-neutral-800"}`}>
                      <input type="radio" name={`${idPrefix}-name-style`} checked={profile.nameStyle === style} onChange={() => update("nameStyle", style)} className="accent-white" />
                      <span>
                        <span className="block text-[9px] uppercase tracking-wider text-neutral-500">{NAME_STYLE_LABELS[style]}</span>
                        <span className={`mt-0.5 block break-words text-sm text-neutral-100 ${NAME_STYLE_CLASSES[style]}`} style={style === "film-credit" ? undefined : { fontFamily: "'Playfair Display', serif" }}>
                          {profile.displayName || "Member name"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </section>

        <section className="p-4 sm:p-6" aria-labelledby={`${idPrefix}-details-heading`}>
          <h2 id={`${idPrefix}-details-heading`} className="text-sm tracking-wider text-neutral-100">Profile details</h2>
          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Profile URL</span>
              <span className="flex min-w-0 flex-col sm:flex-row">
                <span className="flex min-h-11 items-center border border-b-0 border-neutral-800 bg-neutral-900 px-3 text-xs text-neutral-500 sm:border-b sm:border-r-0">/profile/</span>
                <input aria-describedby={`${idPrefix}-username-help`} value={profile.username} onChange={(event) => update("username", event.target.value.toLowerCase())} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={INPUT_CLASS} />
              </span>
              <span id={`${idPrefix}-username-help`} className="block text-[9px] leading-4 text-neutral-600">3–30 lowercase letters, numbers, and single hyphens.</span>
            </label>
            <label className="block space-y-1.5">
              <span className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-wider text-neutral-500">
                <span>Bio</span><span>{profile.bio.length}/500</span>
              </span>
              <textarea value={profile.bio} onChange={(event) => update("bio", event.target.value)} maxLength={500} rows={5} className={`${INPUT_CLASS} resize-y`} />
            </label>
          </div>
        </section>

        <section className="p-4 sm:p-6" aria-labelledby={`${idPrefix}-socials-heading`}>
          <h2 id={`${idPrefix}-socials-heading`} className="text-sm tracking-wider text-neutral-100">Social links</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Only filled links appear publicly. Choose the simple icon shown for each link.</p>
          <div className="mt-4 space-y-3">
            {PROFILE_SOCIAL_PLATFORMS.map((platform) => {
              const social = profile.socials.find((entry) => entry.platform === platform);
              const selectedIcon = social?.icon ?? getDefaultProfileSocialIcon(platform);
              return (
                <div key={platform} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
                  <span className="flex size-11 items-center justify-center border border-neutral-800 text-neutral-400" title={SOCIAL_LABELS[platform]}>
                    <ProfileSocialIcon platform={selectedIcon} />
                    <span className="sr-only">{SOCIAL_LABELS[platform]}</span>
                  </span>
                  <span className="grid min-w-0 gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
                    <select
                      aria-label={`${SOCIAL_LABELS[platform]} icon`}
                      value={selectedIcon}
                      disabled={!social}
                      onChange={(event) => updateSocialIcon(platform, event.target.value as ProfileSocialIconName)}
                      className={`${INPUT_CLASS} disabled:opacity-40`}
                    >
                      {PROFILE_SOCIAL_ICONS.map((icon) => <option key={icon} value={icon}>{SOCIAL_ICON_LABELS[icon]}</option>)}
                    </select>
                    <input
                      aria-label={`${SOCIAL_LABELS[platform]} link`}
                      type={platform === "email" ? "email" : "url"}
                      value={social?.value ?? ""}
                      onChange={(event) => updateSocial(platform, event.target.value)}
                      maxLength={300}
                      placeholder={SOCIAL_PLACEHOLDERS[platform]}
                      className={INPUT_CLASS}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="p-4 sm:p-6">
          <fieldset>
            <legend className="text-sm tracking-wider text-neutral-100">Photography roles</legend>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Choose the plain-text specialties you want shown on your profile.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PROFILE_SPECIALTIES.map((specialty) => (
                <label key={specialty} className={`flex min-h-11 cursor-pointer items-center border px-3 text-[10px] uppercase tracking-wider ${profile.specialties.includes(specialty) ? "border-white bg-white/[0.06] text-white" : "border-neutral-800 text-neutral-500"}`}>
                  <input type="checkbox" checked={profile.specialties.includes(specialty)} onChange={() => toggleSpecialty(specialty)} className="sr-only" />
                  {specialty}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        {showPrivacy && (
          <section className="p-4 sm:p-6" aria-labelledby={`${idPrefix}-privacy-heading`}>
            <h2 id={`${idPrefix}-privacy-heading`} className="text-sm tracking-wider text-neutral-100">Privacy</h2>
            <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" role="switch" checked={profile.anonymous} onChange={(event) => update("anonymous", event.target.checked)} className="mt-1 size-4 accent-white" />
              <span>
                <span className="block text-[10px] uppercase tracking-[0.15em] text-neutral-300">Anonymous profile</span>
                <span className="mt-1 block max-w-2xl text-xs leading-5 text-neutral-500">Your public page and gallery photos become image-only. Photos uploaded anonymously remain excluded from your profile.</span>
              </span>
            </label>
          </section>
        )}

        <section className="p-4 sm:p-6">
          <fieldset>
            <legend className="text-sm tracking-wider text-neutral-100">Profile template</legend>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Change the distribution while keeping the same content.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PROFILE_TEMPLATES.map((template) => (
                <label key={template} className={`cursor-pointer border p-4 ${profile.template === template ? "border-white bg-white/[0.06]" : "border-neutral-800"}`}>
                  <span className={`mb-4 block h-20 border border-neutral-700 p-2 ${template === "print-index" ? "text-center" : "grid grid-cols-[1fr_2fr] gap-2"}`} aria-hidden="true">
                    <span className="mx-auto block size-5 rounded-full bg-neutral-600" />
                    <span className="block space-y-1.5"><span className="block h-1.5 w-2/3 bg-neutral-500" /><span className="block h-1 w-full bg-neutral-700" /><span className="block h-1 w-4/5 bg-neutral-700" /></span>
                  </span>
                  <span className="flex items-start gap-3">
                    <input type="radio" name={`${idPrefix}-template`} checked={profile.template === template} onChange={() => update("template", template)} className="mt-0.5 accent-white" />
                    <span><span className="block text-xs text-neutral-200">{TEMPLATE_LABELS[template].label}</span><span className="mt-1 block text-[10px] leading-4 text-neutral-500">{TEMPLATE_LABELS[template].description}</span></span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      </fieldset>
    </div>
  );
}
