import { useReducer } from "react";
import { fetchData } from "../../../shared/lib/fetchData";
import { ERROR_MESSAGES } from "../../../constants/errors";
import ConversationDeleteDialog from "./ConversationDeleteDialog";
import ConversationInbox from "./ConversationInbox";
import ConversationSearch from "./ConversationSearch";
import ChatThread from "./ChatThread";
import { useConversationInbox } from "../client/hooks/useConversationInbox";
import { useConversationSearch } from "../client/hooks/useConversationSearch";
import {
  initialMessagingPanelState,
  messagingPanelReducer,
} from "../model/messagingPanelReducer";
import { MESSAGING_PANEL_ACTIONS } from "../model/actionConstants";
import type {
  ConversationSummary,
  MessagingSnapshot,
  MessagingUser,
} from "../model/types";

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
  const [panelState, dispatchPanel] = useReducer(
    messagingPanelReducer,
    initialMessagingPanelState,
  );
  const { starting, deleting } = panelState;
  const selected = inbox.selected;

  const start = async (recipient: MessagingUser) => {
    if (starting) return;
    dispatchPanel({ type: MESSAGING_PANEL_ACTIONS.START_BEGAN });
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
    dispatchPanel({ type: MESSAGING_PANEL_ACTIONS.START_FINISHED });
    if (signal.aborted) return;
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

  const onCloseDeleteDialog = () => {
    dispatchPanel({ type: MESSAGING_PANEL_ACTIONS.DELETE_DIALOG_CLOSED });
  };
  const onConfirmDeleteConversation = async () => {
    if (!deleting) return;
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
    inbox.removeFromPanel(deleting.id);
    await inbox.load(signal);
  };
  const onBackToConversations = () => {
    if (serverNavigation) inbox.navigateServerPage("/messaging");
    else inbox.setSelected(null);
  };
  const onDeleteSelectedConversation = () => {
    if (!selected) return;
    dispatchPanel({
      type: MESSAGING_PANEL_ACTIONS.CONVERSATION_SELECTED_FOR_DELETION,
      conversation: selected,
    });
  };
  const onSelectedConversationDeleted = () => {
    if (selected) inbox.removeFromPanel(selected.id);
  };
  const onChatChanged = () => {
    const signal = inbox.lifetime.current?.signal;
    if (signal) void inbox.load(signal);
  };
  const onStartConversation = (recipient: MessagingUser) => {
    void start(recipient);
  };
  const onSelectConversation = (conversation: ConversationSummary) => {
    inbox.setSelected(conversation);
  };
  const onDeleteConversation = (conversation: ConversationSummary) => {
    dispatchPanel({
      type: MESSAGING_PANEL_ACTIONS.CONVERSATION_SELECTED_FOR_DELETION,
      conversation,
    });
  };
  const onRetryLoadConversations = () => {
    const signal = inbox.lifetime.current?.signal;
    if (signal) void inbox.load(signal);
  };
  const onLoadOlderConversations = () => {
    const signal = inbox.lifetime.current?.signal;
    if (!signal) return;
    inbox.setLoadingMore(true);
    void inbox.load(signal, inbox.cursor ?? undefined);
  };

  const deleteDialog = deleting && (
    <ConversationDeleteDialog
      conversation={deleting}
      onClose={onCloseDeleteDialog}
      onConfirm={onConfirmDeleteConversation}
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
          onBack={onBackToConversations}
          onExpired={onExpired}
          onDeleteConversation={onDeleteSelectedConversation}
          onConversationDeleted={onSelectedConversationDeleted}
          onChanged={onChatChanged}
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
        onStart={onStartConversation}
      />
      <ConversationInbox
        loading={inbox.loading}
        error={inbox.error}
        conversations={inbox.conversations}
        cursor={inbox.cursor}
        loadingMore={inbox.loadingMore}
        serverNavigation={serverNavigation}
        onSelect={onSelectConversation}
        onDelete={onDeleteConversation}
        onRetry={onRetryLoadConversations}
        onLoadOlder={onLoadOlderConversations}
      />
      {deleteDialog}
    </div>
  );
}
