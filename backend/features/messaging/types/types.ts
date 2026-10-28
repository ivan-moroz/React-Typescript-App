export const MAX_MESSAGE_LENGTH = 2000;

export type MessagingUser = { id: number; name: string };
export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: number;
  content: string;
  createdAt: string;
  readAt: string | null;
  deletedAt?: string | null;
};
export type ConversationSummary = {
  id: string;
  updatedAt: string;
  user: MessagingUser | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
};
export type ConversationPage = {
  conversationIds?: string[];
  conversations: ConversationSummary[];
  unreadCount: number;
  nextCursor: string | null;
};
export type MessagePage = {
  deletedMessageIds?: string[];
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
};
export type MessagingSnapshot = {
  user: MessagingUser | null;
  conversationPage: ConversationPage;
  selectedConversation: ConversationSummary | null;
  messagePage: MessagePage | null;
  error: string;
};
