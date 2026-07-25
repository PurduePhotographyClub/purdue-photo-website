import { useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  ChevronDown,
  Mail,
  Save,
  ShieldCheck,
} from "lucide-react";

import type {
  AdminReceiptSettings as ReceiptSettings,
  AdminReceiptSettingsUpdate,
} from "@/lib/admin-receipts";

const INPUT_CLASS =
  "box-border min-h-11 w-full border border-neutral-800 bg-black/20 px-3 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-500 focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-950 disabled:text-neutral-500";
const DISCORD_ROLE_PATTERN = "\\d{17,20}";
const EXACT_EMAIL_PATTERN = /^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/;

interface AdminReceiptSettingsProps {
  canManage: boolean;
  cleaning: boolean;
  onClean: (olderThanDays: number) => Promise<boolean>;
  onSave: (settings: AdminReceiptSettingsUpdate) => Promise<boolean>;
  saving: boolean;
  settings: ReceiptSettings;
}

export default function AdminReceiptSettings({
  canManage,
  cleaning,
  onClean,
  onSave,
  saving,
  settings,
}: AdminReceiptSettingsProps) {
  const [draft, setDraft] = useState({
    allowedSenderEmail: settings.allowedSenderEmail ?? "",
    facilitiesRoleId: settings.facilitiesRoleId,
    memberRoleId: settings.memberRoleId,
  });
  const [formError, setFormError] = useState("");
  const [cleanupError, setCleanupError] = useState("");
  const [cleanupConfirmation, setCleanupConfirmation] = useState("");
  const [olderThanDays, setOlderThanDays] = useState("90");

  const updateDraft = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || saving) return;

    const trimmedAllowedSenderEmail = draft.allowedSenderEmail.trim().toLowerCase();
    const memberRoleId = draft.memberRoleId.trim();
    const facilitiesRoleId = draft.facilitiesRoleId.trim();
    const allowedSenderEmail = trimmedAllowedSenderEmail
      ? trimmedAllowedSenderEmail
      : null;
    if (
      allowedSenderEmail !== null &&
      !EXACT_EMAIL_PATTERN.test(allowedSenderEmail)
    ) {
      setFormError("Enter one exact sender email or leave it blank.");
      return;
    }
    if (
      !new RegExp(`^${DISCORD_ROLE_PATTERN}$`).test(memberRoleId) ||
      !new RegExp(`^${DISCORD_ROLE_PATTERN}$`).test(facilitiesRoleId)
    ) {
      setFormError("Discord role IDs must contain 17 to 20 digits.");
      return;
    }
    if (memberRoleId === facilitiesRoleId) {
      setFormError("Member and Facilities must use different Discord roles.");
      return;
    }

    const rolesChanged =
      memberRoleId !== settings.memberRoleId ||
      facilitiesRoleId !== settings.facilitiesRoleId;
    await onSave(
      rolesChanged
        ? {
            allowedSenderEmail,
            expectedRoleGeneration: settings.roleReconciliationGeneration,
            facilitiesRoleId,
            memberRoleId,
          }
        : { allowedSenderEmail },
    );
  };

  const handleCleanup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || cleaning || cleanupConfirmation !== "CLEAN") return;
    const requestedDays = Number(olderThanDays);
    if (
      !Number.isSafeInteger(requestedDays) ||
      requestedDays < 1 ||
      requestedDays > 3650
    ) {
      setCleanupError("Choose an age from 1 to 3650 days.");
      return;
    }
    setCleanupError("");
    if (await onClean(requestedDays)) {
      setCleanupConfirmation("");
    }
  };

  return (
    <section>
      <details className="group border border-neutral-800 bg-white/[0.015]">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 outline-none transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm text-neutral-200">
              <ShieldCheck aria-hidden="true" size={15} />
              Receipt settings
            </span>
            <span className="mt-1 block text-[10px] text-neutral-500">
              Email intake and Discord roles
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {settings.roleReconciliationPending && (
              <span
                className="inline-flex border border-amber-900/70 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-amber-300"
                role="status"
              >
                Role sync queued
              </span>
            )}
            <span className="hidden border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-neutral-500 sm:inline-flex">
              {canManage ? "Admin" : "Read only"}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="text-neutral-600 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              size={15}
            />
          </span>
        </summary>

        <div className="border-t border-neutral-800">
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-neutral-800">
              <fieldset className="space-y-4 p-4 sm:p-5">
                <legend className="sr-only">Email intake</legend>
                <div className="flex items-center gap-2 text-xs text-neutral-300">
                  <Mail aria-hidden="true" size={14} />
                  <h3>Email intake</h3>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Forwarding mailbox
                  </span>
                  <input
                    aria-label="Receipt forwarding mailbox"
                    className={INPUT_CLASS}
                    disabled
                    readOnly
                    type="email"
                    value={settings.receiptToAddress}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Exact allowed sender
                  </span>
                  <input
                    aria-label="Exact allowed sender"
                    autoComplete="off"
                    className={INPUT_CLASS}
                    disabled={!canManage || saving}
                    maxLength={254}
                    onChange={(event) =>
                      updateDraft("allowedSenderEmail", event.target.value)
                    }
                    placeholder="person@example.com"
                    spellCheck={false}
                    type="email"
                    value={draft.allowedSenderEmail}
                  />
                  <span className="mt-1.5 block text-[10px] leading-5 text-neutral-500">
                    One exact sender. Leave blank to disable receipt intake; lists
                    and wildcard domains are rejected, so no email can be processed.
                  </span>
                </label>
              </fieldset>

              <fieldset className="space-y-4 border-t border-neutral-800 p-4 sm:p-5 lg:border-t-0">
                <legend className="sr-only">Discord roles</legend>
                <div className="flex items-center gap-2 text-xs text-neutral-300">
                  <ShieldCheck aria-hidden="true" size={14} />
                  <h3>Discord roles</h3>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Member role ID
                  </span>
                  <input
                    aria-label="Member role ID"
                    className={INPUT_CLASS}
                    disabled={!canManage || saving}
                    inputMode="numeric"
                    maxLength={20}
                    onChange={(event) =>
                      updateDraft("memberRoleId", event.target.value)
                    }
                    pattern={DISCORD_ROLE_PATTERN}
                    required
                    value={draft.memberRoleId}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Facilities role ID
                  </span>
                  <input
                    aria-label="Facilities role ID"
                    className={INPUT_CLASS}
                    disabled={!canManage || saving}
                    inputMode="numeric"
                    maxLength={20}
                    onChange={(event) =>
                      updateDraft("facilitiesRoleId", event.target.value)
                    }
                    pattern={DISCORD_ROLE_PATTERN}
                    required
                    value={draft.facilitiesRoleId}
                  />
                  <span className="mt-1.5 block text-[10px] leading-5 text-neutral-500">
                    Updates queue a sync for linked members.
                  </span>
                </label>
              </fieldset>
            </div>

            {formError && (
              <p className="border-t border-neutral-800 px-4 py-3 text-xs text-red-400 sm:px-5" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] text-neutral-500">
                {settings.updatedAt
                  ? `Updated ${new Date(settings.updatedAt).toLocaleString()}`
                  : "Not updated yet"}
              </p>
              {canManage && (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canManage || saving}
                  type="submit"
                >
                  <Save aria-hidden="true" size={13} />
                  {saving ? "Saving" : "Save settings"}
                </button>
              )}
            </div>
          </form>

          {canManage && (
            <details className="group/archive border-t border-neutral-800">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-xs text-neutral-400 outline-none transition-colors hover:bg-white/[0.02] hover:text-white focus-visible:bg-white/[0.02] sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Archive aria-hidden="true" size={14} />
                  Archive history
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="text-neutral-600 transition-transform group-open/archive:rotate-180 motion-reduce:transition-none"
                  size={14}
                />
              </summary>
              <form
                className="border-t border-neutral-800 bg-black/20 p-4 sm:p-5"
                onSubmit={handleCleanup}
              >
                <p className="max-w-2xl text-xs leading-5 text-neutral-500">
                  Hide finished receipts older than the selected age. Archived
                  receipts remain recorded, so duplicate processing stays blocked.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
                  <label>
                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                      Older than days
                    </span>
                    <input
                      aria-label="Archive receipts older than days"
                      className={INPUT_CLASS}
                      disabled={cleaning}
                      inputMode="numeric"
                      max="3650"
                      min="1"
                      onChange={(event) => {
                        setOlderThanDays(event.target.value);
                        setCleanupError("");
                      }}
                      type="number"
                      value={olderThanDays}
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                      Type CLEAN to confirm
                    </span>
                    <input
                      aria-label="Receipt cleanup confirmation"
                      autoComplete="off"
                      className={INPUT_CLASS}
                      disabled={cleaning}
                      onChange={(event) => {
                        setCleanupConfirmation(event.target.value);
                        setCleanupError("");
                      }}
                      placeholder="CLEAN"
                      value={cleanupConfirmation}
                    />
                  </label>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-amber-900/70 px-4 text-[10px] uppercase tracking-[0.14em] text-amber-300 transition-colors hover:border-amber-700 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={cleaning || cleanupConfirmation !== "CLEAN"}
                    type="submit"
                  >
                    <Archive aria-hidden="true" size={13} />
                    {cleaning ? "Archiving" : "Archive receipts"}
                  </button>
                </div>
                {cleanupError && (
                  <p className="mt-3 text-xs text-red-400" role="alert">
                    {cleanupError}
                  </p>
                )}
              </form>
            </details>
          )}
        </div>
      </details>
    </section>
  );
}
