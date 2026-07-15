import { useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import useSWR from "swr";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import ProfileFormFields from "@/components/profile/ProfileFormFields";
import { fetchApi, fetchFreshJson, readErrorMessage } from "@/lib/http";
import { prepareProfileAvatarImage } from "@/lib/profile-image";
import { announceProfileLinkUpdate } from "@/lib/profile-link-cache";
import {
  getPublicProfileHref,
  getProfileUsernameValidationError,
  normalizeProfileResponse,
  normalizeProfileSocialValue,
  refreshProfileAfterMutation,
  toProfileUpdate,
  type NormalizedProfileResponse,
  type ProfileDraft,
} from "@/lib/profile-model";

interface Props {
  fallbackDisplayName: string;
}

interface EditorProps {
  initial: NormalizedProfileResponse;
  onReload: () => Promise<unknown>;
  onSuccessChange: (message: string) => void;
  success: string;
}

function getDraftValidationError(profile: ProfileDraft) {
  if (!profile.displayName.trim()) return "Display name is required.";
  if (profile.displayName.trim().length > 80) return "Display name must be 80 characters or fewer.";
  if (profile.enabled || profile.username.trim()) {
    const usernameError = getProfileUsernameValidationError(profile.username);
    if (usernameError) return `Profile URL: ${usernameError}`;
  }
  for (const social of profile.socials) {
    if (!normalizeProfileSocialValue(social.platform, social.value)) {
      return `Enter a valid ${social.platform === "vsco" ? "VSCO" : social.platform} link.`;
    }
  }
  return null;
}

function ProfileSettingsEditor({
  initial,
  onReload,
  onSuccessChange,
  success,
}: EditorProps) {
  const [profile, setProfile] = useState<ProfileDraft>(initial.profile);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState("");
  const { canDisable, canEdit, canEnable } = initial.permissions;
  const disableOnly = !canEdit && initial.profile.enabled && !profile.enabled && canDisable;
  const canSave = canEdit || disableOnly;
  const publicProfileHref = getPublicProfileHref(profile);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    onSuccessChange("");

    if (!disableOnly) {
      const validationError = getDraftValidationError(profile);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetchApi("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disableOnly ? { enabled: false } : toProfileUpdate(profile)),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to save your profile."));
        return;
      }
      try {
        const saved = normalizeProfileResponse(await response.json(), profile.displayName);
        announceProfileLinkUpdate(getPublicProfileHref(saved.profile));
      } catch {
        // Saving succeeded; the normal refresh below will reconcile the editor.
      }
      await refreshProfileAfterMutation(
        onReload,
        onSuccessChange,
        disableOnly ? "Profile disabled." : "Profile saved.",
      );
    } catch {
      setError("Unable to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (sourceFile: File) => {
    if (!canEdit) return;
    setError("");
    onSuccessChange("");
    setAvatarBusy(true);
    try {
      const avatar = await prepareProfileAvatarImage(sourceFile);
      const formData = new FormData();
      formData.append("file", avatar, avatar.name);
      const response = await fetchApi("/api/profile/avatar", { method: "PUT", body: formData });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to upload your profile picture."));
        return;
      }
      await refreshProfileAfterMutation(onReload, onSuccessChange, "Profile picture updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload your profile picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (!canEdit || avatarBusy) return;
    setError("");
    onSuccessChange("");
    setAvatarBusy(true);
    try {
      const response = await fetchApi("/api/profile/avatar", { method: "DELETE" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to remove your profile picture."));
        return;
      }
      await refreshProfileAfterMutation(onReload, onSuccessChange, "Profile picture removed.");
    } catch {
      setError("Unable to remove your profile picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <form onSubmit={saveProfile} className="max-w-5xl space-y-4">
      {!canEdit && (
        <AccessUpsellPanel
          eyebrow="Profile locked"
          title="Active membership required"
          description={profile.enabled
            ? "Your information is locked while membership is inactive. You can still disable the public profile below."
            : "Renew your membership to configure and enable a member profile."}
        />
      )}

      <div className="flex flex-col gap-4 border border-neutral-800 bg-neutral-950/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm text-neutral-200">Your profile</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">
            Add a photo, a short bio, and the links you actually use. Publish whenever you are ready.
          </p>
        </div>
        {publicProfileHref && (
          <a
            href={publicProfileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-neutral-600 px-4 text-[10px] uppercase tracking-[0.14em] text-neutral-200 hover:border-neutral-300 hover:text-white"
          >
            View profile <ExternalLink aria-hidden="true" size={14} />
          </a>
        )}
      </div>

      <ProfileFormFields
        access={{ avatarBusy, canDisable, canEnable, disabled: !canEdit }}
        onAvatarChange={uploadAvatar}
        onAvatarRemove={removeAvatar}
        onChange={setProfile}
        profile={profile}
      />

      <div className="sticky bottom-0 z-10 border border-neutral-800 bg-neutral-950 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-between sm:px-5">
        <div role="status" aria-live="polite" className="min-h-5 text-xs">
          {error && <span className="text-red-400">{error}</span>}
          {!error && success && <span className="text-green-400">{success}</span>}
        </div>
        <button type="submit" disabled={!canSave || saving || avatarBusy} className="mt-2 min-h-11 w-full bg-white px-6 text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0 sm:w-auto">
          {saving ? "Saving" : disableOnly ? "Disable profile" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

export default function ProfileSettingsPanel({ fallbackDisplayName }: Props) {
  const { data, error, isLoading, mutate } = useSWR<unknown>(
    "/api/profile",
    fetchFreshJson,
  );
  const [success, setSuccess] = useState("");

  if (isLoading && !data) {
    return <div role="status" className="max-w-4xl border border-neutral-800 p-6 text-xs text-neutral-500">Loading profile settings</div>;
  }
  if (error || !data) {
    return (
      <div className="max-w-4xl border border-neutral-800 p-6">
        <p role="alert" className="text-xs text-red-400">Unable to load profile settings.</p>
        <button type="button" onClick={() => void mutate()} className="mt-4 min-h-11 border border-neutral-700 px-4 text-[10px] uppercase tracking-wider text-neutral-300">Try again</button>
      </div>
    );
  }

  const normalized = normalizeProfileResponse(data, fallbackDisplayName);
  const editorKey = `${normalized.profile.enabled}:${normalized.profile.anonymousId ?? "named"}:${normalized.profile.avatarUrl ?? "none"}:${normalized.profile.username}:${normalized.profile.decoration}:${normalized.profile.palette}`;
  return (
    <ProfileSettingsEditor
      key={editorKey}
      initial={normalized}
      onReload={async () => mutate()}
      onSuccessChange={setSuccess}
      success={success}
    />
  );
}
