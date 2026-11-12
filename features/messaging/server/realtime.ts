import prisma from "../../../server/db/prisma";

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
  message?: import("../model/types").ChatMessage;
};

declare global {
  // Retained for API unit tests; production uses PostgreSQL notifications.
  var publishMessagingUpdate:
    | ((userIds: number[], update: MessagingUpdate) => void)
    | undefined;
}

export async function publishMessagingUpdate(
  userIds: number[],
  update: MessagingUpdate,
) {
  if (process.env.NODE_ENV === "test" && globalThis.publishMessagingUpdate) {
    globalThis.publishMessagingUpdate(userIds, update);
    return;
  }
  // Deliver immediately when the API route shares the custom server process.
  // Keep PostgreSQL as the cross-worker path as well.
  const publishedLocally = Boolean(globalThis.publishMessagingUpdate);
  if (globalThis.publishMessagingUpdate) {
    globalThis.publishMessagingUpdate(userIds, update);
  }
  try {
    const notification = prisma.$queryRaw`
      SELECT pg_notify(
        'messaging_updates',
        ${JSON.stringify({ userIds: [...new Set(userIds)], update })}
      )::text AS notified
    `;
    void notification.catch((error) => {
      console.error(
        publishedLocally
          ? "PostgreSQL messaging notification failed after local delivery."
          : "PostgreSQL messaging notification failed.",
        error,
      );
    });
  } catch (error) {
    console.error(
      publishedLocally
        ? "PostgreSQL messaging notification failed after local delivery."
        : "PostgreSQL messaging notification failed.",
      error,
    );
  }
}
