import { ERROR_MESSAGES, HttpError } from "../../../../src/constants/errors";
import { getSessionUserFromCookie } from "../../../lib/session";
import type { MessagingSnapshot } from "../types/types";
import { getInitialMessaging } from "./messagingSSR";

export type MessagingPageResult =
  | { kind: "redirect"; destination: string }
  | { kind: "notFound" }
  | { kind: "page"; initialMessaging: MessagingSnapshot };

const validConversationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadMessagingPage(cookie: string | undefined, query: { conversation?: string | string[] }): Promise<MessagingPageResult> {
  const user = await getSessionUserFromCookie(cookie);
  if (!user) return { kind: "redirect", destination: "/login?from=%2Fmessaging" };
  const selectedId = query.conversation;
  if (selectedId !== undefined && (typeof selectedId !== "string" || !validConversationId.test(selectedId))) return { kind: "notFound" };
  try {
    return {
      kind: "page",
      initialMessaging: await getInitialMessaging(user, selectedId),
    };
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return { kind: "notFound" };
    return {
      kind: "page",
      initialMessaging: {
        user,
        conversationPage: { conversations: [], unreadCount: 0, nextCursor: null },
        selectedConversation: null,
        messagePage: null,
        error: ERROR_MESSAGES.MESSAGING_LOAD_FAILED,
      },
    };
  }
}
