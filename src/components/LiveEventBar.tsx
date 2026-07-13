import { useMemo } from "react";
import useSWR from "swr";
import { ArrowRight } from "lucide-react";
import { useEventClock } from "@/hooks/useEventClock";
import { findCurrentEvents, formatEventDateTime, normalizeEvent, type WebsiteEvent } from "@/lib/events";
import { fetchPublicJson, HOME_EVENTS_SWR_OPTIONS } from "@/lib/http";

interface HomeEventsResponse {
  current?: Record<string, unknown>[];
}

export default function LiveEventBar() {
  const { data } = useSWR<HomeEventsResponse>("/api/events?view=home", fetchPublicJson, HOME_EVENTS_SWR_OPTIONS);
  const now = useEventClock();
  const currentEvents = useMemo(
    () => findCurrentEvents((data?.current ?? []).map(normalizeEvent), now),
    [data, now],
  );
  const event = currentEvents[0] as WebsiteEvent | undefined;

  if (!event) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-28 z-30 border-y border-white/20 bg-black text-white"
    >
      <a
        href="/events#upcoming-events"
        aria-label={`Live now: ${event.title}. ${formatEventDateTime(event)}`}
        className="pointer-events-auto relative flex min-h-8 w-full items-center justify-center px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
      >
        <span className="flex min-w-0 max-w-[75%] items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex size-1.5 shrink-0 bg-white" aria-hidden="true" />
          <span className="shrink-0 font-bold">Live now</span>
          <span className="min-w-0 truncate normal-case tracking-[0.04em] text-neutral-200">{event.title}</span>
        </span>
        <span className="absolute right-3 hidden items-center gap-2 text-neutral-400 sm:flex">
          <span>{formatEventDateTime(event)}</span>
          {currentEvents.length > 1 && <span>+{currentEvents.length - 1} more</span>}
          <ArrowRight size={11} aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}
