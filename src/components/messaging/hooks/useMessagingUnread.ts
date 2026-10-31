import { useEffect, useState } from "react";
import { fetchData } from "../../../utils/fetchData";
import { subscribeMessagingUnread } from "../../../../backend/features/messaging/client/events";

export function useMessagingUnread() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const unsubscribeUnread = subscribeMessagingUnread(setUnread);
    let stopped = false;
    let busy = false;
    let unauthorized = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const poll = async () => {
      if (stopped || busy || unauthorized || document.hidden) return;
      busy = true;
      controller = new AbortController();
      const result = await fetchData<{ unreadCount: number }>(
        "/api/messaging/unread",
        { signal: controller.signal },
      );
      busy = false;
      if (stopped) return;
      if (controller.signal.aborted) {
        if (!document.hidden) timer = setTimeout(poll, 15000);
        return;
      }
      if (result.success) setUnread(result.data.unreadCount ?? 0);
      else if (result.error.status === 401) unauthorized = true;
      if (!unauthorized && !document.hidden)
        timer = setTimeout(poll, 15000);
    };

    const handleVisibilityChange = () => {
      clearTimeout(timer);
      if (document.hidden) controller?.abort();
      else void poll();
    };

    void poll();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeUnread();
    };
  }, []);

  return unread;
}
