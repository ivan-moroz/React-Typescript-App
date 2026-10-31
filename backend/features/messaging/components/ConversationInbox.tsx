import type { ConversationSummary } from "../types/types";
import ConversationList from "./ConversationList";

export default function ConversationInbox({
  loading,
  error,
  conversations,
  cursor,
  loadingMore,
  serverNavigation,
  onSelect,
  onDelete,
  onRetry,
  onLoadOlder,
}: {
  loading: boolean;
  error: string;
  conversations: ConversationSummary[];
  cursor: string | null;
  loadingMore: boolean;
  serverNavigation: boolean;
  onSelect: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
  onRetry: () => void;
  onLoadOlder: () => void;
}) {
  return (
    <>
      {loading && (
        <p role="status" className="messaging-empty">
          Loading conversations…
        </p>
      )}
      {error && (
        <div className="messaging-error">
          <p role="alert">{error}</p>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && conversations.length === 0 && (
        <p className="messaging-empty">
          No conversations yet. Search for a user to say hello.
        </p>
      )}
      <ConversationList
        conversations={conversations}
        onSelect={onSelect}
        serverNavigation={serverNavigation}
        onDelete={onDelete}
      />
      {cursor && (
        <button
          className="messaging-more"
          type="button"
          disabled={loadingMore}
          onClick={onLoadOlder}
        >
          {loadingMore ? "Loading…" : "Older conversations"}
        </button>
      )}
    </>
  );
}
