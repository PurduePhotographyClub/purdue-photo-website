import type { GalleryPageMeta } from "@/lib/gallery-images";

interface AdminGalleryPaginationProps {
  meta: GalleryPageMeta;
  onPageChange: (page: number) => void;
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

export default function AdminGalleryPagination({
  meta,
  onPageChange,
}: AdminGalleryPaginationProps) {
  if (meta.totalPages <= 1) return null;
  const pageNumbers = getVisiblePageNumbers(meta.page, meta.totalPages);

  return (
    <nav aria-label="Admin gallery pagination" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={!meta.hasPreviousPage} onClick={() => onPageChange(meta.page - 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30">
        Previous
      </button>
      {pageNumbers.map((pageNumber) => (
        <button type="button" key={pageNumber} aria-label={`Go to admin gallery page ${pageNumber}`} aria-current={pageNumber === meta.page ? "page" : undefined} onClick={() => onPageChange(pageNumber)} className={`min-h-11 min-w-11 border px-3 text-xs ${pageNumber === meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500"}`}>
          {pageNumber}
        </button>
      ))}
      <button type="button" disabled={!meta.hasNextPage} onClick={() => onPageChange(meta.page + 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30">
        Next
      </button>
    </nav>
  );
}
