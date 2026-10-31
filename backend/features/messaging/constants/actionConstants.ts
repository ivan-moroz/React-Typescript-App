export const CHAT_MESSAGES_ACTIONS = {
  MESSAGES_UPDATED: "messages-updated",
  LOAD_STARTED: "load-started",
  LOAD_FINISHED: "load-finished",
  LOAD_FAILED: "load-failed",
  LOAD_OLDER_STARTED: "load-older-started",
  LOAD_OLDER_FINISHED: "load-older-finished",
  SEND_STARTED: "send-started",
  SEND_FINISHED: "send-finished",
  ERROR_CLEARED: "error-cleared",
} as const;

export const CONVERSATION_SEARCH_ACTIONS = {
  QUERY_CHANGED: "query-changed",
  SEARCH_STARTED: "search-started",
  SEARCH_SUCCEEDED: "search-succeeded",
  SEARCH_FAILED: "search-failed",
  SEARCH_STOPPED: "search-stopped",
  ERROR_CLEARED: "error-cleared",
} as const;

export const INBOX_ACTIONS = {
  SELECT: "select",
  SET_LOADING_MORE: "set-loading-more",
  LOAD_FAILED: "load-failed",
  LOAD_SUCCEEDED: "load-succeeded",
  REMOVE: "remove",
  MESSAGE_RECEIVED: "message-received",
  SYNC_INBOX: "sync-inbox",
} as const;

export const MESSAGING_PANEL_ACTIONS = {
  START_BEGAN: "start-began",
  START_FINISHED: "start-finished",
  CONVERSATION_SELECTED_FOR_DELETION: "conversation-selected-for-deletion",
  DELETE_DIALOG_CLOSED: "delete-dialog-closed",
} as const;

export const MESSAGING_ACTIONS = {
  SNAPSHOT_RECEIVED: "snapshot-received",
  OPEN_CHANGED: "open-changed",
  UNREAD_CHANGED: "unread-changed",
  SESSION_EXPIRED: "session-expired",
} as const;
