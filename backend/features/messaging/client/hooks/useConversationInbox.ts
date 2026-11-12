import { useCallback, useEffect, useReducer, useRef } from "react";
import { fetchData } from "../../../../shared/lib/fetchData";
import { ERROR_MESSAGES } from "../../../../constants/errors";
import {
  publishMessagingUnread,
  subscribeMessagingMessages,
} from "../events";
import { subscribeMessagingRealtime } from "../realtime";
import type {
  ChatMessage,
  ConversationPage,
  ConversationSummary,
  MessagingSnapshot,
  MessagingUser,
} from "../../model/types";
import {
  createInitialInboxState,
  inboxReducer,
} from "../../model/inboxReducer";
import { INBOX_ACTIONS } from "../../model/actionConstants";

export function useConversationInbox({
  user,
  onUnread,
  onExpired,
  initialData,
  active,
  serverNavigation,
}: {
  user: MessagingUser;
  onUnread: (count: number) => void;
  onExpired: () => void;
  initialData?: MessagingSnapshot;
  active: boolean;
  serverNavigation: boolean;
}) {
  const [state, dispatch] = useReducer(
    inboxReducer,
    initialData,
    createInitialInboxState,
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const refreshInboxOnReturn = useRef(false);
  const lifetime = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  const navigateServerPage = useCallback((href: string) => {
    window.dispatchEvent(new CustomEvent("app:navigate", { detail: href }));
  }, []);

  const removeFromPanel = useCallback(
    (id: string) => {
      const wasSelected = stateRef.current.selected?.id === id;
      dispatch({ type: INBOX_ACTIONS.REMOVE, id });
      if (serverNavigation && wasSelected)
        navigateServerPage("/messaging");
    },
    [navigateServerPage, serverNavigation],
  );

  const load = useCallback(
    async (signal: AbortSignal, next?: string) => {
      const result = await fetchData<ConversationPage>(
        `/api/messaging/conversations${next ? `?cursor=${next}` : ""}`,
        { signal, errorMessage: ERROR_MESSAGES.MESSAGING_LOAD_FAILED },
      );
      if (signal.aborted) return;
      if (!result.success) {
        dispatch({
          type: INBOX_ACTIONS.LOAD_FAILED,
          error: result.error.status === 401 ? null : result.error.message,
        });
        if (result.error.status === 401) onExpired();
        return;
      }

      const selected = stateRef.current.selected;
      const activeIds = result.data.conversationIds
        ? new Set(result.data.conversationIds)
        : null;
      if (selected && activeIds && !activeIds.has(selected.id)) {
        if (serverNavigation) navigateServerPage("/messaging");
      }
      onUnread(result.data.unreadCount);
      publishMessagingUnread(result.data.unreadCount);
      dispatch({
        type: INBOX_ACTIONS.LOAD_SUCCEEDED,
        page: result.data,
        requestedCursor: next,
      });
    },
    [navigateServerPage, onExpired, onUnread, serverNavigation],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const applyMessage = (message: ChatMessage) => {
      dispatch({
        type: INBOX_ACTIONS.MESSAGE_RECEIVED,
        message,
        currentUserId: user.id,
      });
    };
    const unsubscribeLocalMessages = subscribeMessagingMessages(applyMessage);
    const unsubscribe = subscribeMessagingRealtime((event) => {
      if (event.type === "sync-inbox") {
        dispatch({
          type: INBOX_ACTIONS.SYNC_INBOX,
          conversations: event.conversations,
        });
        return;
      }
      if (
        event.type === "update" &&
        event.kind === "message-read" &&
        event.actorId === user.id
      ) {
        if (stateRef.current.selected)
          refreshInboxOnReturn.current = true;
        return;
      }
      if (
        event.type === "update" &&
        event.kind === "message-sent" &&
        event.message
      ) {
        applyMessage(event.message);
        return;
      }
      const needsRefresh =
        event.type === "update" &&
        (event.actorId !== user.id || event.kind === "message-sent");
      if (!needsRefresh) return;
      if (stateRef.current.selected) {
        refreshInboxOnReturn.current = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        void load(controller.signal);
      }, 50);
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
      unsubscribe();
      unsubscribeLocalMessages();
    };
  }, [active, load, user.id]);

  useEffect(() => {
    if (
      !active ||
      state.selected ||
      !refreshInboxOnReturn.current ||
      !lifetime.current
    )
      return;
    refreshInboxOnReturn.current = false;
    void load(lifetime.current.signal);
  }, [active, load, state.selected]);

  return {
    conversations: state.conversations,
    selected: state.selected,
    setSelected: (conversation: ConversationSummary | null) =>
      dispatch({ type: INBOX_ACTIONS.SELECT, conversation }),
    cursor: state.cursor,
    loading: state.loading,
    loadingMore: state.loadingMore,
    setLoadingMore: (loading: boolean) =>
      dispatch({ type: INBOX_ACTIONS.SET_LOADING_MORE, loading }),
    error: state.error,
    load,
    removeFromPanel,
    lifetime,
    navigateServerPage,
  };
}
