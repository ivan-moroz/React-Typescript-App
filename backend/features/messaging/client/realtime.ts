export type MessagingUpdateKind =
  | "conversation-created"
  | "message-sent"
  | "message-read"
  | "message-deleted"
  | "conversation-deleted";

export type MessagingRealtimeEvent =
  | { type: "connected"; reconnected: boolean }
  | { type: "sync-inbox"; conversations: import("../types/types").ConversationSummary[]; unreadCount: number }
  | { type: "sync-messages"; conversationId: string; messages: import("../types/types").ChatMessage[]; deletedMessageIds?: string[] }
  | { type: "unread-count"; unreadCount: number; requestId?: number }
  | { type: "sync-error" }
  | {
      type: "update";
      conversationId: string;
      actorId: number;
      kind: MessagingUpdateKind;
      message?: import("../types/types").ChatMessage;
    };

type Listener = (event: MessagingRealtimeEvent) => void;

const listeners = new Set<Listener>();
const seenMessageUpdateIds = new Set<string>();
const updateKinds = new Set<MessagingUpdateKind>([
  "conversation-created",
  "message-sent",
  "message-read",
  "message-deleted",
  "conversation-deleted",
]);

function isMessagingUpdateKind(value: unknown): value is MessagingUpdateKind {
  return updateKinds.has(value as MessagingUpdateKind);
}
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let hasConnected = false;

function notify(event: MessagingRealtimeEvent) {
  listeners.forEach((listener) => listener(event));
}

function connect() {
  if (typeof WebSocket === "undefined") return;
  if (
    listeners.size === 0 ||
    (socket && socket.readyState <= WebSocket.OPEN)
  ) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const connection = new WebSocket(
    `${protocol}//${window.location.host}/api/messaging/socket`,
  );
  socket = connection;

  connection.addEventListener("open", () => {
    const reconnected = hasConnected;
    hasConnected = true;
    reconnectAttempt = 0;
    notify({ type: "connected", reconnected });
  });
  connection.addEventListener("message", (message) => {
    if (typeof message.data !== "string") return;
    try {
      const event: unknown = JSON.parse(message.data);
      if (event && typeof event === "object" && "type" in event && event.type === "resync") {
        notify({ type: "connected", reconnected: true });
      } else if (event && typeof event === "object" && "type" in event && event.type === "sync-error") {
        console.error("[messaging-ws] server could not complete the sync request");
        notify({ type: "sync-error" });
      } else if (
        event &&
        typeof event === "object" &&
        "type" in event &&
        event.type === "update" &&
        "conversationId" in event &&
        typeof event.conversationId === "string" &&
        "actorId" in event &&
        typeof event.actorId === "number" &&
        "kind" in event &&
        isMessagingUpdateKind(event.kind)
      ) {
        if (event.kind === "message-sent" && "message" in event && isChatMessage(event.message)) {
          if (seenMessageUpdateIds.has(event.message.id)) return;
          seenMessageUpdateIds.add(event.message.id);
          if (seenMessageUpdateIds.size > 500) {
            const oldestId = seenMessageUpdateIds.values().next().value;
            if (oldestId) seenMessageUpdateIds.delete(oldestId);
          }
        }
        notify({
          type: "update",
          conversationId: event.conversationId,
          actorId: event.actorId,
          kind: event.kind,
          ...( "message" in event && isChatMessage(event.message)
            ? { message: event.message }
            : {}),
        });
      } else if (
        event && typeof event === "object" && "type" in event &&
        event.type === "sync-inbox" && "conversations" in event &&
        Array.isArray(event.conversations) && event.conversations.every(isConversationSummary) &&
        "unreadCount" in event && typeof event.unreadCount === "number" &&
        Number.isSafeInteger(event.unreadCount) && event.unreadCount >= 0
      ) {
        notify({ type: "sync-inbox", conversations: event.conversations, unreadCount: event.unreadCount });
      } else if (
        event && typeof event === "object" && "type" in event &&
        event.type === "sync-messages" && "conversationId" in event &&
        typeof event.conversationId === "string" && "messages" in event &&
        Array.isArray(event.messages) && event.messages.every(isChatMessage)
      ) {
        notify({
          type: "sync-messages",
          conversationId: event.conversationId,
          messages: event.messages,
          ...( "deletedMessageIds" in event && Array.isArray(event.deletedMessageIds) && event.deletedMessageIds.every(id => typeof id === "string")
            ? { deletedMessageIds: event.deletedMessageIds }
            : {}),
        });
      } else if (
        event && typeof event === "object" && "type" in event &&
        event.type === "sync-messages"
      ) {
        console.error("[messaging-ws] received an invalid message sync response");
        notify({ type: "sync-error" });
      } else if (
        event && typeof event === "object" && "type" in event &&
        event.type === "unread-count" && "unreadCount" in event &&
        typeof event.unreadCount === "number" && Number.isSafeInteger(event.unreadCount) && event.unreadCount >= 0
      ) {
        notify({
          type: "unread-count",
          unreadCount: event.unreadCount,
          ...( "requestId" in event && typeof event.requestId === "number" && Number.isSafeInteger(event.requestId)
            ? { requestId: event.requestId }
            : {}),
        });
      }
    } catch (error) {
      console.error("Could not parse a messaging WebSocket event.", error);
    }
  });
  connection.addEventListener("close", () => {
    if (socket !== connection) return;
    socket = null;
    scheduleReconnect();
  });
  connection.addEventListener("error", () => {
    connection.close();
  });
}

function isChatMessage(value: unknown): value is import("../types/types").ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return typeof message.id === "string" &&
    typeof message.conversationId === "string" &&
    typeof message.senderId === "number" &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string" &&
    (typeof message.readAt === "string" || message.readAt === null);
}

function isConversationSummary(value: unknown): value is import("../types/types").ConversationSummary {
  if (!value || typeof value !== "object") return false;
  const conversation = value as Record<string, unknown>;
  const user = conversation.user;
  return typeof conversation.id === "string" &&
    typeof conversation.updatedAt === "string" &&
    typeof conversation.unreadCount === "number" &&
    Number.isSafeInteger(conversation.unreadCount) &&
    (user === null || (typeof user === "object" && user !== null && "id" in user && typeof user.id === "number" && "name" in user && typeof user.name === "string")) &&
    (conversation.lastMessage === null || isChatMessage(conversation.lastMessage));
}

function scheduleReconnect() {
  if (listeners.size === 0 || reconnectTimer) return;
  const delay = Math.min(250 * 2 ** reconnectAttempt, 5000);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

export function subscribeMessagingRealtime(listener: Listener) {
  listeners.add(listener);
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (typeof WebSocket !== "undefined" && socket?.readyState === WebSocket.OPEN) {
    listener({ type: "connected", reconnected: hasConnected });
  } else {
    connect();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    reconnectAttempt = 0;
    hasConnected = false;
    socket?.close();
    socket = null;
  };
}

export function requestMessagingSync(request:
  | { type: "sync-unread"; requestId?: number }
  | { type: "sync-messages"; conversationId: string; after: string | null; from: string | null }
) {
  if (typeof WebSocket === "undefined") return;
  if (socket?.readyState !== WebSocket.OPEN) {
    // A sync request can be triggered while a tab is waking from suspension
    // or after dev-server HMR closed the socket. Re-establish the transport;
    // the open handler will notify subscribers and they will retry the sync.
    connect();
    return;
  }
  socket.send(JSON.stringify(request));
}
