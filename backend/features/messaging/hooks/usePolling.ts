import { useEffect, useRef } from "react";

// One request at a time; stop timers and abort requests when hidden or unmounted.
export function usePolling(
  task: (signal: AbortSignal) => Promise<void>,
  delay: number,
  enabled = true,
  immediate = true,
) {
  const latest = useRef(task);
  latest.current = task;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const visible = () => document.visibilityState !== "hidden";
    const tick = async () => {
      if (stopped || busy || !visible()) return;
      busy = true;
      controller = new AbortController();
      try {
        await latest.current(controller.signal);
      } finally {
        busy = false;
        if (!stopped && visible()) timer = setTimeout(tick, delay);
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") controller?.abort();
      else void tick();
    };
    if (immediate) void tick();
    else if (visible()) timer = setTimeout(tick, delay);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [delay, enabled, immediate]);
}
