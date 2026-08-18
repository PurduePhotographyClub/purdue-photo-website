import { useMemo } from "react";
import useSWR from "swr";
import { ArrowRight } from "lucide-react";
import { useEventClock } from "@/hooks/useEventClock";
import {
  findCurrentEvents,
  findNextUpcomingEvent,
  formatEventDateTime,
  normalizeEvent,
  type WebsiteEvent,
} from "@/lib/events";
import { fetchPublicJson, HOME_EVENTS_API_KEY, HOME_EVENTS_SWR_OPTIONS } from "@/lib/http";

interface HomeEventsResponse {
  current?: Record<string, unknown>[];
  upcoming?: Record<string, unknown>[];
}

export interface FeaturedEvents {
  currentEvents: WebsiteEvent[];
  upcomingEvent: WebsiteEvent | null;
}

export function useFeaturedEvents(): FeaturedEvents {
  const { data } = useSWR<HomeEventsResponse>(HOME_EVENTS_API_KEY, fetchPublicJson, HOME_EVENTS_SWR_OPTIONS);
  const eventRows = useMemo(
    () => [...(data?.current ?? []), ...(data?.upcoming ?? [])].map(normalizeEvent),
    [data],
  );
  const now = useEventClock(eventRows.length > 0);
  return useMemo(
    () => ({
      currentEvents: findCurrentEvents(eventRows, now),
      upcomingEvent: findNextUpcomingEvent(eventRows, now),
    }),
    [eventRows, now],
  );
}

export default function LiveEventBar({ featuredEvents }: { featuredEvents: FeaturedEvents }) {
  const { currentEvents: liveEvents, upcomingEvent } = featuredEvents;
  const event = liveEvents[0] ?? upcomingEvent;

  if (!event) return null;

  const isLive = liveEvents.length > 0;
  const statusLabel = isLive ? "Live now" : "Next event";

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-t border-white/20 bg-black text-white"
    >
      <a
        href="/events#upcoming-events"
        aria-label={`${statusLabel}: ${event.title}. ${formatEventDateTime(event)}`}
        className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.18em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-white sm:px-6 sm:text-[11px]"
      >
        <span className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className={`inline-flex size-2 shrink-0 ${isLive ? "bg-white" : "border border-white"}`} aria-hidden="true" />
          <span className="shrink-0 font-bold">{statusLabel}</span>
          <span className="min-w-0 truncate normal-case tracking-[0.02em] text-neutral-200">{event.title}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 text-[10px] text-neutral-400 md:flex">
          <span>{formatEventDateTime(event)}</span>
          {isLive && liveEvents.length > 1 && <span>+{liveEvents.length - 1} more</span>}
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}
