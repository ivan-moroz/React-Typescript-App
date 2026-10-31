import type { ConversationSummary } from "../types/types";
import { MESSAGING_PANEL_ACTIONS } from "../constants/actionConstants";

export type MessagingPanelState = {
  starting: boolean;
  deleting: ConversationSummary | null;
};

export type MessagingPanelAction =
  | { type: typeof MESSAGING_PANEL_ACTIONS.START_BEGAN }
  | { type: typeof MESSAGING_PANEL_ACTIONS.START_FINISHED }
  | { type: typeof MESSAGING_PANEL_ACTIONS.CONVERSATION_SELECTED_FOR_DELETION; conversation: ConversationSummary }
  | { type: typeof MESSAGING_PANEL_ACTIONS.DELETE_DIALOG_CLOSED };

export const initialMessagingPanelState: MessagingPanelState = {
  starting: false,
  deleting: null,
};

export function messagingPanelReducer(
  state: MessagingPanelState,
  action: MessagingPanelAction,
): MessagingPanelState {
  switch (action.type) {
    case MESSAGING_PANEL_ACTIONS.START_BEGAN:
      return { ...state, starting: true };
    case MESSAGING_PANEL_ACTIONS.START_FINISHED:
      return { ...state, starting: false };
    case MESSAGING_PANEL_ACTIONS.CONVERSATION_SELECTED_FOR_DELETION:
      return { ...state, deleting: action.conversation };
    case MESSAGING_PANEL_ACTIONS.DELETE_DIALOG_CLOSED:
      return { ...state, deleting: null };
  }
}
