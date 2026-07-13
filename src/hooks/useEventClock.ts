import { useEffect, useState } from "react";

const EVENT_CLOCK_INTERVAL_MS = 30_000;

export function useEventClock(enabled = true) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;

    const updateNow = () => setNow(new Date());
    updateNow();
    const intervalId = window.setInterval(updateNow, EVENT_CLOCK_INTERVAL_MS);
    const updateWhenVisible = () => {
      if (document.visibilityState === "visible") {
        updateNow();
      }
    };

    document.addEventListener("visibilitychange", updateWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateWhenVisible);
    };
  }, [enabled]);

  return now;
}
