import { useEffect, useReducer } from "react";
import { fetchData } from "../../../../shared/lib/fetchData";
import type { MessagingUser } from "../../model/types";
import {
  conversationSearchReducer,
  initialConversationSearchState,
} from "../../model/conversationSearchReducer";
import { CONVERSATION_SEARCH_ACTIONS } from "../../model/actionConstants";

export function useConversationSearch(
  active: boolean,
  onExpired: () => void,
) {
  const [state, dispatch] = useReducer(
    conversationSearchReducer,
    initialConversationSearchState,
  );

  useEffect(() => {
    const trimmed = state.query.trim();
    if (!active || trimmed.length < 2) {
      dispatch({ type: CONVERSATION_SEARCH_ACTIONS.SEARCH_STOPPED });
      return;
    }

    const controller = new AbortController();
    dispatch({ type: CONVERSATION_SEARCH_ACTIONS.SEARCH_STARTED });
    const timer = setTimeout(async () => {
      const result = await fetchData<MessagingUser[]>(
        `/api/messaging/users?q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (result.success)
        dispatch({
          type: CONVERSATION_SEARCH_ACTIONS.SEARCH_SUCCEEDED,
          users: result.data,
        });
      else if (result.error.status === 401) {
        dispatch({ type: CONVERSATION_SEARCH_ACTIONS.SEARCH_STOPPED });
        onExpired();
      } else {
        dispatch({
          type: CONVERSATION_SEARCH_ACTIONS.SEARCH_FAILED,
          error: result.error.message,
        });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state.query, onExpired, active]);

  return {
    query: state.query,
    setQuery: (query: string) =>
      dispatch({ type: CONVERSATION_SEARCH_ACTIONS.QUERY_CHANGED, query }),
    users: state.users,
    searching: state.searching,
    searchError: state.error,
    setSearchError: (error: string) => {
      if (error)
        dispatch({ type: CONVERSATION_SEARCH_ACTIONS.SEARCH_FAILED, error });
      else dispatch({ type: CONVERSATION_SEARCH_ACTIONS.ERROR_CLEARED });
    },
  };
}
