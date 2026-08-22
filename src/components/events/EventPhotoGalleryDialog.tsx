import { useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import ModalDialog from "../ModalDialog";
import { normalizeEvent, type WebsiteEventPhoto } from "@/lib/events";
import { fetchPublicJson, PUBLIC_EVENTS_SWR_OPTIONS } from "@/lib/http";

interface EventPhotoGalleryDialogProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export default function EventPhotoGalleryDialog({
  eventId,
  eventTitle,
  onClose,
}: EventPhotoGalleryDialogProps) {
  const { data, error, isLoading, mutate } = useSWR<Record<string, unknown>>(
    eventId ? `/api/events/${eventId}` : null,
    fetchPublicJson,
    PUBLIC_EVENTS_SWR_OPTIONS,
  );
  const event = data ? normalizeEvent(data) : null;
  const photos = event?.photos ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPhoto = photos[selectedIndex] ?? photos[0] ?? null;

  const selectRelativePhoto = (offset: number) => {
    if (photos.length < 2) return;
    setSelectedIndex((current) => (current + offset + photos.length) % photos.length);
  };

  return (
    <ModalDialog
      ariaLabel={`${eventTitle} photos`}
      onClose={onClose}
      className="flex items-end justify-center bg-black/90 p-2 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close event photos"
        className="absolute inset-0 cursor-default"
        onMouseDown={onClose}
      />
      <div className="relative z-10 flex max-h-[calc(100dvh-0.5rem)] w-full max-w-6xl flex-col overflow-hidden border border-neutral-800 bg-neutral-950 sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-600">Event photos</p>
            <h2 className="truncate text-lg text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{eventTitle}</h2>
          </div>
          <button type="button" aria-label="Close event photos" onClick={onClose} className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400">
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-neutral-500" role="status">
              <Loader2 className="animate-spin motion-reduce:animate-none" size={16} /> Loading event photos
            </div>
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
              <p role="alert" className="text-xs text-red-300">Unable to load this event’s photos.</p>
              <button type="button" onClick={() => void mutate()} className="min-h-11 border border-neutral-700 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-300 hover:border-neutral-500">Try again</button>
            </div>
          ) : !selectedPhoto ? (
            <p className="flex min-h-72 items-center justify-center text-xs text-neutral-500">No photos have been added to this event yet.</p>
          ) : (
            <EventPhotoViewer
              eventTitle={eventTitle}
              onNext={() => selectRelativePhoto(1)}
              onPrevious={() => selectRelativePhoto(-1)}
              onSelect={setSelectedIndex}
              photos={photos}
              selectedIndex={Math.min(selectedIndex, photos.length - 1)}
              selectedPhoto={selectedPhoto}
            />
          )}
        </div>

        <footer className="shrink-0 border-t border-neutral-800 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[10px] uppercase tracking-[0.15em] text-neutral-600 sm:px-5">
          {photos.length > 0 ? `${Math.min(selectedIndex + 1, photos.length)} of ${photos.length}` : "Event archive"}
        </footer>
      </div>
    </ModalDialog>
  );
}

function EventPhotoViewer({
  eventTitle,
  onNext,
  onPrevious,
  onSelect,
  photos,
  selectedIndex,
  selectedPhoto,
}: {
  eventTitle: string;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
  photos: WebsiteEventPhoto[];
  selectedIndex: number;
  selectedPhoto: WebsiteEventPhoto;
}) {
  const alt = selectedPhoto.caption ?? `${eventTitle} event photo`;

  return (
    <div className="space-y-4">
      <div className="relative flex min-h-64 items-center justify-center bg-black sm:min-h-[28rem]">
        <img
          src={selectedPhoto.imageUrl}
          alt={alt}
          className="max-h-[58dvh] max-w-full object-contain"
          decoding="async"
        />
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={onPrevious} className="absolute left-2 inline-flex min-h-11 min-w-11 items-center justify-center border border-neutral-700 bg-black/75 text-neutral-300 hover:border-neutral-400 hover:text-white sm:left-4">
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <button type="button" aria-label="Next photo" onClick={onNext} className="absolute right-2 inline-flex min-h-11 min-w-11 items-center justify-center border border-neutral-700 bg-black/75 text-neutral-300 hover:border-neutral-400 hover:text-white sm:right-4">
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          </>
        )}
      </div>
      {selectedPhoto.caption && <p className="text-center text-xs leading-relaxed text-neutral-400">{selectedPhoto.caption}</p>}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Event photo thumbnails">
          {photos.map((photo, index) => (
            <button
              type="button"
              key={photo.id}
              aria-label={`View photo ${index + 1}`}
              aria-current={index === selectedIndex ? "true" : undefined}
              onClick={() => onSelect(index)}
              className={`h-20 w-24 shrink-0 overflow-hidden border ${index === selectedIndex ? "border-white" : "border-neutral-800"}`}
            >
              <img src={photo.thumbnailUrl ?? photo.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
