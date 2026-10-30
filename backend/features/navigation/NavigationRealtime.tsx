"use client";

import { useEffect, useState } from "react";
import { fetchData } from "../../../src/utils/fetchData";
import { subscribeMessagingRealtime } from "../messaging/client/realtime";

export default function NavigationRealtime({
  userId,
  unreadCount,
}: {
  userId: number;
  unreadCount: number;
}) {
  const [unread, setUnread] = useState(unreadCount);

  useEffect(() => {
    const request = new AbortController();
    const refreshUnread = async () => {
      const result = await fetchData<{ unreadCount: number }>(
        "/api/messaging/unread",
        { signal: request.signal },
      );
      if (request.signal.aborted) return;
      if (!result.success) {
        console.error("Could not refresh the messaging unread count.", result.error);
        return;
      }
      window.dispatchEvent(
        new CustomEvent<number>("messaging:unread", {
          detail: result.data.unreadCount,
        }),
      );
    };

    const handleUnread = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (Number.isSafeInteger(count) && count >= 0) setUnread(count);
    };

    window.addEventListener("messaging:unread", handleUnread);
    const unsubscribe = subscribeMessagingRealtime((event) => {
      if (
        (event.type === "connected" && event.reconnected) ||
        (event.type === "update" && event.actorId !== userId)
      ) {
        void refreshUnread();
      }
    });

    return () => {
      window.removeEventListener("messaging:unread", handleUnread);
      unsubscribe();
      request.abort();
    };
  }, [userId]);

  return (
    <a
      href="/messaging"
      className="messages-link"
      aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}
      data-open-messaging-panel
    >
      <span className="material-icons" aria-hidden="true">
        chat_bubble_outline
      </span>
      {unread > 0 && (
        <span className="messages-link-badge">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </a>
  );
}
