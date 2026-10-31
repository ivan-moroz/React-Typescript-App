import type { MessagingSnapshot, MessagingUser } from "../types/types";
import { MESSAGING_ACTIONS } from "../constants/actionConstants";

export type MessagingState = {
  user: MessagingUser | null;
  open: boolean;
  unread: number;
  error: string;
};

export type MessagingAction =
  | { type: typeof MESSAGING_ACTIONS.SNAPSHOT_RECEIVED; snapshot: MessagingSnapshot }
  | { type: typeof MESSAGING_ACTIONS.OPEN_CHANGED; open: boolean }
  | { type: typeof MESSAGING_ACTIONS.UNREAD_CHANGED; unread: number }
  | { type: typeof MESSAGING_ACTIONS.SESSION_EXPIRED };

export function createInitialMessagingState(
  snapshot: MessagingSnapshot,
  open: boolean,
): MessagingState {
  return {
    user: snapshot.user,
    open,
    unread: snapshot.conversationPage.unreadCount,
    error: snapshot.error,
  };
}

export function messagingReducer(
  state: MessagingState,
  action: MessagingAction,
): MessagingState {
  switch (action.type) {
    case MESSAGING_ACTIONS.SNAPSHOT_RECEIVED:
      return {
        ...state,
        user: action.snapshot.user,
        unread: action.snapshot.conversationPage.unreadCount,
        error: action.snapshot.error,
      };
    case MESSAGING_ACTIONS.OPEN_CHANGED:
      return { ...state, open: action.open };
    case MESSAGING_ACTIONS.UNREAD_CHANGED:
      return { ...state, unread: action.unread, error: "" };
    case MESSAGING_ACTIONS.SESSION_EXPIRED:
      return { ...state, user: null, unread: 0 };
  }
}
