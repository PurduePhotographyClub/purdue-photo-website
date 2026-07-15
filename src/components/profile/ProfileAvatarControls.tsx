import type { ChangeEvent } from "react";
import { Camera, RotateCcw, Trash2 } from "lucide-react";
import {
  PROFILE_AVATAR_POSITION_MAX,
  PROFILE_AVATAR_POSITION_MIN,
  PROFILE_AVATAR_ZOOM_MAX,
  PROFILE_AVATAR_ZOOM_MIN,
  getProfileAvatarImageStyle,
  resolveProfileAvatarShape,
  type ProfileDraft,
} from "@/lib/profile-model";

interface Props {
  avatarBusy: boolean;
  avatarPreviewUrl?: string | null;
  disabled: boolean;
  idPrefix: string;
  onAvatarChange?: (file: File) => void;
  onAvatarRemove?: () => void;
  onChange: (profile: ProfileDraft) => void;
  profile: ProfileDraft;
}

function getPreviewShapeClass(profile: ProfileDraft) {
  const shape = resolveProfileAvatarShape(profile);
  if (shape === "square") return "rounded-none";
  if (shape === "rounded") return "rounded-[12%]";
  return "rounded-full";
}

export default function ProfileAvatarControls({
  avatarBusy,
  avatarPreviewUrl = null,
  disabled,
  idPrefix,
  onAvatarChange,
  onAvatarRemove,
  onChange,
  profile,
}: Props) {
  const source = avatarPreviewUrl || profile.avatarUrl;
  const hasAvatar = Boolean(source);
  const update = <Key extends "avatarPositionX" | "avatarPositionY" | "avatarZoom">(
    key: Key,
    value: ProfileDraft[Key],
  ) => onChange({ ...profile, [key]: value });

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onAvatarChange?.(file);
    event.target.value = "";
  };

  const resetFraming = () => onChange({
    ...profile,
    avatarPositionX: 50,
    avatarPositionY: 50,
    avatarZoom: 100,
  });

  return (
    <div className="border border-neutral-800 bg-neutral-950/50 p-4" aria-labelledby={`${idPrefix}-avatar-heading`}>
      <div>
        <h3 id={`${idPrefix}-avatar-heading`} className="text-xs text-neutral-200">Portrait framing</h3>
        <p className="mt-1 text-[10px] leading-4 text-neutral-500">
          Upload first, then zoom and move the focal point until the crop feels right.
        </p>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <div
            className={`relative flex size-44 items-center justify-center overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-500 ${getPreviewShapeClass(profile)}`}
            data-profile-avatar-preview="true"
            data-profile-avatar-shape={resolveProfileAvatarShape(profile)}
          >
            {source ? (
              <img
                src={source}
                alt={`${profile.displayName || "Member"} portrait preview`}
                className="size-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none"
                draggable={false}
                style={getProfileAvatarImageStyle(profile)}
              />
            ) : (
              <Camera aria-hidden="true" size={30} />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className={`inline-flex min-h-11 items-center border border-neutral-700 px-3 text-[9px] uppercase tracking-[0.14em] text-neutral-300 ${disabled || avatarBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-neutral-500"}`}>
              <input
                type="file"
                accept="image/jpeg,.jpg,.jpeg"
                disabled={disabled || avatarBusy}
                onChange={handleAvatarChange}
                className="sr-only"
              />
              {avatarBusy ? "Optimizing" : hasAvatar ? "Change picture" : "Choose picture"}
            </label>
            {profile.avatarUrl && onAvatarRemove && (
              <button
                type="button"
                disabled={disabled || avatarBusy}
                onClick={onAvatarRemove}
                className="flex min-h-11 items-center gap-2 px-2 text-[9px] uppercase tracking-wider text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={14} /> Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-[9px] leading-4 text-neutral-500">JPG only. Up to 512px and 200KB.</p>
          {profile.anonymous && hasAvatar && (
            <p className="mt-2 text-[10px] leading-4 text-amber-200/80">
              Hidden from your anonymous public profile.
            </p>
          )}
        </div>

        <fieldset disabled={disabled || !hasAvatar} className="min-w-0 space-y-4 disabled:opacity-45">
          <legend className="sr-only">Portrait framing controls</legend>
          <label className="block">
            <span className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-neutral-400">
              <span>Zoom</span>
              <output htmlFor={`${idPrefix}-avatar-zoom`} className="text-neutral-200">{profile.avatarZoom}%</output>
            </span>
            <input
              id={`${idPrefix}-avatar-zoom`}
              type="range"
              min={PROFILE_AVATAR_ZOOM_MIN}
              max={PROFILE_AVATAR_ZOOM_MAX}
              step={5}
              value={profile.avatarZoom}
              onChange={(event) => update("avatarZoom", Number(event.target.value))}
              className="h-11 w-full cursor-pointer accent-white disabled:cursor-not-allowed"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-neutral-400">
              <span>Horizontal focus</span>
              <output htmlFor={`${idPrefix}-avatar-position-x`} className="text-neutral-200">{profile.avatarPositionX}%</output>
            </span>
            <input
              id={`${idPrefix}-avatar-position-x`}
              type="range"
              min={PROFILE_AVATAR_POSITION_MIN}
              max={PROFILE_AVATAR_POSITION_MAX}
              step={1}
              value={profile.avatarPositionX}
              onChange={(event) => update("avatarPositionX", Number(event.target.value))}
              className="h-11 w-full cursor-pointer accent-white disabled:cursor-not-allowed"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-neutral-400">
              <span>Vertical focus</span>
              <output htmlFor={`${idPrefix}-avatar-position-y`} className="text-neutral-200">{profile.avatarPositionY}%</output>
            </span>
            <input
              id={`${idPrefix}-avatar-position-y`}
              type="range"
              min={PROFILE_AVATAR_POSITION_MIN}
              max={PROFILE_AVATAR_POSITION_MAX}
              step={1}
              value={profile.avatarPositionY}
              onChange={(event) => update("avatarPositionY", Number(event.target.value))}
              className="h-11 w-full cursor-pointer accent-white disabled:cursor-not-allowed"
            />
          </label>

          <button
            type="button"
            disabled={disabled || !hasAvatar}
            onClick={resetFraming}
            className="inline-flex min-h-11 items-center gap-2 border border-neutral-700 px-3 text-[9px] uppercase tracking-wider text-neutral-300 hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed"
          >
            <RotateCcw aria-hidden="true" size={14} /> Center crop
          </button>
        </fieldset>
      </div>
    </div>
  );
}
