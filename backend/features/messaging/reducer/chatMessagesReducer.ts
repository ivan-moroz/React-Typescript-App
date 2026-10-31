import type { ChatMessage, MessagePage } from "../types/types";
import { CHAT_MESSAGES_ACTIONS } from "../constants/actionConstants";

export type ChatMessagesState = {
  messages: ChatMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasOlder: boolean;
  sending: boolean;
  error: string;
};

export type ChatMessagesAction =
  | { type: typeof CHAT_MESSAGES_ACTIONS.MESSAGES_UPDATED; messages: ChatMessage[] }
  | { type: typeof CHAT_MESSAGES_ACTIONS.LOAD_STARTED }
  | { type: typeof CHAT_MESSAGES_ACTIONS.LOAD_FINISHED; hasOlder?: boolean }
  | { type: typeof CHAT_MESSAGES_ACTIONS.LOAD_FAILED; error: string }
  | { type: typeof CHAT_MESSAGES_ACTIONS.LOAD_OLDER_STARTED }
  | { type: typeof CHAT_MESSAGES_ACTIONS.LOAD_OLDER_FINISHED; hasOlder: boolean }
  | { type: typeof CHAT_MESSAGES_ACTIONS.SEND_STARTED }
  | { type: typeof CHAT_MESSAGES_ACTIONS.SEND_FINISHED }
  | { type: typeof CHAT_MESSAGES_ACTIONS.ERROR_CLEARED };

export function createInitialChatMessagesState(
  initialPage?: MessagePage,
): ChatMessagesState {
  return {
    messages: initialPage?.messages ?? [],
    loading: !initialPage,
    loadingOlder: false,
    hasOlder: initialPage?.hasMore ?? false,
    sending: false,
    error: "",
  };
}

export function chatMessagesReducer(
  state: ChatMessagesState,
  action: ChatMessagesAction,
): ChatMessagesState {
  switch (action.type) {
    case CHAT_MESSAGES_ACTIONS.MESSAGES_UPDATED:
      return { ...state, messages: action.messages };
    case CHAT_MESSAGES_ACTIONS.LOAD_STARTED:
      return { ...state, loading: true };
    case CHAT_MESSAGES_ACTIONS.LOAD_FINISHED:
      return {
        ...state,
        loading: false,
        error: "",
        ...(action.hasOlder === undefined ? {} : { hasOlder: action.hasOlder }),
      };
    case CHAT_MESSAGES_ACTIONS.LOAD_FAILED:
      return { ...state, loading: false, loadingOlder: false, error: action.error };
    case CHAT_MESSAGES_ACTIONS.LOAD_OLDER_STARTED:
      return { ...state, loadingOlder: true };
    case CHAT_MESSAGES_ACTIONS.LOAD_OLDER_FINISHED:
      return {
        ...state,
        loadingOlder: false,
        hasOlder: action.hasOlder,
      };
    case CHAT_MESSAGES_ACTIONS.SEND_STARTED:
      return { ...state, sending: true, error: "" };
    case CHAT_MESSAGES_ACTIONS.SEND_FINISHED:
      return { ...state, sending: false };
    case CHAT_MESSAGES_ACTIONS.ERROR_CLEARED:
      return { ...state, error: "" };
  }
}
