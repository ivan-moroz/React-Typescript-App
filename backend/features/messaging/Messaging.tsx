import { useCallback, useEffect, useRef, useState } from "react";
import { fetchData } from "../../../src/utils/fetchData";
import MessagingPanel from "./components/MessagingPanel";
import { usePolling } from "./hooks/usePolling";
import type { MessagingSnapshot } from "./types/types";

export default function Messaging({
  initialData,
  initialOpen = false,
  onOpenChange,
}: {
  initialData: MessagingSnapshot;
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [user, setUser] = useState(initialData.user);
  const [open, setOpen] = useState(initialOpen);
  const [unread, setUnread] = useState(
    initialData.conversationPage.unreadCount,
  );
  const [error, setError] = useState(initialData.error);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const expire = useCallback(() => {
    setUser(null);
    setUnread(0);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);
  useEffect(() => onOpenChange?.(open), [onOpenChange, open]);
  useEffect(() => {
    setUser(initialData.user);
    setUnread(initialData.conversationPage.unreadCount);
    setError(initialData.error);
  }, [initialData]);
  usePolling(
    async (signal) => {
      const result = await fetchData<{ unreadCount: number }>(
        "/api/messaging/unread",
        { signal },
      );
      if (signal.aborted) return;
      if (result.success) {
        setUnread(result.data.unreadCount ?? 0);
        setError("");
      } else if (result.error.status === 401) expire();
      else setError(result.error.message);
    },
    15000,
    Boolean(user) && !open,
    false,
  );
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, close]);
  return (
    <div className="messaging" ref={wrapper}>
      <button
        ref={trigger}
        type="button"
        className="messaging-trigger"
        aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="material-icons" aria-hidden="true">
          chat_bubble_outline
        </span>
        {unread > 0 && (
          <span className="messaging-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <section
        className="messaging-panel"
        hidden={!open}
        role="dialog"
        aria-label="Private messages"
      >
        <header className="messaging-heading">
          <h2>Messages</h2>
          <button type="button" onClick={close} aria-label="Close messages">
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </header>
        {user ? (
          <MessagingPanel
            key={user.id}
            user={user}
            initialData={initialData}
            active={open}
            onUnread={setUnread}
            onExpired={expire}
          />
        ) : (
          <div className="messaging-empty">
            {error && <p role="alert">{error}</p>}
            <p>Log in to send private messages.</p>
            <a href="/login">Log in</a>
          </div>
        )}
        {user && (
          <a
            className="messaging-more"
            href="/messaging"
          >
            Open full inbox
          </a>
        )}
      </section>
    </div>
  );
}
