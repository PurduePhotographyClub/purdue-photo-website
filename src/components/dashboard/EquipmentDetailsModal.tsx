import { UserRound, X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import MarkdownMessage from "@/components/dashboard/MarkdownMessage";
import { getEquipmentCategoryLabel } from "@/lib/equipment";

export interface EquipmentDetailsItem {
  assetTag: string | null;
  category: string;
  condition: string | null;
  description: string | null;
  isAvailable: boolean;
  lenderTerms: string | null;
  model: string | null;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
}

interface EquipmentDetailsModalProps {
  item: EquipmentDetailsItem;
  isOwner: boolean;
  onClose: () => void;
}

export default function EquipmentDetailsModal({
  item,
  isOwner,
  onClose,
}: EquipmentDetailsModalProps) {
  const isPersonalGear = item.ownerId !== null;
  const lenderName = isPersonalGear
    ? isOwner
      ? "You"
      : item.ownerName || "Member"
    : "PPC Equipment Team";

  return (
    <ModalDialog
      ariaLabel={`Equipment details for ${item.name}`}
      className="flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center sm:p-6"
      onClose={onClose}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close equipment details backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section className="relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto border border-neutral-800 bg-neutral-950 sm:max-h-[calc(100dvh-3rem)]">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">Equipment Details</p>
            <h2 className="mt-1 break-words text-lg font-medium leading-snug text-neutral-100">
              {item.name}
            </h2>
            {item.model && <p className="mt-1 break-words text-xs text-neutral-400">{item.model}</p>}
          </div>
          <button
            type="button"
            aria-label="Close equipment details"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-neutral-500 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          <dl className="grid gap-3 border border-neutral-800 bg-white/[0.02] p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Category</dt>
              <dd className="mt-1 text-neutral-300">{getEquipmentCategoryLabel(item.category)}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Availability</dt>
              <dd className="mt-1 text-neutral-300">{item.isAvailable ? "Available" : "On loan"}</dd>
            </div>
            {item.condition && (
              <div>
                <dt className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Condition</dt>
                <dd className="mt-1 capitalize text-neutral-300">{item.condition}</dd>
              </div>
            )}
            {item.assetTag && (
              <div>
                <dt className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Asset Tag</dt>
                <dd className="mt-1 break-words font-mono text-neutral-300">{item.assetTag}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                <UserRound size={11} aria-hidden="true" /> Lender
              </dt>
              <dd className="mt-1 break-words text-neutral-300">{lenderName}</dd>
            </div>
          </dl>

          {item.description && (
            <section aria-labelledby="equipment-description-title">
              <h3 id="equipment-description-title" className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                Description
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-neutral-300">
                {item.description}
              </p>
            </section>
          )}

          {isPersonalGear && item.lenderTerms && (
            <section aria-labelledby="equipment-terms-title" className="border-t border-neutral-800 pt-5">
              <h3 id="equipment-terms-title" className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                Borrowing Terms
              </h3>
              <MarkdownMessage
                value={item.lenderTerms}
                className="mt-2 space-y-2 break-words text-xs leading-5 text-neutral-300"
              />
            </section>
          )}
        </div>
      </section>
    </ModalDialog>
  );
}
