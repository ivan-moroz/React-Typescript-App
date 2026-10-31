import type {
  ChatMessage,
  ConversationPage,
  ConversationSummary,
  MessagingSnapshot,
} from "../types/types";
import { INBOX_ACTIONS } from "../constants/actionConstants";

export type InboxState = {
  conversations: ConversationSummary[];
  selected: ConversationSummary | null;
  cursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  removedIds: Set<string>;
};

export type InboxAction =
  | { type: typeof INBOX_ACTIONS.SELECT; conversation: ConversationSummary | null }
  | { type: typeof INBOX_ACTIONS.SET_LOADING_MORE; loading: boolean }
  | { type: typeof INBOX_ACTIONS.LOAD_FAILED; error: string | null }
  | {
      type: typeof INBOX_ACTIONS.LOAD_SUCCEEDED;
      page: ConversationPage;
      requestedCursor?: string;
    }
  | { type: typeof INBOX_ACTIONS.REMOVE; id: string }
  | { type: typeof INBOX_ACTIONS.MESSAGE_RECEIVED; message: ChatMessage; currentUserId: number }
  | { type: typeof INBOX_ACTIONS.SYNC_INBOX; conversations: ConversationSummary[] };

function sortConversations(conversations: ConversationSummary[]) {
  return conversations.sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
  );
}

export function createInitialInboxState(
  initialData?: MessagingSnapshot,
): InboxState {
  return {
    conversations: initialData?.conversationPage.conversations ?? [],
    selected: initialData?.selectedConversation ?? null,
    cursor: initialData?.conversationPage.nextCursor ?? null,
    loading: !initialData,
    loadingMore: false,
    error: initialData?.error ?? "",
    removedIds: new Set(),
  };
}

export function inboxReducer(
  state: InboxState,
  action: InboxAction,
): InboxState {
  switch (action.type) {
    case INBOX_ACTIONS.SELECT:
      return { ...state, selected: action.conversation };
    case INBOX_ACTIONS.SET_LOADING_MORE:
      return { ...state, loadingMore: action.loading };
    case INBOX_ACTIONS.LOAD_FAILED:
      return {
        ...state,
        loading: false,
        loadingMore: false,
        error: action.error ?? state.error,
      };
    case INBOX_ACTIONS.LOAD_SUCCEEDED: {
      const activeIds = action.page.conversationIds
        ? new Set(action.page.conversationIds)
        : null;
      const conversations = new Map(
        state.conversations
          .filter(
            (item) =>
              (!activeIds || activeIds.has(item.id)) &&
              !state.removedIds.has(item.id),
          )
          .map((item) => [item.id, item]),
      );
      action.page.conversations.forEach((item) => {
        if (
          (!activeIds || activeIds.has(item.id)) &&
          !state.removedIds.has(item.id)
        )
          conversations.set(item.id, item);
      });

      const selected =
        state.selected &&
        (!activeIds || activeIds.has(state.selected.id)) &&
        !state.removedIds.has(state.selected.id)
          ? action.page.conversations.find(
              (item) => item.id === state.selected?.id,
            ) ?? state.selected
          : null;

      return {
        ...state,
        conversations: sortConversations([...conversations.values()]),
        selected,
        cursor:
          action.requestedCursor || state.conversations.length <= 30
            ? action.page.nextCursor
            : state.cursor,
        loading: false,
        loadingMore: false,
        error: "",
      };
    }
    case INBOX_ACTIONS.REMOVE: {
      const removedIds = new Set(state.removedIds);
      removedIds.add(action.id);
      return {
        ...state,
        removedIds,
        conversations: state.conversations.filter(
          (item) => item.id !== action.id,
        ),
        selected:
          state.selected?.id === action.id ? null : state.selected,
      };
    }
    case INBOX_ACTIONS.MESSAGE_RECEIVED:
      return {
        ...state,
        conversations: sortConversations(
          state.conversations.map((item) =>
            item.id !== action.message.conversationId
              ? item
              : {
                  ...item,
                  updatedAt: action.message.createdAt,
                  lastMessage: action.message,
                  unreadCount:
                    action.message.senderId === action.currentUserId
                      ? item.unreadCount
                      : item.unreadCount + 1,
                },
          ),
        ),
        selected:
          state.selected?.id === action.message.conversationId
            ? {
                ...state.selected,
                updatedAt: action.message.createdAt,
                lastMessage: action.message,
              }
            : state.selected,
      };
    case INBOX_ACTIONS.SYNC_INBOX: {
      const conversations = action.conversations.filter(
        (item) => !state.removedIds.has(item.id),
      );
      return {
        ...state,
        conversations: sortConversations(conversations),
        selected: state.selected
          ? conversations.find((item) => item.id === state.selected?.id) ??
            state.selected
          : null,
      };
    }
  }
}
