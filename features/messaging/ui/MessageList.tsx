import { useEffect, useRef } from "react";
import type { ChatMessage } from "../model/types";
import { messageTime } from "../model/utils";

export default function MessageList({
  messages,
  currentUserId,
  loading,
  loadingOlder,
  hasOlder,
  onLoadOlder,
  onDeleteMessage,
  historyLabel = "Message history",
  loadingMessage = "Loading messages…",
  loadingAtEnd = false,
  emptyMessage = "Say hello to start the conversation.",
  allowDelete = true,
}: {
  messages: ChatMessage[];
  currentUserId: number;
  loading: boolean;
  loadingOlder: boolean;
  hasOlder: boolean;
  onLoadOlder: () => Promise<void>;
  onDeleteMessage: (id: string) => void;
  historyLabel?: string;
  loadingMessage?: string;
  loadingAtEnd?: boolean;
  emptyMessage?: string;
  allowDelete?: boolean;
}) {
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const latest = messages[messages.length - 1];

  useEffect(() => {
    if (log.current && (nearBottom.current || latest?.senderId === currentUserId))
      log.current.scrollTop = log.current.scrollHeight;
  }, [latest?.id, currentUserId]);

  const onScroll = () => {
    const element = log.current;
    if (element)
      nearBottom.current =
        element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  };

  const onLoadOlderClick = async () => {
    const height = log.current?.scrollHeight ?? 0;
    const top = log.current?.scrollTop ?? 0;
    await onLoadOlder();
    requestAnimationFrame(() => {
      if (log.current)
        log.current.scrollTop = top + log.current.scrollHeight - height;
    });
  };

  const onDeleteMessageClick = (messageId: string) => () => {
    onDeleteMessage(messageId);
  };

  return (
    <div
      className="chat-messages"
      ref={log}
      role="log"
      aria-label={historyLabel}
      aria-live="polite"
      onScroll={onScroll}
    >
      {hasOlder && (
        <button
          className="messaging-more"
          type="button"
          disabled={loadingOlder}
          onClick={onLoadOlderClick}
        >
          {loadingOlder ? "Loading…" : "Load older messages"}
        </button>
      )}
      {loading && !loadingAtEnd && <p role="status">{loadingMessage}</p>}
      {!loading && messages.length === 0 && (
        <p className="messaging-empty">{emptyMessage}</p>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-message ${message.senderId === currentUserId ? "is-mine" : "is-theirs"}${message.pending ? " is-pending" : ""}`}
        >
          <p>
            {message.deletedAt ? <em>Message deleted</em> : message.content}
          </p>
          <time dateTime={message.createdAt}>
            {messageTime(message.createdAt)}
            {message.pending && (
              <span className="chat-message-pending" role="status">
                {" "}
                · Sending…
              </span>
            )}
          </time>
          {allowDelete &&
            message.senderId === currentUserId &&
            !message.deletedAt &&
            !message.pending && (
            <button
              className="chat-delete-message"
              type="button"
              aria-label="Delete message"
              onClick={onDeleteMessageClick(message.id)}
            >
              <span className="material-icons" aria-hidden="true">
                delete
              </span>
            </button>
          )}
        </div>
      ))}
      {loading && loadingAtEnd && <p role="status">{loadingMessage}</p>}
    </div>
  );
}
