import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import { formatGalleryDate } from "@/lib/gallery-images";
import { parseGalleryTags } from "@/lib/gallery-tags";
import type { ProfileTemplate } from "@/lib/profile-model";

export interface ProfileGalleryPhoto {
  camera: string | null;
  createdAt?: string | null;
  description: string | null;
  height: number | null;
  id: string;
  imageUrl: string;
  lens: string | null;
  metadataHidden?: boolean;
  tags: string | null;
  thumbnailUrl: string;
  title: string | null;
  width: number | null;
}

export interface ProfileGalleryMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface Props {
  availableTags: string[];
  loading: boolean;
  meta: ProfileGalleryMeta;
  metadataHidden: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onTagChange: (tag: string) => void;
  photos: ProfileGalleryPhoto[];
  requestError?: string;
  selectedTag: string;
  template: ProfileTemplate;
}

function getVisiblePages(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((first, second) => first - second);
}

export default function ProfileGallery({
  availableTags,
  loading,
  meta,
  metadataHidden,
  onPageChange,
  onRetry,
  onTagChange,
  photos,
  requestError = "",
  selectedTag,
  template,
}: Props) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const previousPageRef = useRef(meta.page);
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? null;
  const selectedPhotoDate = formatGalleryDate(selectedPhoto?.createdAt);
  const selectedPhotoTags = selectedPhoto ? parseGalleryTags(selectedPhoto.tags) : [];
  const selectedPhotoHidesEquipment = metadataHidden || selectedPhoto?.metadataHidden === true;
  const visiblePages = getVisiblePages(meta.page, meta.totalPages);

  useEffect(() => {
    if (previousPageRef.current === meta.page) return;
    previousPageRef.current = meta.page;
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start" });
  }, [meta.page]);

  const showFilters = availableTags.length > 0;
  const changePage = (page: number) => {
    setSelectedPhotoId(null);
    onPageChange(page);
  };

  return (
    <section
      id="profile-gallery"
      aria-labelledby="profile-gallery-heading"
      className="scroll-mt-24 pb-12 pt-7 [background-color:var(--profile-surface)] sm:pb-16 sm:pt-9"
      data-profile-gallery="true"
      data-profile-gallery-layout={template}
    >
      <div className="flex flex-col gap-4 border-b [border-color:var(--profile-border)] pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 id="profile-gallery-heading" className="text-2xl tracking-[0.04em] text-[var(--profile-ink)] sm:text-[1.75rem]" style={{ fontFamily: "'Playfair Display', serif" }}>Gallery</h2>
          <p className="mt-1.5 text-[9px] uppercase tracking-[0.15em] text-[var(--profile-muted)]">
            {meta.total} {meta.total === 1 ? "image" : "images"} posted
          </p>
        </div>
        {showFilters && (
          <div aria-label="Filter profile gallery by tag" className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end">
            {["All", ...availableTags].map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={selectedTag === tag}
                onClick={() => onTagChange(tag)}
                className={`min-h-11 shrink-0 border px-3 text-[9px] uppercase tracking-[0.15em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)] ${selectedTag === tag ? "[border-color:var(--profile-accent)] [background-color:var(--profile-chip)] text-[var(--profile-accent)]" : "[border-color:var(--profile-border)] text-[var(--profile-muted)] hover:[border-color:var(--profile-accent)] hover:text-[var(--profile-ink)]"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={resultsRef} tabIndex={-1} className="scroll-mt-24 pt-5 outline-none sm:pt-6">
        <p
          role="status"
          aria-live="polite"
          className={loading || meta.totalPages > 1
            ? "mb-4 text-center text-[9px] uppercase tracking-[0.2em] text-[var(--profile-muted)]"
            : "sr-only"}
        >
          {loading ? "Loading photographs" : `Page ${meta.page} of ${meta.totalPages}`}
        </p>

        {loading ? (
          <div
            aria-hidden="true"
            className="animate-pulse columns-1 gap-2 sm:columns-2 lg:columns-3"
            data-profile-gallery-skeleton="true"
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className={`mb-2 break-inside-avoid opacity-60 [background-color:var(--profile-chip)] ${index % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
            ))}
          </div>
        ) : requestError ? (
          <div className="border [border-color:var(--profile-border)] py-16 text-center">
            <p className="text-xs text-[var(--profile-muted)]">{requestError}</p>
            <button type="button" onClick={onRetry} className="mt-5 min-h-11 border [border-color:var(--profile-border)] px-5 text-[10px] uppercase tracking-wider text-[var(--profile-ink)] hover:[border-color:var(--profile-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]">Try again</button>
          </div>
        ) : photos.length === 0 ? (
          <div className="border border-dashed [border-color:var(--profile-border)] py-16 text-center">
            <p className="text-sm text-[var(--profile-muted)]">{selectedTag === "All" ? "No public photographs yet." : "No photographs match this tag."}</p>
          </div>
        ) : (
          <div className="columns-1 gap-2 sm:columns-2 lg:columns-3">
            {photos.map((photo, index) => {
              return (
                <figure key={photo.id} className="group relative mb-2 break-inside-avoid overflow-hidden">
                  <button
                    type="button"
                    aria-label={`Open ${photo.title || "photograph"}`}
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]"
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.title || "Member gallery photograph"}
                      width={photo.width ?? undefined}
                      height={photo.height ?? undefined}
                      loading={index < 4 ? "eager" : "lazy"}
                      decoding="async"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="block w-full transition-transform duration-200 group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    {photo.title && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/75 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-neutral-200 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        {photo.title}
                      </span>
                    )}
                  </button>
                </figure>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !requestError && meta.totalPages > 1 && (
        <nav aria-label="Profile gallery pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button type="button" disabled={!meta.hasPreviousPage} onClick={() => changePage(meta.page - 1)} className="min-h-11 border [border-color:var(--profile-border)] px-4 text-[10px] uppercase tracking-wider text-[var(--profile-muted)] hover:[border-color:var(--profile-accent)] hover:text-[var(--profile-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)] disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
          {visiblePages.map((page) => (
            <button key={page} type="button" aria-label={`Go to profile gallery page ${page}`} aria-current={page === meta.page ? "page" : undefined} onClick={() => changePage(page)} className={`min-h-11 min-w-11 border px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)] ${page === meta.page ? "[border-color:var(--profile-accent)] text-[var(--profile-accent)]" : "[border-color:var(--profile-border)] text-[var(--profile-muted)] hover:[border-color:var(--profile-accent)] hover:text-[var(--profile-ink)]"}`}>{page}</button>
          ))}
          <button type="button" disabled={!meta.hasNextPage} onClick={() => changePage(meta.page + 1)} className="min-h-11 border [border-color:var(--profile-border)] px-4 text-[10px] uppercase tracking-wider text-[var(--profile-muted)] hover:[border-color:var(--profile-accent)] hover:text-[var(--profile-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)] disabled:cursor-not-allowed disabled:opacity-30">Next</button>
        </nav>
      )}

      {selectedPhoto && (
        <ModalDialog ariaLabel="Profile photograph preview" onClose={() => setSelectedPhotoId(null)} className="flex items-center justify-center bg-black/95 p-3 sm:p-6">
          <button type="button" tabIndex={-1} aria-label="Close photograph preview backdrop" onMouseDown={() => setSelectedPhotoId(null)} className="absolute inset-0 cursor-default" />
          <button type="button" aria-label="Close photograph preview" onClick={() => setSelectedPhotoId(null)} className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center text-neutral-400 hover:text-white"><X aria-hidden="true" size={22} /></button>
          <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] max-w-6xl flex-col items-center gap-4 overflow-y-auto sm:max-h-[calc(100dvh-3rem)]">
            <img src={selectedPhoto.imageUrl} alt={selectedPhoto.title || "Member gallery photograph"} className="min-h-0 max-h-[72dvh] max-w-full object-contain" />
            <div aria-label="Profile photograph details" tabIndex={0} className="max-w-2xl text-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-neutral-500">
              {selectedPhoto.title && <p className="text-xs uppercase tracking-[0.2em] text-neutral-300">{selectedPhoto.title}</p>}
              {!selectedPhotoHidesEquipment && (selectedPhoto.camera || selectedPhoto.lens) && <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-neutral-500">{[selectedPhoto.camera, selectedPhoto.lens].filter(Boolean).join(" · ")}</p>}
              {selectedPhoto.description && <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-neutral-400">{selectedPhoto.description}</p>}
              {selectedPhotoTags.length > 0 && <div aria-label="Photo tags" className="mt-3 flex flex-wrap justify-center gap-2">{selectedPhotoTags.map((tag) => <span key={tag} className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-wider text-neutral-500">{tag}</span>)}</div>}
              {selectedPhotoDate && <p className="mt-3 text-[10px] text-neutral-600"><time dateTime={selectedPhoto.createdAt ?? undefined}>{selectedPhotoDate}</time></p>}
            </div>
          </div>
        </ModalDialog>
      )}
    </section>
  );
}
