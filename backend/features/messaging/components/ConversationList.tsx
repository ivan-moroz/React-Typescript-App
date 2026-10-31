import type { ConversationSummary } from "../types/types";
import { messageTime } from "../utils/utils";

export default function ConversationList({
  conversations,
  onSelect,
  serverNavigation = false,
  onDelete,
}: {
  conversations: ConversationSummary[];
  onSelect: (conversation: ConversationSummary) => void;
  serverNavigation?: boolean;
  onDelete?: (conversation: ConversationSummary) => void;
}) {
  return (
    <ul className="conversation-list">
      {conversations.map((conversation) => {
        const content = (
          <>
            <span className="conversation-title">
              <strong>{conversation.user?.name ?? "Deleted user"}</strong>
              {conversation.lastMessage && (
                <time dateTime={conversation.lastMessage.createdAt}>
                  {messageTime(conversation.lastMessage.createdAt, true)}
                </time>
              )}
            </span>
            <span className="conversation-preview">
              {conversation.lastMessage?.deletedAt ? 'Message deleted' : conversation.lastMessage?.content ?? "Start a conversation"}
            </span>
            {conversation.unreadCount > 0 && (
              <span className="conversation-unread">
                {conversation.unreadCount} unread
              </span>
            )}
          </>
        );
        return (
          <li key={conversation.id} className="conversation-row">
            {serverNavigation ? (
              <a
                className="conversation-item"
                href={`/messaging?conversation=${conversation.id}`}
              >
                {content}
              </a>
            ) : (
              <button
                type="button"
                className="conversation-item"
                onClick={() => onSelect(conversation)}
              >
                {content}
              </button>
            )}
            {onDelete && <button className="conversation-delete" type="button" aria-label={`Delete conversation with ${conversation.user?.name ?? 'deleted user'}`} onClick={() => onDelete(conversation)}><span className="material-icons" aria-hidden="true">delete</span></button>}
          </li>
        );
      })}
    </ul>
  );
}
