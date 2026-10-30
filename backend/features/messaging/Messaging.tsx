import { useCallback, useEffect, useRef, useState } from "react";
import MessagingPanel from "./components/MessagingPanel";
import type { MessagingSnapshot } from "./types/types";

export default function Messaging({
  initialData,
  initialOpen = false,
  showTrigger = true,
  onOpenChange,
}: {
  initialData: MessagingSnapshot;
  initialOpen?: boolean;
  showTrigger?: boolean;
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
  useEffect(() => {
    if (!user) return;
    const handleUnread = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (Number.isSafeInteger(count) && count >= 0) {
        setUnread(count);
        setError("");
      }
    };
    window.addEventListener("messaging:unread", handleUnread);
    return () => {
      window.removeEventListener("messaging:unread", handleUnread);
    };
  }, [user]);
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
      {showTrigger && (
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
      )}
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
