import type { MessagingUser } from "./types";
import { CONVERSATION_SEARCH_ACTIONS } from "./actionConstants";

export type ConversationSearchState = {
  query: string;
  users: MessagingUser[];
  searching: boolean;
  error: string;
};

export type ConversationSearchAction =
  | { type: typeof CONVERSATION_SEARCH_ACTIONS.QUERY_CHANGED; query: string }
  | { type: typeof CONVERSATION_SEARCH_ACTIONS.SEARCH_STARTED }
  | { type: typeof CONVERSATION_SEARCH_ACTIONS.SEARCH_SUCCEEDED; users: MessagingUser[] }
  | { type: typeof CONVERSATION_SEARCH_ACTIONS.SEARCH_FAILED; error: string }
  | { type: typeof CONVERSATION_SEARCH_ACTIONS.SEARCH_STOPPED }
  | { type: typeof CONVERSATION_SEARCH_ACTIONS.ERROR_CLEARED };

export const initialConversationSearchState: ConversationSearchState = {
  query: "",
  users: [],
  searching: false,
  error: "",
};

export function conversationSearchReducer(
  state: ConversationSearchState,
  action: ConversationSearchAction,
): ConversationSearchState {
  switch (action.type) {
    case CONVERSATION_SEARCH_ACTIONS.QUERY_CHANGED:
      return { ...state, query: action.query, users: [], error: "" };
    case CONVERSATION_SEARCH_ACTIONS.SEARCH_STARTED:
      return { ...state, searching: true };
    case CONVERSATION_SEARCH_ACTIONS.SEARCH_SUCCEEDED:
      return {
        ...state,
        users: action.users,
        searching: false,
        error: "",
      };
    case CONVERSATION_SEARCH_ACTIONS.SEARCH_FAILED:
      return { ...state, searching: false, error: action.error };
    case CONVERSATION_SEARCH_ACTIONS.SEARCH_STOPPED:
      return { ...state, searching: false, users: [], error: "" };
    case CONVERSATION_SEARCH_ACTIONS.ERROR_CLEARED:
      return { ...state, error: "" };
  }
}
