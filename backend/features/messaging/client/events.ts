import type { ChatMessage } from "../types/types";

const UNREAD_EVENT = "messaging:unread";
const MESSAGE_SENT_EVENT = "messaging:message-sent";

export function publishMessagingUnread(count: number) {
  window.dispatchEvent(
    new CustomEvent<number>(UNREAD_EVENT, { detail: count }),
  );
}

export function subscribeMessagingUnread(
  listener: (count: number) => void,
): () => void {
  const handleEvent = (event: Event) => {
    const count = (event as CustomEvent<number>).detail;
    if (Number.isSafeInteger(count) && count >= 0) listener(count);
  };
  window.addEventListener(UNREAD_EVENT, handleEvent);
  return () => window.removeEventListener(UNREAD_EVENT, handleEvent);
}

export function publishMessagingMessage(message: ChatMessage) {
  window.dispatchEvent(
    new CustomEvent<ChatMessage>(MESSAGE_SENT_EVENT, { detail: message }),
  );
}

export function subscribeMessagingMessages(
  listener: (message: ChatMessage) => void,
): () => void {
  const handleEvent = (event: Event) => {
    const message = (event as CustomEvent<ChatMessage>).detail;
    if (message && typeof message.conversationId === "string")
      listener(message);
  };
  window.addEventListener(MESSAGE_SENT_EVENT, handleEvent);
  return () => window.removeEventListener(MESSAGE_SENT_EVENT, handleEvent);
}
