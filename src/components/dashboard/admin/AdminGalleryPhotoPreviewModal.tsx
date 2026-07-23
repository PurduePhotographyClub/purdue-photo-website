import { useState } from "react";
import { X } from "lucide-react";

import ModalDialog from "@/components/ModalDialog";
import { parseGalleryTags } from "@/lib/gallery-tags";
import type { AdminGalleryPhoto } from "./admin-gallery-types";

interface AdminGalleryPhotoPreviewModalProps {
  onClose: () => void;
  photo: AdminGalleryPhoto;
}

export default function AdminGalleryPhotoPreviewModal({
  onClose,
  photo,
}: AdminGalleryPhotoPreviewModalProps) {
  const tags = parseGalleryTags(photo.tags);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <ModalDialog ariaLabel="Gallery photo preview" onClose={onClose} className="flex items-center justify-center overflow-y-auto bg-black/95 p-2 sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Close photo preview backdrop" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <section className="relative z-10 flex max-h-[calc(100dvh-1rem)] min-h-0 w-full max-w-6xl flex-col overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl sm:max-h-[calc(100dvh-3rem)] lg:flex-row">
        <button
          type="button"
          aria-label="Close photo preview"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 flex min-h-11 min-w-11 items-center justify-center border border-neutral-800 bg-black/80 text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={20} />
        </button>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
          {imageFailed ? (
            <p role="alert" className="px-6 py-16 text-center text-xs text-neutral-500">
              The full-size image could not be loaded.
            </p>
          ) : (
            <img
              src={photo.imageUrl}
              alt={photo.title || "Gallery photo"}
              onError={() => setImageFailed(true)}
              className="max-h-[48dvh] w-full object-contain lg:h-full lg:max-h-[calc(100dvh-3rem)]"
            />
          )}
        </div>

        <div aria-label="Gallery photo details" tabIndex={0} className="max-h-[45dvh] min-h-0 shrink-0 overflow-y-auto p-5 pr-14 focus-visible:outline focus-visible:outline-1 focus-visible:outline-inset focus-visible:outline-neutral-500 sm:p-6 sm:pr-16 lg:max-h-none lg:w-80 lg:pr-6">
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">Gallery photo</p>
          <h2 className="mt-3 break-words text-lg tracking-wider text-neutral-100">
            {photo.title || "Untitled"}
          </h2>
          {photo.uploaderName && <p className="mt-1 text-[10px] text-neutral-500">by {photo.uploaderName}</p>}
          {photo.description && (
            <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-neutral-400">
              {photo.description}
            </p>
          )}

          {tags.length > 0 && (
            <div aria-label="Photo tags" className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag, index) => (
                <span key={tag} className={`border px-2 py-1 text-[9px] uppercase tracking-wider ${index === 0 ? "border-neutral-600 text-neutral-300" : "border-neutral-800 text-neutral-500"}`}>
                  {tag}{index === 0 ? " (Main)" : ""}
                </span>
              ))}
            </div>
          )}

          {(photo.camera || photo.lens) && (
            <dl className="mt-5 space-y-2 border-t border-neutral-900 pt-4 text-[10px]">
              {photo.camera && <div><dt className="text-neutral-700">Camera</dt><dd className="mt-0.5 break-words text-neutral-400">{photo.camera}</dd></div>}
              {photo.lens && <div><dt className="text-neutral-700">Lens</dt><dd className="mt-0.5 break-words text-neutral-400">{photo.lens}</dd></div>}
            </dl>
          )}

          <p className="mt-5 text-[10px] text-neutral-700">
            {new Date(photo.createdAt).toLocaleDateString()}
          </p>
        </div>
      </section>
    </ModalDialog>
  );
}
