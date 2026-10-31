import type { MessagingSnapshot, MessagingUser } from "../types/types";

export function createEmptyMessagingSnapshot(
  user: MessagingUser | null,
  error = "",
): MessagingSnapshot {
  return {
    user,
    conversationPage: { conversations: [], unreadCount: 0, nextCursor: null },
    selectedConversation: null,
    messagePage: null,
    error,
  };
}

export function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

// A deterministic timezone prevents server/browser hydration differences.
export function messageTime(value: string, includeDate = false): string {
  const iso = new Date(value).toISOString();
  return `${includeDate ? `${iso.slice(0, 10)} ` : ""}${iso.slice(11, 16)} UTC`;
}
