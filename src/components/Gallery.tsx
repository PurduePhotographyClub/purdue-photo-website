import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { X, Film, Aperture } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import {
  getGalleryImageSources,
  normalizeGalleryPageForUrl,
} from "@/lib/gallery-images";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

interface GalleryImage {
  fullSrc: string;
  height: number | null;
  src: string;
  cat: string;
  author: string;
  medium: string;
  camera: string | null;
  lens: string | null;
  width: number | null;
}

interface GalleryPageResponse {
  legacy: boolean;
  photos: Record<string, unknown>[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

const galleryCategories = ["All", "Digital", "Film"];
const GALLERY_PAGE_SIZE = 15;
const GALLERY_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  keepPreviousData: false,
};

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

async function fetchGalleryPage(url: string): Promise<GalleryPageResponse> {
  const data = await fetchPublicJson<unknown>(url);
  return normalizeGalleryPageForUrl<Record<string, unknown>>(data, url, GALLERY_PAGE_SIZE);
}

export default function Gallery() {
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const medium = filter === "All" ? "" : `&medium=${filter.toLowerCase()}`;
  const galleryUrl = `/api/gallery?page=${page}&per_page=${GALLERY_PAGE_SIZE}&format=page${medium}`;
  const { data: galleryPage, error, mutate } = useSWR<GalleryPageResponse>(
    galleryUrl,
    fetchGalleryPage,
    GALLERY_SWR_OPTIONS,
  );
  const images: GalleryImage[] = (galleryPage?.photos ?? []).flatMap((r) => {
    const source = getGalleryImageSources(r);
    if (!source) return [];

    return [{
      fullSrc: source.fullSrc,
      height: source.height,
      src: source.previewSrc,
      cat: source.title,
      author: source.author,
      medium: source.medium,
      camera: source.camera,
      lens: source.lens,
      width: source.width,
    }];
  });
  const visibleImages = galleryPage?.legacy && filter !== "All"
    ? images.filter((image) => image.medium === filter)
    : images;
  const status: "loading" | "loaded" | "error" = !galleryPage && !error ? "loading" : error ? "error" : "loaded";
  const [selected, setSelected] = useState<number | null>(null);
  const galleryResultsRef = useRef<HTMLDivElement | null>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);
  const shouldFocusResultsRef = useRef(false);
  const meta = galleryPage?.meta;
  const visiblePageNumbers = meta ? getVisiblePageNumbers(meta.page, meta.totalPages) : [];

