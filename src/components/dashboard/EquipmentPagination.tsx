import { EQUIPMENT_PAGE_SIZE } from "@/lib/equipment-pagination";

interface EquipmentPaginationProps {
  ariaLabel: string;
  onPageChange: (page: number) => void;
  page: number;
  totalItems: number;
  totalPages: number;
}

export default function EquipmentPagination({
  ariaLabel,
  onPageChange,
  page,
  totalItems,
  totalPages,
}: EquipmentPaginationProps) {
  if (totalPages <= 1) return null;

  const firstVisibleItem = (page - 1) * EQUIPMENT_PAGE_SIZE + 1;
  const lastVisibleItem = Math.min(page * EQUIPMENT_PAGE_SIZE, totalItems);
  const buttonClass = "min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center justify-center gap-2 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={buttonClass}
      >
        Previous
      </button>
      <p aria-live="polite" className="min-w-28 text-center text-[10px] leading-5 text-neutral-400">
        <span className="block text-neutral-200">Page {page} of {totalPages}</span>
        {firstVisibleItem}–{lastVisibleItem} of {totalItems}
      </p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={buttonClass}
      >
        Next
      </button>
    </nav>
  );
}
