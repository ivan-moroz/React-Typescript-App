import { useEffect, useRef, useState } from "react";
import ConfirmationModal from '../../../../src/components/modal/ConfirmationModal';
import { useChatMessages } from "../hooks/useChatMessages";
import { messageTime } from "../time";
import {
  MAX_MESSAGE_LENGTH,
  type ConversationSummary,
  type MessagePage,
  type MessagingUser,
} from "../types/types";

export default function ChatThread({
  conversation,
  user,
  onBack,
  onChanged,
  onExpired,
  initialMessages,
  active = true,
  onDeleteConversation,
  onConversationDeleted,
}: {
  conversation: ConversationSummary;
  user: MessagingUser;
  onBack: () => void;
  onChanged: () => void;
  onExpired: () => void;
  initialMessages?: MessagePage;
  active?: boolean;
  onDeleteConversation?: () => void;
  onConversationDeleted?: () => void;
}) {
  const {
    messages,
    loading,
    loadingOlder,
    hasOlder,
    sending,
    error,
    loadOlder,
    send,
    removeMessage,
  } = useChatMessages(
    conversation.id,
    user.id,
    onChanged,
    onExpired,
    initialMessages,
    active,
    onConversationDeleted,
  );
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const latest = messages[messages.length - 1];
  useEffect(() => {
    if (log.current && (nearBottom.current || latest?.senderId === user.id))
      log.current.scrollTop = log.current.scrollHeight;
  }, [latest?.id, user.id]);

  return (
    <div className="chat-thread">
      <div className="chat-heading">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <span className="material-icons" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <h3>{conversation.user?.name ?? "Deleted user"}</h3>
        {onDeleteConversation && <button className="chat-delete-conversation" type="button" aria-label="Delete conversation" onClick={onDeleteConversation}><span className="material-icons" aria-hidden="true">delete</span></button>}
      </div>
      {error && (
        <p role="alert" className="messaging-error">
          {error}
        </p>
      )}
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
              await loadOlder();
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
          <p className="messaging-empty">
            Say hello to start the conversation.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.senderId === user.id ? "is-mine" : "is-theirs"}`}
          >
            <p>{message.deletedAt ? <em>Message deleted</em> : message.content}</p>
            <time dateTime={message.createdAt}>
              {messageTime(message.createdAt)}
            </time>
            {message.senderId === user.id && !message.deletedAt && <button className="chat-delete-message" type="button" aria-label="Delete message" onClick={() => setDeletingMessage(message.id)}><span className="material-icons" aria-hidden="true">delete</span></button>}
          </div>
        ))}
      </div>
      {conversation.user ? (
        <form
          className="chat-composer"
          onSubmit={async (event) => {
            event.preventDefault();
            if (loading || sending) return;
            if (await send(draft)) setDraft("");
          }}
        >
          <label htmlFor="message-draft" className="messaging-sr-only">
            Message to {conversation.user.name}
          </label>
          <textarea
            id="message-draft"
            placeholder="Write a message…"
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            value={draft}
            disabled={sending}
            autoFocus={active}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button type="submit" disabled={sending || !draft.trim() || loading}>
            {sending ? "Sending…" : "Send"}
          </button>
          <small>
            {draft.length}/{MAX_MESSAGE_LENGTH} · Shift+Enter for a new line
          </small>
        </form>
      ) : (
        <p className="messaging-empty">This user is no longer available.</p>
      )}
      {deletingMessage && <ConfirmationModal title="Delete message" message="Delete this message for everyone? This cannot be undone." confirmLabel="Delete" onClose={() => setDeletingMessage(null)} onConfirm={() => removeMessage(deletingMessage)} />}
    </div>
  );
}
