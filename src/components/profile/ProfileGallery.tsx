import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import { parseGalleryTags } from "@/lib/gallery-tags";

export interface ProfileGalleryPhoto {
  camera: string | null;
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
}: Props) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const previousPageRef = useRef(meta.page);
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? null;
  const visiblePages = getVisiblePages(meta.page, meta.totalPages);

  useEffect(() => {
    if (previousPageRef.current === meta.page) return;
    previousPageRef.current = meta.page;
    setSelectedPhotoId(null);
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start" });
  }, [meta.page]);

  const showFilters = !metadataHidden && availableTags.length > 0;

  return (
    <section aria-labelledby="profile-gallery-heading" className="py-10 sm:py-14">
      <div className="flex flex-col gap-5 border-b border-neutral-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">Contact sheet</p>
          <h2 id="profile-gallery-heading" className="mt-2 text-2xl tracking-[0.04em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>Gallery</h2>
        </div>
        {showFilters && (
          <div aria-label="Filter profile gallery by tag" className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end">
            {["All", ...availableTags].map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={selectedTag === tag}
                onClick={() => onTagChange(tag)}
                className={`min-h-11 shrink-0 border px-3 text-[9px] uppercase tracking-[0.15em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${selectedTag === tag ? "border-white text-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={resultsRef} tabIndex={-1} className="scroll-mt-24 pt-6 outline-none">
        <p role="status" aria-live="polite" className="mb-4 text-center text-[9px] uppercase tracking-[0.2em] text-neutral-600">
          {loading ? "Loading photographs" : `Page ${meta.page} of ${meta.totalPages}`}
        </p>

        {loading ? (
          <div className="columns-1 gap-2 sm:columns-2 lg:columns-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className={`mb-2 break-inside-avoid bg-neutral-800/40 ${index % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
            ))}
          </div>
        ) : requestError ? (
          <div className="border border-neutral-800 py-16 text-center">
            <p className="text-xs text-neutral-500">{requestError}</p>
            <button type="button" onClick={onRetry} className="mt-5 min-h-11 border border-neutral-700 px-5 text-[10px] uppercase tracking-wider text-neutral-300 hover:border-neutral-500">Try again</button>
          </div>
        ) : photos.length === 0 ? (
          <div className="border border-dashed border-neutral-800 py-16 text-center">
            <p className="text-sm text-neutral-500">{selectedTag === "All" ? "No public photographs yet." : "No photographs match this tag."}</p>
          </div>
        ) : (
          <div className="columns-1 gap-2 sm:columns-2 lg:columns-3">
            {photos.map((photo, index) => {
              const hideDetails = metadataHidden || photo.metadataHidden;
              return (
                <figure key={photo.id} className="group relative mb-2 break-inside-avoid overflow-hidden">
                  <button
                    type="button"
                    aria-label={hideDetails ? "Open anonymous photograph" : `Open ${photo.title || "photograph"}`}
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className="block w-full text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={hideDetails ? "Anonymous gallery photograph" : photo.title || "Member gallery photograph"}
                      width={photo.width ?? undefined}
                      height={photo.height ?? undefined}
                      loading={index < 4 ? "eager" : "lazy"}
                      decoding="async"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="block w-full transition-transform duration-200 group-hover:scale-[1.015]"
                    />
                    {!hideDetails && photo.title && (
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
          <button type="button" disabled={!meta.hasPreviousPage} onClick={() => onPageChange(meta.page - 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
          {visiblePages.map((page) => (
            <button key={page} type="button" aria-label={`Go to profile gallery page ${page}`} aria-current={page === meta.page ? "page" : undefined} onClick={() => onPageChange(page)} className={`min-h-11 min-w-11 border px-3 text-xs ${page === meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"}`}>{page}</button>
          ))}
          <button type="button" disabled={!meta.hasNextPage} onClick={() => onPageChange(meta.page + 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Next</button>
        </nav>
      )}

      {selectedPhoto && (
        <ModalDialog ariaLabel="Profile photograph preview" onClose={() => setSelectedPhotoId(null)} className="flex items-center justify-center bg-black/95 p-3 sm:p-6">
          <button type="button" tabIndex={-1} aria-label="Close photograph preview backdrop" onMouseDown={() => setSelectedPhotoId(null)} className="absolute inset-0 cursor-default" />
          <button type="button" aria-label="Close photograph preview" onClick={() => setSelectedPhotoId(null)} className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center text-neutral-400 hover:text-white"><X aria-hidden="true" size={22} /></button>
          <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] max-w-6xl flex-col items-center gap-4 overflow-y-auto sm:max-h-[calc(100dvh-3rem)]">
            <img src={selectedPhoto.imageUrl} alt={metadataHidden || selectedPhoto.metadataHidden ? "Anonymous gallery photograph" : selectedPhoto.title || "Member gallery photograph"} className="min-h-0 max-h-[72dvh] max-w-full object-contain" />
            {!metadataHidden && !selectedPhoto.metadataHidden && (
              <div aria-label="Profile photograph details" tabIndex={0} className="max-w-2xl text-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-neutral-500">
                {selectedPhoto.title && <p className="text-xs uppercase tracking-[0.2em] text-neutral-300">{selectedPhoto.title}</p>}
                {(selectedPhoto.camera || selectedPhoto.lens) && <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-neutral-500">{[selectedPhoto.camera, selectedPhoto.lens].filter(Boolean).join(" · ")}</p>}
                {selectedPhoto.description && <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-neutral-400">{selectedPhoto.description}</p>}
                {parseGalleryTags(selectedPhoto.tags).length > 0 && <div aria-label="Photo tags" className="mt-3 flex flex-wrap justify-center gap-2">{parseGalleryTags(selectedPhoto.tags).map((tag) => <span key={tag} className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-wider text-neutral-500">{tag}</span>)}</div>}
              </div>
            )}
          </div>
        </ModalDialog>
      )}
    </section>
  );
}