  useEffect(() => {
    if (selected === null) return;

    const dialog = lightboxDialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [selected]);

  useEffect(() => {
    if (!galleryPage || !shouldFocusResultsRef.current) return;
    shouldFocusResultsRef.current = false;
    galleryResultsRef.current?.focus({ preventScroll: true });
    galleryResultsRef.current?.scrollIntoView({ block: "start" });
  }, [galleryPage]);

  const handleFilterChange = (category: string) => {
    shouldFocusResultsRef.current = true;
    setFilter(category);
    setPage(1);
    setSelected(null);
  };

  const handlePageChange = (nextPage: number) => {
    if (!meta || nextPage < 1 || nextPage > meta.totalPages || nextPage === meta.page) return;
    shouldFocusResultsRef.current = true;
    setSelected(null);
    setPage(nextPage);
  };

  const heading = "text-neutral-100";
  const mutedText = "text-neutral-500";
  const border = "border-neutral-800";
  const btnActive = "border-white text-white";
  const btnInactive = "border-neutral-800 text-neutral-500 hover:border-neutral-600";

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>Member Portfolio</p>
          <h1 className={`text-4xl md:text-5xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Gallery</h1>
          <p className={`text-sm ${mutedText} tracking-wider mt-4`}>Film & Digital, all mediums welcome</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {galleryCategories.map((cat) => (
            <button
              type="button"
              key={cat}
              aria-pressed={filter === cat}
              onClick={() => handleFilterChange(cat)}
              className={`flex min-h-11 items-center gap-2 border px-4 py-2 text-xs uppercase tracking-[0.2em] transition-all duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${filter === cat ? btnActive : btnInactive}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div ref={galleryResultsRef} tabIndex={-1} className="scroll-mt-24 outline-none">
        {meta && (
          <p role="status" aria-live="polite" className="mb-4 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            Page {meta.page} of {meta.totalPages}
          </p>
        )}
        {status === "loading" ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-2 space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-2">
                <div className={`bg-neutral-800/50 animate-pulse ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}`} />
              </div>
            ))}
          </div>
        ) : status === "error" ? (
          <div className="text-center py-24">
            <p className={`text-sm ${mutedText} tracking-wider mb-5`}>Unable to load the gallery right now. Please try again later.</p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="min-h-11 border border-neutral-700 px-5 text-[10px] uppercase tracking-[0.2em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              Try Again
            </button>
          </div>
        ) : visibleImages.length === 0 ? (
          <div className="text-center py-24">
            <p className={`text-sm ${mutedText} tracking-wider`}>
              {filter === "All" ? "No photos are published yet." : "No photos match this filter."}
            </p>
          </div>
        ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-2 space-y-2">
            {visibleImages.map((img, i) => (
              <button type="button" key={img.fullSrc + img.author}
                className="group relative mb-2 break-inside-avoid cursor-pointer overflow-hidden text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" onClick={() => setSelected(i)}>
                <ImageWithFallback src={img.src} alt={img.cat}
                  className="w-full transition-all duration-700 group-hover:scale-[1.03]"
                  loading={i < 6 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i < 2 ? "high" : "auto"}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  width={img.width ?? undefined}
                  height={img.height ?? undefined}
                />
                <div className="absolute inset-0 flex items-end bg-black/25 transition-all duration-300 sm:bg-black/0 sm:group-hover:bg-black/30 sm:group-focus-visible:bg-black/30">
                  <div className="w-full p-4 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs tracking-[0.2em] uppercase text-white">{img.cat}</p>
                        <p className="mt-1 truncate text-xs text-neutral-400">by {img.author}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] tracking-[0.2em] uppercase px-2 py-1 ${img.medium === "Film" ? "bg-neutral-900/90 text-neutral-400 border border-neutral-700" : "bg-white/10 backdrop-blur-sm text-neutral-300"}`}>
                        {img.medium === "Film" ? <span className="flex items-center gap-1"><Film size={8} /> Film</span> : <span className="flex items-center gap-1"><Aperture size={8} /> Digital</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>
        )}

        {status === "loaded" && meta && meta.totalPages > 1 && (
          <nav aria-label="Gallery pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={!meta.hasPreviousPage}
              onClick={() => handlePageChange(meta.page - 1)}
              className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            {visiblePageNumbers.map((pageNumber, index) => {
              const previousPageNumber = visiblePageNumbers[index - 1];
              return (
                <span key={pageNumber} className="contents">
                  {previousPageNumber && pageNumber - previousPageNumber > 1 && (
                    <span aria-hidden="true" className="px-1 text-neutral-700">…</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Go to gallery page ${pageNumber}`}
                    aria-current={pageNumber === meta.page ? "page" : undefined}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`min-h-11 min-w-11 border px-3 text-xs transition-colors ${pageNumber === meta.page ? btnActive : btnInactive}`}
                  >
                    {pageNumber}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              disabled={!meta.hasNextPage}
              onClick={() => handlePageChange(meta.page + 1)}
              className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </nav>
        )}
        </div>
      </div>

      {selected !== null && (
        <dialog
          aria-label="Gallery photo preview"
          ref={lightboxDialogRef}
          onClose={() => setSelected(null)}
          className="fixed inset-0 z-[120] h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-6 pt-16 text-inherit backdrop:bg-transparent">
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <button type="button" tabIndex={-1} aria-label="Close gallery lightbox" className="absolute inset-0 cursor-default" onMouseDown={() => setSelected(null)} />
          <button type="button" aria-label="Close gallery lightbox" className="absolute top-6 right-6 z-10 flex min-h-11 min-w-11 items-center justify-center text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" onClick={() => setSelected(null)}><X size={24} /></button>
          <img
            src={visibleImages[selected]?.fullSrc} alt={visibleImages[selected]?.cat ?? "Selected gallery photo"} className="relative z-10 max-w-full max-h-[75vh] object-contain shrink min-h-0" loading="eager" decoding="async" />
          <div className="relative z-10 text-center shrink-0">
            <p className="text-xs tracking-[0.3em] uppercase text-neutral-400">
              {visibleImages[selected]?.cat} &middot; {visibleImages[selected]?.author} &middot; Shot on {visibleImages[selected]?.medium}
            </p>
            {(visibleImages[selected]?.camera || visibleImages[selected]?.lens) && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 mt-1.5">
                {[visibleImages[selected]?.camera, visibleImages[selected]?.lens].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
