"use client";

import { useEffect, useRef, useState } from "react";
import { requestMessagingSync, subscribeMessagingRealtime } from "../messaging/client/realtime";

export default function NavigationRealtime({
  userId,
  unreadCount,
}: {
  userId: number;
  unreadCount: number;
}) {
  const [unread, setUnread] = useState(unreadCount);
  const unreadRef = useRef(unreadCount);
  const unreadRequestId = useRef(0);
  const receivedMessageUpdate = useRef(false);

  useEffect(() => {
    const refreshUnread = () => {
      const requestId = ++unreadRequestId.current;
      requestMessagingSync({ type: "sync-unread", requestId });
    };

    const handleUnread = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (Number.isSafeInteger(count) && count >= 0) {
        unreadRef.current = count;
        setUnread(count);
      }
    };
    const handleConnectionRestore = () => {
      if (document.visibilityState === "visible")
        refreshUnread();
    };

    window.addEventListener("messaging:unread", handleUnread);
    window.addEventListener("online", handleConnectionRestore);
    window.addEventListener("focus", handleConnectionRestore);
    document.addEventListener("visibilitychange", handleConnectionRestore);
    const unsubscribe = subscribeMessagingRealtime((event) => {
      if (event.type === "connected") {
        receivedMessageUpdate.current = false;
        refreshUnread();
        return;
      }
      if (event.type === "sync-inbox") {
        // The initial inbox snapshot can race with newer message events. The
        // separate sync-unread request below is versioned and authoritative.
        return;
      }
      if (event.type === "unread-count") {
        if (event.requestId !== undefined) {
          if (event.requestId !== unreadRequestId.current) return;
        } else if (receivedMessageUpdate.current) {
          // Older running server instances do not echo request IDs. Do not let
          // their potentially stale reply undo an optimistic live increment.
          return;
        }
        window.dispatchEvent(new CustomEvent<number>("messaging:unread", { detail: event.unreadCount }));
        return;
      }
      if (event.type !== "update" || event.actorId === userId) return;
      if (event.kind === "message-sent") {
        // Show the indicator immediately from the live event; the versioned
        // unread sync below corrects the count from the database.
        unreadRef.current += 1;
        receivedMessageUpdate.current = true;
        window.dispatchEvent(new CustomEvent<number>("messaging:unread", {
          detail: unreadRef.current,
        }));
        refreshUnread();
      } else if (event.kind === "message-read" || event.kind === "conversation-deleted") {
        refreshUnread();
      }
    });

    return () => {
      window.removeEventListener("messaging:unread", handleUnread);
      window.removeEventListener("online", handleConnectionRestore);
      window.removeEventListener("focus", handleConnectionRestore);
      document.removeEventListener("visibilitychange", handleConnectionRestore);
      unsubscribe();
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
