import { useState } from "react";
import { fetchData } from "../../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import ConversationDeleteDialog from "./ConversationDeleteDialog";
import ConversationInbox from "./ConversationInbox";
import ConversationSearch from "./ConversationSearch";
import ChatThread from "./ChatThread";
import { useConversationInbox } from "../hooks/useConversationInbox";
import { useConversationSearch } from "../hooks/useConversationSearch";
import type {
  ConversationSummary,
  MessagingSnapshot,
  MessagingUser,
} from "../types/types";

export default function MessagingPanel({
  user,
  onUnread,
  onExpired,
  initialData,
  active = true,
  serverNavigation = false,
}: {
  user: MessagingUser;
  onUnread: (count: number) => void;
  onExpired: () => void;
  initialData?: MessagingSnapshot;
  active?: boolean;
  serverNavigation?: boolean;
}) {
  const inbox = useConversationInbox({
    user,
    onUnread,
    onExpired,
    initialData,
    active,
    serverNavigation,
  });
  const {
    query,
    setQuery,
    users,
    searching,
    searchError,
    setSearchError,
  } = useConversationSearch(active, onExpired);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);

  const start = async (recipient: MessagingUser) => {
    if (starting) return;
    setStarting(true);
    setSearchError("");
    const signal = inbox.lifetime.current!.signal;
    const result = await fetchData<ConversationSummary>(
      "/api/messaging/conversations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: recipient.id }),
        signal,
      },
    );
    if (signal.aborted) return;
    setStarting(false);
    if (!result.success) {
      setSearchError(result.error.message);
      if (result.error.status === 401) onExpired();
      return;
    }
    if (serverNavigation) {
      inbox.navigateServerPage(`/messaging?conversation=${result.data.id}`);
      return;
    }
    inbox.setSelected(result.data);
    setQuery("");
  };

  const removeFromPanel = (id: string) => {
    inbox.removeFromPanel(id);
  };
  const selected = inbox.selected;
  const deleteDialog = deleting && (
    <ConversationDeleteDialog
      conversation={deleting}
      onClose={() => setDeleting(null)}
      onConfirm={async () => {
        const signal = inbox.lifetime.current!.signal;
        const result = await fetchData(
          `/api/messaging/conversations/${deleting.id}`,
          {
            method: "DELETE",
            responseType: "void",
            signal,
            errorMessage: ERROR_MESSAGES.CONVERSATION_DELETE_FAILED,
          },
        );
        if (signal.aborted) return;
        if (!result.success) throw result.error;
        removeFromPanel(deleting.id);
        await inbox.load(signal);
      }}
    />
  );

  if (selected)
    return (
      <>
        <ChatThread
          key={selected.id}
          conversation={selected}
          user={user}
          active={active}
          initialMessages={
            initialData?.selectedConversation?.id === selected.id
              ? (initialData.messagePage ?? undefined)
              : undefined
          }
          onBack={() => {
            if (serverNavigation)
              inbox.navigateServerPage("/messaging");
            else inbox.setSelected(null);
          }}
          onExpired={onExpired}
          onDeleteConversation={() => setDeleting(selected)}
          onConversationDeleted={() => removeFromPanel(selected.id)}
          onChanged={() => {
            if (inbox.lifetime.current)
              void inbox.load(inbox.lifetime.current.signal);
          }}
        />
        {deleteDialog}
      </>
    );

  return (
    <div className="messaging-body">
      <ConversationSearch
        query={query}
        users={users}
        searching={searching}
        error={searchError}
        starting={starting}
        active={active}
        onQueryChange={setQuery}
        onStart={(recipient) => void start(recipient)}
      />
      <ConversationInbox
        loading={inbox.loading}
        error={inbox.error}
        conversations={inbox.conversations}
        cursor={inbox.cursor}
        loadingMore={inbox.loadingMore}
        serverNavigation={serverNavigation}
        onSelect={inbox.setSelected}
        onDelete={setDeleting}
        onRetry={() => {
          if (inbox.lifetime.current)
            void inbox.load(inbox.lifetime.current.signal);
        }}
        onLoadOlder={() => {
          inbox.setLoadingMore(true);
          void inbox.load(
            inbox.lifetime.current!.signal,
            inbox.cursor ?? undefined,
          );
        }}
      />
      {deleteDialog}
    </div>
  );
}
