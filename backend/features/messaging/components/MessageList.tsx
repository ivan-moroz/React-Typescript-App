import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types/types";
import { messageTime } from "../utils/utils";

export default function MessageList({
  messages,
  currentUserId,
  loading,
  loadingOlder,
  hasOlder,
  onLoadOlder,
  onDeleteMessage,
}: {
  messages: ChatMessage[];
  currentUserId: number;
  loading: boolean;
  loadingOlder: boolean;
  hasOlder: boolean;
  onLoadOlder: () => Promise<void>;
  onDeleteMessage: (id: string) => void;
}) {
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const latest = messages[messages.length - 1];

  useEffect(() => {
    if (log.current && (nearBottom.current || latest?.senderId === currentUserId))
      log.current.scrollTop = log.current.scrollHeight;
  }, [latest?.id, currentUserId]);

  return (
    <div
      className="chat-messages"
      ref={log}
      role="log"
      aria-label="Message history"
      aria-live="polite"
      onScroll={() => {
        const element = log.current;
        if (element)
          nearBottom.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
      }}
    >
      {hasOlder && (
        <button
          className="messaging-more"
          type="button"
          disabled={loadingOlder}
          onClick={async () => {
            const height = log.current?.scrollHeight ?? 0;
            const top = log.current?.scrollTop ?? 0;
            await onLoadOlder();
            requestAnimationFrame(() => {
              if (log.current)
                log.current.scrollTop =
                  top + log.current.scrollHeight - height;
            });
          }}
        >
          {loadingOlder ? "Loading…" : "Load older messages"}
        </button>
      )}
      {loading && <p role="status">Loading messages…</p>}
      {!loading && messages.length === 0 && (
        <p className="messaging-empty">Say hello to start the conversation.</p>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-message ${message.senderId === currentUserId ? "is-mine" : "is-theirs"}`}
        >
          <p>
            {message.deletedAt ? <em>Message deleted</em> : message.content}
          </p>
          <time dateTime={message.createdAt}>
            {messageTime(message.createdAt)}
          </time>
          {message.senderId === currentUserId && !message.deletedAt && (
            <button
              className="chat-delete-message"
              type="button"
              aria-label="Delete message"
              onClick={() => onDeleteMessage(message.id)}
            >
              <span className="material-icons" aria-hidden="true">
                delete
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
