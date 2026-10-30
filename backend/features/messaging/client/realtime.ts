export type MessagingUpdateKind =
  | "conversation-created"
  | "message-sent"
  | "message-read"
  | "message-deleted"
  | "conversation-deleted";

export type MessagingRealtimeEvent =
  | { type: "connected"; reconnected: boolean }
  | {
      type: "update";
      conversationId: string;
      actorId: number;
      kind: MessagingUpdateKind;
    };

type Listener = (event: MessagingRealtimeEvent) => void;

const listeners = new Set<Listener>();
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
      if (
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
        notify({
          type: "update",
          conversationId: event.conversationId,
          actorId: event.actorId,
          kind: event.kind,
        });
      }
    } catch (error) {
      console.error("Could not parse a messaging WebSocket event.", error);
    }
  });
  connection.addEventListener("close", () => {
    if (socket === connection) socket = null;
    scheduleReconnect();
  });
  connection.addEventListener("error", () => connection.close());
}

function scheduleReconnect() {
  if (listeners.size === 0 || reconnectTimer) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempt, 30000);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

export function subscribeMessagingRealtime(listener: Listener) {
  listeners.add(listener);
  connect();

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
