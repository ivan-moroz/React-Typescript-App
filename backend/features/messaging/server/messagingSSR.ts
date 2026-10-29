import { ERROR_MESSAGES, HttpError } from "../../../../src/constants/errors";
import type {
  MessagingSnapshot,
  MessagingUser,
} from "../types/types";
import {
  getConversationSummary,
  listConversations,
  listMessages,
} from "./messaging";

type ServerMessage = Awaited<
  ReturnType<typeof listMessages>
>["messages"][number];
type ServerConversation = Awaited<
  ReturnType<typeof listConversations>
>["conversations"][number];
const messageJSON = (message: ServerMessage) => ({
  ...message,
  createdAt: message.createdAt.toISOString(),
  readAt: message.readAt?.toISOString() ?? null,
  deletedAt: message.deletedAt?.toISOString() ?? null,
});
const conversationJSON = (conversation: ServerConversation) => ({
  ...conversation,
  updatedAt: conversation.updatedAt.toISOString(),
  lastMessage: conversation.lastMessage
    ? messageJSON(conversation.lastMessage)
    : null,
});

// Called only from getServerSideProps. Client code receives plain JSON, never Prisma or cookie secrets.
export async function getInitialMessaging(
  user: MessagingUser | null,
  selectedId?: string,
): Promise<MessagingSnapshot> {
  const snapshot: MessagingSnapshot = {
    user: user ? { id: user.id, name: user.name } : null,
    conversationPage: { conversations: [], unreadCount: 0, nextCursor: null },
    selectedConversation: null,
    messagePage: null,
    error: "",
  };
  if (!user) return snapshot;
  try {
    const page = await listConversations(user.id);
    snapshot.conversationPage = {
      ...page,
      conversations: page.conversations.map(conversationJSON),
    };
    if (selectedId) {
      snapshot.selectedConversation = conversationJSON(
        await getConversationSummary(user.id, selectedId),
      );
      const history = await listMessages(user.id, selectedId);
      snapshot.messagePage = {
        ...history,
        messages: history.messages.map(messageJSON),
      };
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) throw error;
    snapshot.error = ERROR_MESSAGES.MESSAGING_LOAD_FAILED;
  }
  return snapshot;
}
