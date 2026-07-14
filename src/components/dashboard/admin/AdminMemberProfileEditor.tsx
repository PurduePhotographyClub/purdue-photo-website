import { useState, type FormEvent } from "react";
import useSWR from "swr";
import ProfileFormFields from "@/components/profile/ProfileFormFields";
import { fetchApi, fetchFreshJson, readErrorMessage } from "@/lib/http";
import { prepareProfileAvatarImage } from "@/lib/profile-image";
import {
  getProfileUsernameValidationError,
  normalizeProfileResponse,
  normalizeProfileSocialValue,
  refreshProfileAfterMutation,
  toProfileUpdate,
  type ProfileDraft,
} from "@/lib/profile-model";

interface Props {
  fallbackDisplayName?: string;
  memberId: string;
}

interface EditorProps {
  initialProfile: ProfileDraft;
  memberId: string;
  onReload: () => Promise<unknown>;
  onSuccessChange: (message: string) => void;
  success: string;
}

function getValidationError(profile: ProfileDraft) {
  if (!profile.displayName.trim()) return "Display name is required.";
  if (profile.displayName.trim().length > 80) return "Display name must be 80 characters or fewer.";
  const usernameError = getProfileUsernameValidationError(profile.username);
  if (usernameError) return `Profile URL: ${usernameError}`;
  for (const social of profile.socials) {
    if (!normalizeProfileSocialValue(social.platform, social.value)) {
      return `Enter a valid ${social.platform === "vsco" ? "VSCO" : social.platform} link.`;
    }
  }
  return null;
}

function AdminMemberProfileForm({
  initialProfile,
  memberId,
  onReload,
  onSuccessChange,
  success,
}: EditorProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState("");
  const profileEndpoint = `/api/admin/members/${encodeURIComponent(memberId)}/profile`;
  const avatarEndpoint = `${profileEndpoint}/avatar`;

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    onSuccessChange("");
    const validationError = getValidationError(profile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const response = await fetchApi(profileEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toProfileUpdate(profile, {
          includePrivacy: false,
          includePublishing: false,
        })),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to save this member profile."));
        return;
      }
      await refreshProfileAfterMutation(onReload, onSuccessChange, "Member profile saved.");
    } catch {
      setError("Unable to save this member profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (sourceFile: File) => {
    setError("");
    onSuccessChange("");
    setAvatarBusy(true);
    try {
      const avatar = await prepareProfileAvatarImage(sourceFile);
      const formData = new FormData();
      formData.append("file", avatar, avatar.name);
      const response = await fetchApi(avatarEndpoint, { method: "PUT", body: formData });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to update this profile picture."));
        return;
      }
      await refreshProfileAfterMutation(onReload, onSuccessChange, "Profile picture updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to update this profile picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (avatarBusy) return;
    setError("");
    onSuccessChange("");
    setAvatarBusy(true);
    try {
      const response = await fetchApi(avatarEndpoint, { method: "DELETE" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to remove this profile picture."));
        return;
      }
      await refreshProfileAfterMutation(onReload, onSuccessChange, "Profile picture removed.");
    } catch {
      setError("Unable to remove this profile picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <form onSubmit={saveProfile} className="max-w-4xl space-y-5">
      <div className="border-l border-amber-600/60 pl-4">
        <p className="text-xs leading-5 text-neutral-400">
          Staff can edit the content of an enabled profile. Only the member can change publishing or anonymous mode.
        </p>
      </div>

      <ProfileFormFields
        avatarBusy={avatarBusy}
        idPrefix={`admin-member-profile-${memberId}`}
        onAvatarChange={uploadAvatar}
        onAvatarRemove={removeAvatar}
        onChange={setProfile}
        profile={profile}
        showPrivacy={false}
        showPublishing={false}
      />

      <div className="sticky bottom-0 z-10 border border-neutral-800 bg-neutral-950 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-between sm:px-5">
        <div role="status" aria-live="polite" className="min-h-5 text-xs">
          {error && <span className="text-red-400">{error}</span>}
          {!error && success && <span className="text-green-400">{success}</span>}
        </div>
        <button type="submit" disabled={saving || avatarBusy} className="mt-2 min-h-11 w-full bg-white px-6 text-[10px] uppercase tracking-[0.15em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0 sm:w-auto">
          {saving ? "Saving" : "Save member profile"}
        </button>
      </div>
    </form>
  );
}

export default function AdminMemberProfileEditor({
  fallbackDisplayName = "PPC member",
  memberId,
}: Props) {
  const endpoint = `/api/admin/members/${encodeURIComponent(memberId)}/profile`;
  const { data, error, isLoading, mutate } = useSWR<unknown>(endpoint, fetchFreshJson);
  const [success, setSuccess] = useState("");

  if (isLoading && !data) {
    return <div role="status" className="max-w-4xl border border-neutral-800 p-6 text-xs text-neutral-500">Loading member profile</div>;
  }
  if (error || !data) {
    return (
      <div className="max-w-4xl border border-neutral-800 p-6">
        <p role="alert" className="text-xs text-red-400">This member does not have an enabled profile, or it cannot be edited.</p>
        <button type="button" onClick={() => void mutate()} className="mt-4 min-h-11 border border-neutral-700 px-4 text-[10px] uppercase tracking-wider text-neutral-300">Try again</button>
      </div>
    );
  }

  const normalized = normalizeProfileResponse(data, fallbackDisplayName).profile;
  const editorKey = `${normalized.avatarUrl ?? "none"}:${normalized.username}:${normalized.template}`;
  return (
    <AdminMemberProfileForm
      key={editorKey}
      initialProfile={normalized}
      memberId={memberId}
      onReload={async () => mutate()}
      onSuccessChange={setSuccess}
      success={success}
    />
  );
}
