import { useState } from "react";
import { ImagePlus, Loader2, Save, Trash2, Upload, X } from "lucide-react";
import ModalDialog from "../../../ModalDialog";
import type { WebsiteEvent, WebsiteEventPhoto } from "@/lib/events";
import { useEventPhotos } from "./useEventPhotos";

interface EventPhotoManagerDialogProps {
  event: WebsiteEvent;
  onClose: () => void;
}

export default function EventPhotoManagerDialog({ event, onClose }: EventPhotoManagerDialogProps) {
  const controller = useEventPhotos(event.id);
  const isBusy = controller.uploading || controller.busyPhotoId !== null;

  return (
    <ModalDialog ariaLabel={`Manage photos for ${event.title}`} onClose={onClose} preventClose={isBusy} className="flex items-end justify-center bg-black/85 p-2 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Close event photo manager" className="absolute inset-0 cursor-default" onMouseDown={() => !isBusy && onClose()} />
      <div className="relative z-10 flex max-h-[calc(100dvh-0.5rem)] w-full max-w-5xl flex-col overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/70 sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-800 p-4 sm:p-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-600">Event gallery</p>
            <h2 className="mt-1 text-xl text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{event.title}</h2>
          </div>
          <button type="button" aria-label="Close event photo manager" onClick={onClose} disabled={isBusy} className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-40">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <form onSubmit={controller.uploadPhoto} className="grid gap-4 border border-neutral-800 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <label className="group flex min-h-48 cursor-pointer items-center justify-center overflow-hidden border border-dashed border-neutral-700 bg-black/30 text-center transition-colors hover:border-neutral-500">
              {controller.previewUrl ? (
                <img src={controller.previewUrl} alt="Selected event photo preview" className="h-full max-h-72 w-full object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-3 px-5 text-xs text-neutral-500"><ImagePlus size={24} strokeWidth={1.3} />Choose a JPEG event photo</span>
              )}
              <input
                key={controller.fileInputKey}
                type="file"
                accept="image/jpeg"
                className="sr-only"
                disabled={controller.uploading}
                onChange={(changeEvent) => void controller.chooseFile(changeEvent.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex flex-col justify-between gap-4">
              <div>
                <label className="block space-y-1.5">
                  <span className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em] text-neutral-500"><span>Caption</span><span className="text-neutral-700">{controller.caption.length}/500</span></span>
                  <textarea value={controller.caption} onChange={(changeEvent) => controller.setCaption(changeEvent.target.value)} maxLength={500} rows={4} placeholder="Optional context for this photo" className="w-full resize-y border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none" />
                </label>
                <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">The full image and a lightweight preview are optimized before upload. JPEG only.</p>
              </div>
              <button type="submit" disabled={!controller.selectedFile || controller.uploading} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 text-[10px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-40">
                {controller.uploading ? <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> : <Upload size={14} />}
                {controller.uploading ? "Optimizing & uploading" : "Upload photo"}
              </button>
            </div>
          </form>

          {(controller.error || controller.notice) && (
            <div className="mt-4">
              {controller.error && <p role="alert" className="border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs text-red-300">{controller.error}</p>}
              {controller.notice && <p role="status" className="border border-green-900/50 bg-green-950/20 px-4 py-3 text-xs text-green-300">{controller.notice}</p>}
            </div>
          )}

          <section className="mt-6" aria-labelledby="managed-event-photos-heading">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 id="managed-event-photos-heading" className="text-sm text-neutral-200">Uploaded photos</h3>
              <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">{controller.photos.length} total</span>
            </div>
            {controller.isLoading ? (
              <p role="status" className="flex min-h-32 items-center justify-center gap-2 text-xs text-neutral-500"><Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> Loading photos</p>
            ) : controller.photos.length === 0 ? (
              <p className="border border-neutral-800 p-5 text-xs text-neutral-500">No photos have been added to this event.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {controller.photos.map((photo) => (
                  <ManagedEventPhoto
                    busy={controller.busyPhotoId === photo.id}
                    key={photo.id}
                    onDelete={() => void controller.deletePhoto(photo.id)}
                    onSave={(caption) => controller.updateCaption(photo.id, caption)}
                    photo={photo}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          <button type="button" onClick={onClose} disabled={isBusy} className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-400 hover:border-neutral-600 hover:text-white disabled:opacity-40">Done</button>
        </footer>
      </div>
    </ModalDialog>
  );
}

function ManagedEventPhoto({ busy, onDelete, onSave, photo }: { busy: boolean; onDelete: () => void; onSave: (caption: string) => Promise<boolean>; photo: WebsiteEventPhoto }) {
  const [caption, setCaption] = useState(photo.caption ?? "");

  return (
    <article className="overflow-hidden border border-neutral-800 bg-black/20">
      <img src={photo.thumbnailUrl ?? photo.imageUrl} alt={photo.caption ?? "Event photo"} className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" />
      <div className="space-y-3 p-3">
        <label className="block space-y-1.5"><span className="text-[9px] uppercase tracking-[0.18em] text-neutral-600">Caption</span><textarea value={caption} onChange={(changeEvent) => setCaption(changeEvent.target.value)} maxLength={500} rows={2} className="w-full resize-y border border-neutral-800 bg-transparent px-3 py-2 text-xs text-neutral-300 focus:border-neutral-500 focus:outline-none" /></label>
        <div className="flex gap-2">
          <button type="button" onClick={() => void onSave(caption)} disabled={busy || caption.trim() === (photo.caption ?? "")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-neutral-700 px-3 text-[10px] uppercase tracking-[0.12em] text-neutral-300 hover:border-neutral-500 disabled:opacity-40"><Save size={12} /> Save</button>
          <button type="button" aria-label="Delete event photo" title={`Delete photo ${photo.id}`} onClick={onDelete} disabled={busy} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-red-950 text-red-500 hover:border-red-800 hover:text-red-300 disabled:opacity-40"><Trash2 size={14} /></button>
        </div>
      </div>
    </article>
  );
}
