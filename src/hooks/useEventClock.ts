import { useEffect, useState } from "react";

const EVENT_CLOCK_INTERVAL_MS = 30_000;

export function useEventClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateNow = () => setNow(new Date());
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
  }, []);

  return now;
}
