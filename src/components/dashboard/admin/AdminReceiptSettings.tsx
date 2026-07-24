import { useState } from "react";
import type { FormEvent } from "react";
import { Archive, Save, ShieldCheck } from "lucide-react";

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
      setFormError("Enter one exact sender email address or leave it blank to disable intake.");
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
    if (!Number.isSafeInteger(requestedDays) || requestedDays < 1 || requestedDays > 3650) {
      setFormError("Cleanup age must be between 1 and 3650 days.");
      return;
    }
    if (await onClean(requestedDays)) {
      setCleanupConfirmation("");
    }
  };

  return (
    <section className="border border-neutral-800 bg-white/[0.015]">
      <div className="flex flex-col gap-3 border-b border-neutral-800 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-neutral-200">
            <ShieldCheck size={15} />
            <h2 className="text-sm tracking-wide">Receipt controls</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            The mailbox stays fixed. The worker accepts one exact envelope sender
            and rejects mail from every other address.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.roleReconciliationPending && (
            <span
              className="w-fit border border-amber-900/70 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-amber-300"
              role="status"
            >
              Role sync queued
            </span>
          )}
          <span className="w-fit border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-500">
            {canManage ? "Admin access" : "Read only"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
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
            <span className="mt-1.5 block text-[10px] leading-relaxed text-neutral-600">
              Cloudflare Email Routing delivers purchases here.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
              Exact allowed sender
            </span>
            <input
              aria-label="Exact allowed sender"
              autoComplete="off"
              className={INPUT_CLASS}
              disabled={!canManage || saving}
              maxLength={254}
              onChange={(event) => updateDraft("allowedSenderEmail", event.target.value)}
              placeholder="person@example.com"
              spellCheck={false}
              type="email"
              value={draft.allowedSenderEmail}
            />
            <span className="mt-1.5 block text-[10px] leading-relaxed text-neutral-600">
              One exact email address. Leave blank to disable receipt intake.
              Lists and wildcard domains are rejected, and no email can be processed
              until an exact sender is configured here.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
              Member role ID
            </span>
            <input
              aria-label="Member role ID"
              className={INPUT_CLASS}
              disabled={!canManage || saving}
              inputMode="numeric"
              maxLength={20}
              onChange={(event) => updateDraft("memberRoleId", event.target.value)}
              pattern={DISCORD_ROLE_PATTERN}
              required
              value={draft.memberRoleId}
            />
            <span className="mt-1.5 block text-[10px] leading-relaxed text-neutral-600">
              Role changes are reconciled across linked Discord members in
              resumable scheduled batches.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
              Facilities role ID
            </span>
            <input
              aria-label="Facilities role ID"
              className={INPUT_CLASS}
              disabled={!canManage || saving}
              inputMode="numeric"
              maxLength={20}
              onChange={(event) => updateDraft("facilitiesRoleId", event.target.value)}
              pattern={DISCORD_ROLE_PATTERN}
              required
              value={draft.facilitiesRoleId}
            />
          </label>
        </div>

        {formError && (
          <p className="mt-4 text-xs text-red-400" role="alert">
            {formError}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-relaxed text-neutral-600">
            {settings.updatedAt
              ? `Last updated ${new Date(settings.updatedAt).toLocaleString()}`
              : "No dashboard update recorded yet."}
          </p>
          {canManage && (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManage || saving}
              type="submit"
            >
              <Save size={13} />
              {saving ? "Saving" : "Save receipt settings"}
            </button>
          )}
        </div>
      </form>

      {canManage && (
        <details className="group border-t border-neutral-800">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-xs text-neutral-400 outline-none transition-colors hover:bg-white/[0.02] hover:text-white focus-visible:bg-white/[0.02] sm:px-5">
            <span className="inline-flex items-center gap-2">
              <Archive size={14} />
              Clean old receipt history
            </span>
            <span aria-hidden="true" className="text-neutral-600 group-open:rotate-45">
              +
            </span>
          </summary>
          <form
            className="border-t border-neutral-800 bg-black/20 p-4 sm:p-5"
            onSubmit={handleCleanup}
          >
            <div className="max-w-3xl">
              <h3 className="text-sm text-neutral-200">Archive terminal receipts</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                This hides fulfilled, failed, and manual-review rows older than the
                selected age. Idempotency and processing history remain stored,
                preventing duplicate processing, activation emails, and Discord
                messages.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
              <label>
                <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                  Older than days
                </span>
                <input
                  aria-label="Archive receipts older than days"
                  className={INPUT_CLASS}
                  disabled={cleaning}
                  inputMode="numeric"
                  max="3650"
                  min="1"
                  onChange={(event) => setOlderThanDays(event.target.value)}
                  type="number"
                  value={olderThanDays}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                  Type CLEAN to confirm
                </span>
                <input
                  aria-label="Receipt cleanup confirmation"
                  autoComplete="off"
                  className={INPUT_CLASS}
                  disabled={cleaning}
                  onChange={(event) => setCleanupConfirmation(event.target.value)}
                  placeholder="CLEAN"
                  value={cleanupConfirmation}
                />
              </label>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-amber-900/70 px-4 text-[10px] uppercase tracking-[0.14em] text-amber-300 transition-colors hover:border-amber-700 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={cleaning || cleanupConfirmation !== "CLEAN"}
                type="submit"
              >
                <Archive size={13} />
                {cleaning ? "Archiving" : "Archive receipts"}
              </button>
            </div>
          </form>
        </details>
      )}
    </section>
  );
}
