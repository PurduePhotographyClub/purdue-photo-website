import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, CalendarDays, Clock, MapPin, Radio } from "lucide-react";
import {
  formatEventDateTime,
  formatEventDay,
  getEventLoadStatus,
  getEventStatus,
  normalizeEvent,
  splitEvents,
  type WebsiteEvent,
} from "@/lib/events";
import { useEventClock } from "@/hooks/useEventClock";
import { fetchPublicJson, PUBLIC_EVENTS_SWR_OPTIONS } from "@/lib/http";
import EventPhotoGalleryDialog from "@/components/events/EventPhotoGalleryDialog";

export default function EventsPage() {
  const { data: eventRows, error, mutate } = useSWR<Record<string, unknown>[]>("/api/events?limit=100&include=photo-summary", fetchPublicJson, PUBLIC_EVENTS_SWR_OPTIONS);
  const events = useMemo(() => (eventRows ?? []).map(normalizeEvent), [eventRows]);
  const status = getEventLoadStatus(eventRows, error);
  const hasRefreshError = Boolean(eventRows && error);

  const now = useEventClock();
  const { upcoming, past } = useMemo(() => splitEvents(events, now), [events, now]);
  const nextEvent = upcoming[0] ?? null;
  const [galleryEvent, setGalleryEvent] = useState<WebsiteEvent | null>(null);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <section className="relative overflow-hidden border-b border-neutral-800 px-6 py-20 md:py-28">
        <div className="absolute top-0 left-0 right-0 h-32 z-10 bg-gradient-to-b from-neutral-950 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #737373 1px, transparent 1px), linear-gradient(to bottom, #737373 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className={`relative mx-auto grid max-w-7xl gap-10 ${nextEvent ? "lg:grid-cols-[0.95fr_1.05fr] lg:items-end" : "lg:max-w-4xl"}`}>
          <div aria-live="polite">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-neutral-500">Club Calendar</p>
            <h1 className="text-5xl tracking-wider text-neutral-100 md:text-7xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Events
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed tracking-wider text-neutral-400 select-text">
              Photo walks, darkroom nights, critiques, socials, and member photo nights.
            </p>
          </div>

          <div>
            {nextEvent && (
              <NextEvent event={nextEvent} now={now} />
            )}
          </div>
        </div>
      </section>

      <section id="upcoming-events" className="border-b border-neutral-800 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Live Roll" title="Upcoming Events" count={upcoming.length} />

          {hasRefreshError && (
            <div role="status" className="mb-6 flex flex-col gap-3 border border-amber-900/60 bg-amber-950/10 p-4 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <span>Event refresh failed. Showing the last saved event list.</span>
              <button type="button" onClick={() => void mutate()} className="min-h-11 border border-amber-900/70 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-amber-700">
                Retry refresh
              </button>
            </div>
          )}

          {status === "loading" ? (
            <LoadingRows count={3} />
          ) : status === "error" ? (
            <EmptyState title="Could not load events" message="Try again in a moment." onRetry={() => void mutate()} />
          ) : upcoming.length === 0 ? (
            <EmptyState title="No upcoming events" message="The calendar is clear for now." />
          ) : (
            <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((event, index) => (
                <TimelineEvent key={event.id} event={event} index={index} now={now} featured={index === 0} />
              ))}
              <DiscordInfoCard />
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Archive" title="Past Events" count={past.length} />

          {status === "loading" ? (
            <LoadingRows count={4} compact />
          ) : status === "error" ? (
            <EmptyState title="Archive unavailable" message="Event history could not be loaded." onRetry={() => void mutate()} />
          ) : past.length === 0 ? (
            <EmptyState title="No past events yet" message="Past events will appear here after they end." />
          ) : (
            <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
              {past.map((event, index) => (
                <ArchiveEvent key={event.id} event={event} index={index} onOpenPhotos={setGalleryEvent} />
              ))}
            </div>
          )}
        </div>
      </section>

      {galleryEvent && (
        <EventPhotoGalleryDialog
          eventId={galleryEvent.id}
          eventTitle={galleryEvent.title}
          onClose={() => setGalleryEvent(null)}
        />
      )}
    </div>
  );
}

function NextEvent({ event, now }: { event: WebsiteEvent; now: Date }) {
  const isLive = getEventStatus(event, now) === "live";
  const parts = formatEventDay(event.date);

  return (
    <a href="#upcoming-events" className="group grid gap-5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 md:grid-cols-[120px_1fr]">
      <div className="relative flex min-h-40 flex-col items-center justify-center border border-neutral-700 bg-neutral-950">
        {isLive ? (
          <span className="absolute right-3 top-3 flex size-3" aria-hidden="true">
            <span className="absolute h-full w-full animate-ping rounded-full bg-amber-300 opacity-60 motion-reduce:animate-none" />
            <span className="relative size-3 rounded-full bg-amber-300" />
          </span>
        ) : (
          <CalendarDays className="absolute right-3 top-3 text-neutral-600" size={15} aria-hidden="true" />
        )}
        <span className="text-5xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{parts.day}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-neutral-500">{parts.month}</span>
      </div>
      <div className="flex min-h-40 flex-col justify-center border border-neutral-900 bg-black/20 p-6">
        <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-300">
          <Radio size={12} /> {isLive ? "Happening Now" : "Next Event"}
        </p>
        <h2 className="text-2xl tracking-wider text-neutral-100 group-hover:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{event.title}</h2>
        <EventMeta event={event} />
        {event.description && <p className="mt-4 text-xs leading-relaxed tracking-wider text-neutral-500 select-text">{event.description}</p>}
      </div>
    </a>
  );
}

