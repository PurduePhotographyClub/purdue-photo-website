import { X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import AdminMemberProfileEditor from "./AdminMemberProfileEditor";

interface Props {
  memberId: string;
  memberName: string;
  onClose: () => void;
}

export default function AdminMemberProfileDialog({ memberId, memberName, onClose }: Props) {
  return (
    <ModalDialog ariaLabel={`Edit ${memberName}'s profile`} onClose={onClose}>
      <div className="flex min-h-dvh items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close member profile editor"
          tabIndex={-1}
          className="absolute inset-0 cursor-default"
          onMouseDown={onClose}
        />
        <section className="relative flex max-h-dvh w-full flex-col overflow-hidden border border-neutral-700 bg-neutral-950 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-6xl">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-800 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">Member profile</p>
              <h2 className="mt-1 truncate text-xl text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                Edit {memberName}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">Changes appear on the member&apos;s public page after saving.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center text-neutral-500 hover:text-white"
              aria-label="Close member profile editor"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
            <AdminMemberProfileEditor fallbackDisplayName={memberName} memberId={memberId} />
          </div>
        </section>
      </div>
    </ModalDialog>
  );
}
