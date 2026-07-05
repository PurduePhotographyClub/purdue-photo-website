import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { X, Film, Aperture } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
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

const galleryCategories = ["All", "Digital", "Film"];

function readImageKey(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export default function Gallery() {
  const { data: galleryRows, error } = useSWR<any[]>("/api/gallery", fetchPublicJson, PUBLIC_API_SWR_OPTIONS);
  const images: GalleryImage[] = (galleryRows ?? []).flatMap((r) => {
    const tagStr = r.tags || "";
    const tagList = tagStr.split(",").map((t: string) => t.trim().toLowerCase());
    const isFilm = tagList.includes("film");
    const originalKey = readImageKey(r.r2Key, r.r2_key, r.thumbnailR2Key, r.thumbnail_r2_key);
    if (!originalKey) return [];

    const imageSrc = `/api/gallery/image/${originalKey}`;
    return [{
      fullSrc: `/api/gallery/image/${originalKey}`,
      height: r.height ?? null,
      src: imageSrc,
      cat: r.tags || r.title || "Photography",
      author: r.uploaderName || "PPC Member",
      medium: isFilm ? "Film" : "Digital",
      camera: r.camera || null,
      lens: r.lens || null,
      width: r.width ?? null,
    }];
  });
  const status: "loading" | "loaded" | "error" = !galleryRows && !error ? "loading" : error ? "error" : "loaded";
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<number | null>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);

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

  const filtered = filter === "All"
    ? images
    : filter === "Digital"
      ? images.filter((i) => i.medium === "Digital")
      : images.filter((i) => i.medium === "Film");

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

        {status !== "loaded" && images.length === 0 ? null : (
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {galleryCategories.map((cat) => (
              <button type="button" key={cat} onClick={() => setFilter(cat)}
                className={`flex min-h-11 items-center gap-2 border px-4 py-2 text-xs uppercase tracking-[0.2em] transition-all duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${filter === cat ? btnActive : btnInactive}`}>
                {cat}
              </button>
            ))}
          </div>
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
            <p className={`text-sm ${mutedText} tracking-wider`}>Unable to load the gallery right now. Please try again later.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className={`text-sm ${mutedText} tracking-wider`}>
              {images.length === 0 ? "No photos are published yet." : "No photos match this filter."}
            </p>
          </div>
        ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-2 space-y-2">
            {filtered.map((img, i) => (
              <button type="button" key={img.src + img.author}
                className="group relative mb-2 break-inside-avoid cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" onClick={() => setSelected(i)}>
                <ImageWithFallback src={img.src} alt={img.cat}
                  className="w-full transition-all duration-700 group-hover:scale-[1.03]"
                  loading={i < 12 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i < 3 ? "high" : "auto"}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  width={img.width ?? undefined}
                  height={img.height ?? undefined}
                />
                <div className="absolute inset-0 flex items-end bg-black/25 transition-all duration-300 sm:bg-black/0 sm:group-hover:bg-black/30 sm:group-focus-visible:bg-black/30">
                  <div className="w-full p-4 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs tracking-[0.2em] uppercase text-white">{img.cat}</p>
                        <p className="text-xs text-neutral-400 mt-1">by {img.author}</p>
                      </div>
                      <span className={`text-[9px] tracking-[0.2em] uppercase px-2 py-1 ${img.medium === "Film" ? "bg-neutral-900/90 text-neutral-400 border border-neutral-700" : "bg-white/10 backdrop-blur-sm text-neutral-300"}`}>
                        {img.medium === "Film" ? <span className="flex items-center gap-1"><Film size={8} /> Film</span> : <span className="flex items-center gap-1"><Aperture size={8} /> Digital</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>
        )}
      </div>

      {selected !== null && (
        <dialog
          aria-label="Gallery photo preview"
          ref={lightboxDialogRef}
          onClose={() => setSelected(null)}
          className="fixed inset-0 z-[120] h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-6 pt-16 text-inherit backdrop:bg-transparent">
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <button type="button" aria-label="Close gallery lightbox" className="absolute inset-0 cursor-default" onMouseDown={() => setSelected(null)} />
          <button type="button" className="absolute top-6 right-6 z-10 flex min-h-11 min-w-11 items-center justify-center text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400" onClick={() => setSelected(null)}><X size={24} /></button>
          <img
            src={filtered[selected]?.fullSrc} alt={filtered[selected]?.cat ?? "Selected gallery photo"} className="relative z-10 max-w-full max-h-[75vh] object-contain shrink min-h-0" loading="eager" decoding="async" />
          <div className="relative z-10 text-center shrink-0">
            <p className="text-xs tracking-[0.3em] uppercase text-neutral-400">
              {filtered[selected]?.cat} &middot; {filtered[selected]?.author} &middot; Shot on {filtered[selected]?.medium}
            </p>
            {(filtered[selected]?.camera || filtered[selected]?.lens) && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 mt-1.5">
                {[filtered[selected]?.camera, filtered[selected]?.lens].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
