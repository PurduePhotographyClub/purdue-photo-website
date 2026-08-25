import { useEffect, useRef, useState } from "react";
import ModalDialog from "./ModalDialog";
import {
  FILM_EVENT_DETAILS,
  FILM_EVENT_KNOWLEDGE_LAB_HOURS,
  FILM_EVENT_RETURN_DETAILS,
  FILM_EVENT_RETURN_WINDOWS,
} from "@/lib/film-event";

export default function FilmEventReturnDetails() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  return (
    <>
      <div className="mx-auto max-w-sm text-left">
        <button
          ref={triggerRef}
          id="return-details-anchor"
          type="button"
          aria-haspopup="dialog"
          aria-controls="film-event-return-details"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
          className="return-details-anchor group flex min-h-16 w-full scroll-mt-24 items-center justify-between gap-4 border-2 border-black bg-[#ffcf2f] px-4 py-3 text-left shadow-[6px_6px_0_#171717] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-black motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span>
            <span className="block text-sm font-bold uppercase tracking-[0.08em]">
              {FILM_EVENT_RETURN_DETAILS.buttonLabel}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.08em]">
              {FILM_EVENT_RETURN_DETAILS.buttonHint}
            </span>
          </span>
          <span aria-hidden="true" className="text-2xl font-bold transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
            →
          </span>
        </button>

        <div className="mt-4 border-l-4 border-[#ff5f45] pl-3 text-xs font-bold leading-5">
          <p><span aria-hidden="true">*</span> {FILM_EVENT_DETAILS.cameraPolicy}</p>
          <a
            href={FILM_EVENT_RETURN_DETAILS.knowledgeLabUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center underline decoration-2 underline-offset-4 hover:text-[#b85b00] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Find the Knowledge Lab · {FILM_EVENT_RETURN_DETAILS.knowledgeLabLocation}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>

      {isOpen && (
        <ModalDialog
          ariaLabel={FILM_EVENT_RETURN_DETAILS.title}
          onClose={() => setIsOpen(false)}
          className="bg-transparent"
        >
          <div className="relative min-h-dvh overflow-y-auto bg-black/65 px-5 py-6 sm:px-8 sm:py-10">
            <button
              type="button"
              aria-label="Close return details"
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <section
              id="film-event-return-details"
              aria-labelledby="film-event-return-details-title"
              className="relative mx-auto max-w-3xl border-2 border-black bg-[#f4eee5] p-6 text-[#171717] shadow-[10px_10px_0_#ffcf2f] sm:p-10"
            >
              <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-6">
                <div>
                  <h2 id="film-event-return-details-title" className="text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
                    Where to return your camera
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close return details"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-2 border-black bg-[#ff5f45] text-xl font-bold transition-colors hover:bg-[#ef8700] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-black"
                >
                  ×
                </button>
              </div>

              <p className="mt-6 max-w-2xl text-sm font-bold leading-7">
                Bring the camera back by 5 PM on Saturday, September 5. Choose the handoff window that works for you:
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {FILM_EVENT_RETURN_WINDOWS.map((window) => (
                  <div key={`${window.date}-${window.location}`} className="border-2 border-black bg-white/45 p-4 text-sm font-bold leading-6">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#b85b00]">{window.date}</p>
                    <p className="mt-1">{window.location}</p>
                    <p className="mt-1">{window.hours}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t-2 border-black pt-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[#b85b00]">
                  Knowledge Lab hours
                </h3>
                <div className="mt-4 grid gap-2 text-sm font-bold leading-6">
                  {FILM_EVENT_KNOWLEDGE_LAB_HOURS.map((window) => (
                    <p key={window.days} className="flex flex-wrap justify-between gap-x-4 border-b border-black/20 pb-2">
                      <span>{window.days}</span>
                      <span>{window.hours}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-5 text-sm font-bold leading-7">
                  On Saturday after 1 PM, drop-off moves to the darkroom until 5 PM. I’ll be there to accept cameras.
                </p>
              </div>
            </section>
          </div>
        </ModalDialog>
      )}
    </>
  );
}
