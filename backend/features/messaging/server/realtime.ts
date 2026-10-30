export type MessagingUpdateKind =
  | "conversation-created"
  | "message-sent"
  | "message-read"
  | "message-deleted"
  | "conversation-deleted";

export type MessagingUpdate = {
  type: "update";
  conversationId: string;
  actorId: number;
  kind: MessagingUpdateKind;
};

type MessagingUpdatePublisher = (
  userIds: number[],
  update: MessagingUpdate,
) => void;

declare global {
  // Set by the custom Node server before it starts accepting API requests.
  var publishMessagingUpdate: MessagingUpdatePublisher | undefined;
}

export function publishMessagingUpdate(
  userIds: number[],
  update: MessagingUpdate,
) {
  if (!globalThis.publishMessagingUpdate) {
    console.error("Messaging WebSocket publisher is unavailable.");
    return;
  }
  globalThis.publishMessagingUpdate(userIds, update);
}
