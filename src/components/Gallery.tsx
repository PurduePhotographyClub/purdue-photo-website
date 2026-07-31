import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import useSWR from "swr";
import { ExternalLink, X } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import {
  buildGalleryExploreUrl,
  createGalleryExploreViewToken,
  readGalleryExploreUrlState,
} from "@/lib/gallery-explore";
import {
  formatGalleryDate,
  getGalleryImageSources,
  normalizeGalleryPageForUrl,
} from "@/lib/gallery-images";
import { getGalleryLayoutClassNames } from "@/lib/gallery-layout";
import {
  GALLERY_TAGS,
  getPrimaryGalleryTag,
  parseGalleryTags,
} from "@/lib/gallery-tags";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

interface GalleryImage {
  fullSrc: string;
  height: number | null;
  src: string;
  cat: string | null;
  author: string | null;
  primaryTag: string | null;
  camera: string | null;
  createdAt: string | null;
  description: string | null;
  lens: string | null;
  metadataHidden: boolean;
  profileUrl: string | null;
  tags: string[];
  width: number | null;
}

interface GalleryPageResponse {
  legacy: boolean;
  photos: Record<string, unknown>[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    explore?: {
      recentCount: number;
      view: string;
    };
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

const galleryCategories = ["All", ...GALLERY_TAGS];
const GALLERY_DISCOVERY_PAGE_SIZE = 15;
const GALLERY_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  keepPreviousData: false,
};

function changeGalleryFilter(
  setFilter: Dispatch<SetStateAction<string>>,
  setPage: Dispatch<SetStateAction<number>>,
  setSelected: Dispatch<SetStateAction<number | null>>,
  category: string,
) {
  setFilter(category);
  setPage(1);
  setSelected(null);
}

function changeGalleryPage(
  setSelected: Dispatch<SetStateAction<number | null>>,
  setPage: Dispatch<SetStateAction<number>>,
  nextPage: number,
) {
  setSelected(null);
  setPage(nextPage);
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

async function fetchGalleryPage(url: string): Promise<GalleryPageResponse> {
  const data = await fetchPublicJson<unknown>(url);
  return normalizeGalleryPageForUrl<Record<string, unknown>>(data, url, GALLERY_DISCOVERY_PAGE_SIZE);
}

interface GalleryPhotoCollectionProps {
  isRecent?: boolean;
  onSelect: (index: number) => void;
  startIndex: number;
  visibleImages: GalleryImage[];
}

function GalleryPhotoCollection({
  isRecent = false,
  onSelect,
  startIndex,
  visibleImages,
}: GalleryPhotoCollectionProps) {
  const galleryLayout = getGalleryLayoutClassNames(visibleImages.length);
  const containerClassName = isRecent
    ? "grid grid-cols-1 gap-2 sm:grid-cols-3"
    : galleryLayout.container;

  return (
    <div className={containerClassName}>
      {visibleImages.map((img, i) => {
        const absoluteIndex = startIndex + i;
        const formattedDate = formatGalleryDate(img.createdAt);
        const figureClassName = isRecent
          ? "aspect-[4/3]"
          : galleryLayout.item;

        return (
          <figure key={img.fullSrc} className={`group relative ${figureClassName} overflow-hidden`}>
            {img.author && img.profileUrl && (
              <a
                href={img.profileUrl}
                aria-label={`View ${img.author} profile`}
                className="absolute bottom-1 left-4 z-20 inline-flex min-h-11 max-w-[70%] items-center gap-1.5 text-xs text-neutral-300 opacity-100 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <span className="truncate">by {img.author}</span>
                <ExternalLink aria-hidden="true" className="shrink-0" size={13} strokeWidth={1.5} />
              </a>
            )}
            <button
              type="button"
              aria-label={`View ${img.cat ?? "gallery photograph"}`}
              className={`block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${isRecent ? "h-full" : ""}`}
              onClick={() => onSelect(absoluteIndex)}
            >
              <ImageWithFallback
                src={img.src}
                alt={img.cat ?? "Gallery photograph"}
                className={`block w-full transition-transform duration-700 motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.03] ${isRecent ? "h-full object-cover" : ""}`}
                loading={absoluteIndex < 6 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={absoluteIndex < 2 ? "high" : "auto"}
                sizes={isRecent
                  ? "(min-width: 640px) 33vw, 100vw"
                  : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                width={img.width ?? undefined}
                height={img.height ?? undefined}
              />
              <div className="absolute inset-0 flex items-end bg-black/25 transition-colors duration-300 sm:bg-black/0 sm:group-hover:bg-black/30 sm:group-focus-within:bg-black/30">
                <div className={`w-full p-4 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${img.author && img.profileUrl ? "pb-11" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs tracking-[0.2em] uppercase text-white">{img.cat}</p>
                      {!isRecent && img.description && (
                        <p className="mt-1 line-clamp-2 break-words text-[11px] leading-4 text-neutral-300">
                          {img.description}
                        </p>
                      )}
                      {!img.profileUrl && img.author && (
                        <p className="mt-1 truncate text-xs text-neutral-400">by {img.author}</p>
                      )}
                      {!isRecent && formattedDate && (
                        <p className="mt-1 text-[10px] text-neutral-400">
                          <time dateTime={img.createdAt ?? undefined}>{formattedDate}</time>
                        </p>
                      )}
                    </div>
                    {!isRecent && img.primaryTag && (
                      <span className="shrink-0 border border-neutral-700 bg-neutral-900/90 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-neutral-300">
                        {img.primaryTag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </figure>
        );
      })}
    </div>
  );
}

export default function Gallery() {
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [exploreView, setExploreView] = useState<string | null>(null);
  const tagFilter = filter === "All" ? "" : `&tag=${encodeURIComponent(filter)}`;
  const galleryUrl = exploreView
    ? `/api/gallery?page=${page}&per_page=${GALLERY_DISCOVERY_PAGE_SIZE}&format=page&order=explore&view=${encodeURIComponent(exploreView)}${tagFilter}`
    : null;
  const { data: galleryPage, error, mutate } = useSWR<GalleryPageResponse>(
    galleryUrl,
    fetchGalleryPage,
    GALLERY_SWR_OPTIONS,
  );
  const images: GalleryImage[] = (galleryPage?.photos ?? []).flatMap((r) => {
    const source = getGalleryImageSources(r);
    if (!source) return [];
    const tags = parseGalleryTags(source.tags);

    return [{
      fullSrc: source.fullSrc,
      height: source.height,
      src: source.previewSrc,
      cat: source.title,
      author: source.author,
      primaryTag: getPrimaryGalleryTag(tags),
      camera: source.camera,
      createdAt: source.createdAt,
      description: source.description,
      lens: source.lens,
      metadataHidden: source.metadataHidden,
      profileUrl: source.profileUrl,
      tags,
      width: source.width,
    }];
  });
  const visibleImages = galleryPage?.legacy && filter !== "All"
    ? images.filter((image) => image.tags.includes(filter))
    : images;
  const status: "loading" | "loaded" | "error" = !exploreView || (!galleryPage && !error)
    ? "loading"
    : error ? "error" : "loaded";
  const [selected, setSelected] = useState<number | null>(null);
  const galleryResultsRef = useRef<HTMLDivElement | null>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);
  const previousGalleryPageRef = useRef(1);
  const meta = galleryPage?.meta;
  const visiblePageNumbers = meta ? getVisiblePageNumbers(meta.page, meta.totalPages) : [];
  const recentImageCount = meta?.page === 1
    ? Math.min(meta.explore?.recentCount ?? 0, visibleImages.length)
    : 0;
  const recentImages = visibleImages.slice(0, recentImageCount);
  const discoveryImages = meta?.page === 1
    ? visibleImages.slice(recentImageCount)
    : visibleImages;
  const selectedImage = selected === null ? null : visibleImages[selected] ?? null;
  const selectedImageDescription = selected === null
    ? null
    : visibleImages[selected]?.description ?? null;
  const selectedImageDate = formatGalleryDate(selectedImage?.createdAt);

  useEffect(() => {
    const restoreGalleryLocation = () => {
      const locationState = readGalleryExploreUrlState(window.location.search, GALLERY_TAGS);
      const nextView = locationState.view ?? createGalleryExploreViewToken();
      setFilter(locationState.filter);
      setPage(locationState.page);
      setExploreView(nextView);
      setSelected(null);

      const normalizedUrl = buildGalleryExploreUrl({
        filter: locationState.filter,
        page: locationState.page,
        view: nextView,
      });
      if (`${window.location.pathname}${window.location.search}` !== normalizedUrl) {
        window.history.replaceState(
          null,
          "",
          normalizedUrl,
        );
      }
    };

    restoreGalleryLocation();
    window.addEventListener("popstate", restoreGalleryLocation);
    return () => window.removeEventListener("popstate", restoreGalleryLocation);
  }, []);

  useEffect(() => {
    const normalizedView = meta?.explore?.view;
    const normalizedPage = meta?.page;
    if (!normalizedView || !normalizedPage) return;
    if (normalizedView === exploreView && normalizedPage === page) return;

    if (normalizedView !== exploreView) setExploreView(normalizedView);
    if (normalizedPage !== page) setPage(normalizedPage);
    window.history.replaceState(
      null,
      "",
      buildGalleryExploreUrl({ filter, page: normalizedPage, view: normalizedView }),
    );
  }, [exploreView, filter, meta?.explore?.view, meta?.page, page]);

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
    if (!galleryPage || previousGalleryPageRef.current === galleryPage.meta.page) return;
    previousGalleryPageRef.current = galleryPage.meta.page;
    galleryResultsRef.current?.focus({ preventScroll: true });
    galleryResultsRef.current?.scrollIntoView({ block: "start" });
  }, [galleryPage]);

  const handleFilterChange = (category: string) => {
    if (!exploreView) return;
    changeGalleryFilter(setFilter, setPage, setSelected, category);
    window.history.pushState(
      null,
      "",
      buildGalleryExploreUrl({ filter: category, page: 1, view: exploreView }),
    );
  };

  const handlePageChange = (nextPage: number) => {
    if (!meta || nextPage < 1 || nextPage > meta.totalPages || nextPage === meta.page) return;
    changeGalleryPage(setSelected, setPage, nextPage);
    if (exploreView) {
      window.history.pushState(
        null,
        "",
        buildGalleryExploreUrl({ filter, page: nextPage, view: exploreView }),
      );
    }
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
          <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>Member mini-portfolio</p>
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
          <div className="columns-1 gap-2 sm:columns-2 lg:columns-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="mb-2 block w-full break-inside-avoid">
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
          <div className="flex flex-col gap-20">
            {recentImages.length > 0 && (
              <section aria-labelledby="gallery-recent-heading">
                <div className="mb-6 border-b border-neutral-800 pb-4">
                  <h2
                    id="gallery-recent-heading"
                    className="text-2xl tracking-wide text-neutral-100 sm:text-3xl"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Recently added
                  </h2>
                </div>
                <GalleryPhotoCollection
                  isRecent
                  onSelect={setSelected}
                  startIndex={0}
                  visibleImages={recentImages}
                />
              </section>
            )}

            {discoveryImages.length > 0 && (
              <section aria-labelledby="gallery-discover-heading">
                <div className="mb-6 border-b border-neutral-800 pb-4">
                  <h2
                    id="gallery-discover-heading"
                    className="text-2xl tracking-wide text-neutral-100 sm:text-3xl"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Discover
                  </h2>
                </div>
                <GalleryPhotoCollection
                  onSelect={setSelected}
                  startIndex={recentImageCount}
                  visibleImages={discoveryImages}
                />
              </section>
            )}
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

      {selectedImage && (
        <dialog
          aria-label="Gallery photo preview"
          ref={lightboxDialogRef}
          onClose={() => setSelected(null)}
          className="fixed inset-0 z-[120] h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-6 pt-16 text-inherit backdrop:bg-transparent">
          <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3">
          <button type="button" tabIndex={-1} aria-label="Close gallery lightbox" className="absolute inset-0 cursor-default" onMouseDown={() => setSelected(null)} />
          <button type="button" aria-label="Close gallery lightbox" className="absolute top-6 right-6 z-10 flex min-h-11 min-w-11 items-center justify-center text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" onClick={() => setSelected(null)}><X aria-hidden="true" size={24} /></button>
          <img
            src={selectedImage.fullSrc} alt={selectedImage.cat ?? "Selected gallery photo"} className="relative z-10 min-h-0 max-h-[62dvh] max-w-full shrink object-contain" loading="eager" decoding="async" />
          <div aria-label="Gallery photo details" tabIndex={0} className="relative z-10 max-h-[30dvh] w-full max-w-3xl shrink-0 overflow-y-auto px-2 text-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-neutral-500">
            <p className="text-xs tracking-[0.3em] uppercase text-neutral-400">
              {selectedImage.cat}
              {selectedImage.author && (
                <>
                  {" · "}
                  {selectedImage.profileUrl ? (
                    <a
                      aria-label={`View ${selectedImage.author} profile`}
                      className="inline-flex items-center gap-1 underline decoration-neutral-600 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
                      href={selectedImage.profileUrl}
                    >
                      <span>{selectedImage.author}</span>
                      <ExternalLink aria-hidden="true" size={12} strokeWidth={1.5} />
                    </a>
                  ) : selectedImage.author}
                </>
              )}
              {selectedImageDate && (
                <>
                  {" · "}
                  <time dateTime={selectedImage.createdAt ?? undefined}>{selectedImageDate}</time>
                </>
              )}
            </p>
            {!selectedImage.metadataHidden && (selectedImage.camera || selectedImage.lens) && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 mt-1.5">
                {[selectedImage.camera, selectedImage.lens].filter(Boolean).join(" · ")}
              </p>
            )}
            {selectedImageDescription && (
              <p className="mx-auto mt-3 max-w-2xl whitespace-pre-wrap break-words text-xs leading-5 text-neutral-400">
                {selectedImageDescription}
              </p>
            )}
            {selectedImage.tags.length > 0 && (
              <div aria-label="Photo tags" className="mt-3 flex flex-wrap justify-center gap-2">
                {selectedImage.tags.map((tag, index) => (
                  <span
                    key={tag}
                    className={`border px-2 py-1 text-[9px] uppercase tracking-[0.2em] ${index === 0 ? "border-neutral-500 text-neutral-300" : "border-neutral-800 text-neutral-600"}`}
                  >
                    {tag}{index === 0 ? " (Main)" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
