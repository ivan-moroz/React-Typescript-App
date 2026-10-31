import { useEffect, useRef, useState } from "react";
import ConfirmationModal from '../../../../src/components/modal/ConfirmationModal';
import { useChatMessages } from "../hooks/useChatMessages";
import type {
  ConversationSummary,
  MessagePage,
  MessagingUser,
} from "../types/types";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";

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
      <MessageList
        messages={messages}
        currentUserId={user.id}
        loading={loading}
        loadingOlder={loadingOlder}
        hasOlder={hasOlder}
        onLoadOlder={loadOlder}
        onDeleteMessage={setDeletingMessage}
      />
      {conversation.user ? (
        <MessageComposer
          recipientName={conversation.user.name}
          sending={sending}
          loading={loading}
          active={active}
          onSend={send}
        />
      ) : (
        <p className="messaging-empty">This user is no longer available.</p>
      )}
      {deletingMessage && <ConfirmationModal title="Delete message" message="Delete this message for everyone? This cannot be undone." confirmLabel="Delete" onClose={() => setDeletingMessage(null)} onConfirm={() => removeMessage(deletingMessage)} />}
    </div>
  );
}