function SectionHeader({ count, eyebrow, title }: { count: number; eyebrow: string; title: string }) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-neutral-500">{eyebrow}</p>
        <h2 className="text-3xl tracking-wider text-neutral-100 md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h2>
      </div>
      <span className="w-fit border border-neutral-800 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-neutral-500">
        {count} {count === 1 ? "event" : "events"}
      </span>
    </div>
  );
}

function TimelineEvent({ event, featured, index, now }: { event: WebsiteEvent; featured?: boolean; index: number; now: Date }) {
  const parts = formatEventDay(event.date);
  const isLive = getEventStatus(event, now) === "live";

  return (
    <article className={`group relative flex min-h-72 flex-col overflow-hidden border border-neutral-800 bg-white/[0.02] p-5 transition-colors hover:border-neutral-600 ${featured ? "md:col-span-2 xl:col-span-2 md:min-h-80 md:p-7" : ""}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-2 opacity-30"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #737373 0, #737373 4px, transparent 4px, transparent 18px)",
        }}
      />
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className={`${featured ? "h-20 w-20" : "h-16 w-16"} flex flex-col items-center justify-center border border-neutral-800 bg-black/30`}>
          <span className={`${featured ? "text-3xl" : "text-2xl"} tracking-wider text-neutral-100`} style={{ fontFamily: "'Playfair Display', serif" }}>{parts.day}</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">{parts.month}</span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-neutral-500">No. {String(index + 1).padStart(2, "0")}</span>
          {isLive && <span className="bg-amber-300 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-black">Now</span>}
        </div>
      </div>
      <div className="mt-auto">
        <h3 className={`${featured ? "text-3xl" : "text-xl"} tracking-wider text-neutral-100 group-hover:text-white`} style={{ fontFamily: "'Playfair Display', serif" }}>{event.title}</h3>
        {event.description && <p className="mt-3 max-w-3xl text-xs leading-relaxed tracking-wider text-neutral-500 select-text">{event.description}</p>}
        <EventMeta event={event} />
      </div>
    </article>
  );
}

function DiscordInfoCard() {
  return (
    <aside className="group flex min-h-72 flex-col justify-between border border-neutral-800 bg-white/[0.02] p-5 transition-colors hover:border-neutral-600">
      <div>
        <div className="mb-10 flex size-14 items-center justify-center border border-neutral-800 bg-black/30 text-neutral-500">
          <CalendarDays size={20} strokeWidth={1.3} />
        </div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-neutral-500">Discord Updates</p>
        <h3 className="text-xl tracking-wider text-neutral-100 group-hover:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          RSVP, room changes, and last-minute updates live in Discord.
        </h3>
      </div>
      <a href="/discord" className="mt-8 inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
        Open Discord <ArrowRight size={12} />
      </a>
    </aside>
  );
}

function ArchiveEvent({ event, index, onOpenPhotos }: { event: WebsiteEvent; index: number; onOpenPhotos: (event: WebsiteEvent) => void }) {
  const parts = formatEventDay(event.date);
  const coverSrc = event.coverPhoto?.thumbnailUrl ?? event.coverPhoto?.imageUrl;

  return (
    <article className="group flex min-h-56 flex-col overflow-hidden border border-neutral-800 bg-white/[0.02] transition-colors hover:border-neutral-600">
      {coverSrc && (
        <button type="button" onClick={() => onOpenPhotos(event)} aria-label={`View ${event.photoCount} photos from ${event.title}`} className="relative block aspect-[16/9] w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-neutral-300">
          <img src={coverSrc} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100" loading="lazy" decoding="async" />
          <span className="absolute bottom-3 right-3 bg-black/80 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-neutral-200">{event.photoCount} {event.photoCount === 1 ? "photo" : "photos"}</span>
        </button>
      )}
      <div className="flex flex-1 flex-col p-5">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="flex size-14 flex-col items-center justify-center border border-neutral-800 bg-black/30">
          <span className="text-xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{parts.day}</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">{parts.month}</span>
        </div>
        <span className="text-xs text-neutral-700">A{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h3 className="mb-3 text-lg tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>{event.title}</h3>
      {event.description && <p className="text-xs leading-relaxed tracking-wider text-neutral-500 select-text">{event.description}</p>}
      {event.location && <p className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-600"><MapPin size={11} /> {event.location}</p>}
      {event.photoCount > 0 && (
        <button type="button" onClick={() => onOpenPhotos(event)} className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.16em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400">
          View event photos <ArrowRight size={12} />
        </button>
      )}
      </div>
    </article>
  );
}

function EventMeta({ event }: { event: WebsiteEvent }) {
  return (
    <div className="mt-5 flex flex-col gap-2 text-xs tracking-wider text-neutral-500 sm:flex-row sm:items-center sm:gap-5">
      <span className="flex items-center gap-2"><Clock size={12} />{formatEventDateTime(event)}</span>
      {event.location && <span className="flex items-center gap-2"><MapPin size={12} />{event.location}</span>}
    </div>
  );
}

function LoadingRows({ compact = false, count }: { compact?: boolean; count: number }) {
  return (
    <div className={`grid gap-1 ${compact ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse border border-neutral-800 bg-neutral-900/70" />
      ))}
    </div>
  );
}

function EmptyState({ message, onRetry, title }: { message: string; onRetry?: () => void; title: string }) {
  return (
    <div className="border border-neutral-800 bg-white/[0.02] p-8 text-center">
      <p className="mb-2 text-sm tracking-wider text-neutral-300">{title}</p>
      <p className="text-xs tracking-wider text-neutral-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center border border-neutral-700 px-4 text-[10px] uppercase tracking-[0.2em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
        >
          Retry
        </button>
      )}
    </div>
  );
}
