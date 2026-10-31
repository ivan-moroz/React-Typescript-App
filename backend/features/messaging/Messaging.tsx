import { useCallback, useEffect, useReducer, useRef } from "react";
import MessagingPanel from "./components/MessagingPanel";
import { subscribeMessagingUnread } from "./client/events";
import { formatUnreadCount } from "./utils/utils";
import type { MessagingSnapshot } from "./types/types";
import {
  createInitialMessagingState,
  messagingReducer,
} from "./reducer/messagingReducer";
import { MESSAGING_ACTIONS } from "./constants/actionConstants";

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
  const [state, dispatch] = useReducer(
    messagingReducer,
    { snapshot: initialData, open: initialOpen },
    ({ snapshot, open }) => createInitialMessagingState(snapshot, open),
  );
  const { user, open, unread, error } = state;
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const expire = useCallback(
    () => dispatch({ type: MESSAGING_ACTIONS.SESSION_EXPIRED }),
    [],
  );
  const close = useCallback(() => {
    dispatch({ type: MESSAGING_ACTIONS.OPEN_CHANGED, open: false });
    trigger.current?.focus();
  }, []);
  const onUnreadChange = (count: number) => {
    dispatch({ type: MESSAGING_ACTIONS.UNREAD_CHANGED, unread: count });
  };
  const onTogglePanel = () => {
    dispatch({ type: MESSAGING_ACTIONS.OPEN_CHANGED, open: !open });
  };
  useEffect(() => onOpenChange?.(open), [onOpenChange, open]);
  useEffect(() => {
    dispatch({
      type: MESSAGING_ACTIONS.SNAPSHOT_RECEIVED,
      snapshot: initialData,
    });
  }, [initialData]);
  useEffect(() => {
    if (!user) return;
    return subscribeMessagingUnread((count) => {
      dispatch({ type: MESSAGING_ACTIONS.UNREAD_CHANGED, unread: count });
    });
  }, [user]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node))
        dispatch({ type: MESSAGING_ACTIONS.OPEN_CHANGED, open: false });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKeyDown);
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
          onClick={onTogglePanel}
        >
          <span className="material-icons" aria-hidden="true">
            chat_bubble_outline
          </span>
          {unread > 0 && (
            <span className="messaging-badge" aria-hidden="true">
              {formatUnreadCount(unread)}
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
            onUnread={onUnreadChange}
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
