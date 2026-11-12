import { randomUUID } from "node:crypto";
import prisma from "../../../server/db/prisma";
import { ERROR_MESSAGES, HttpError } from "../../../constants/errors";
import { MAX_MESSAGE_LENGTH } from "../model/types";
import { requireConversation } from "./conversations";
import { messageSelect } from "./messageSelect";

const PAGE_SIZE = 40;

export async function listMessages(
  userId: number,
  conversationId: string,
  before?: string,
  after?: string,
  from?: string,
) {
  await requireConversation(userId, conversationId);
  const cursorId = before ?? after;
  let cursor;
  if (cursorId) {
    cursor = await prisma.message.findFirst({
      where: { id: cursorId, conversationId },
      select: { id: true, createdAt: true },
    });
    if (!cursor) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
  }
  const boundary = cursor
    ? {
        OR: after
          ? [
              { createdAt: { gt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { gt: cursor.id } },
            ]
          : [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
      }
    : {};
  let deletedMessageIds: string[] = [];
  if (from) {
    const floor =
      from === cursorId
        ? cursor
        : await prisma.message.findFirst({
            where: { id: from, conversationId },
            select: { id: true, createdAt: true },
          });
    if (!floor) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
    const deleted = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: { not: null },
        OR: [
          { createdAt: { gt: floor.createdAt } },
          { createdAt: floor.createdAt, id: { gte: floor.id } },
        ],
      },
      select: { id: true },
    });
    deletedMessageIds = deleted.map((message) => message.id);
  }
  const direction = after ? "asc" : "desc";
  const rows = await prisma.message.findMany({
    where: { conversationId, ...boundary },
    orderBy: [{ createdAt: direction }, { id: direction }],
    take: PAGE_SIZE + 1,
    select: messageSelect,
  });
  const page = rows.slice(0, PAGE_SIZE);
  const messages = after ? page : page.reverse();
  return {
    messages,
    deletedMessageIds,
    hasMore: rows.length > PAGE_SIZE,
    nextCursor:
      rows.length > PAGE_SIZE
        ? after
          ? messages[messages.length - 1].id
          : messages[0].id
        : null,
  };
}

export async function sendMessage(
  userId: number,
  conversationId: string,
  content: unknown,
) {
  if (
    typeof content !== "string" ||
    !content.trim() ||
    content.trim().length > MAX_MESSAGE_LENGTH
  ) {
    throw new HttpError(400, ERROR_MESSAGES.MESSAGING_CONTENT_INVALID);
  }
  const messageId = randomUUID();
  const rows = await prisma.$queryRaw<{
    id: string;
    conversationId: string;
    senderId: number;
    content: string;
    createdAt: Date;
    readAt: Date | null;
    deletedAt: Date | null;
    participantIds: number[];
  }[]>`
    WITH eligible AS (
      SELECT c.id, array_agg(cp.user_id) AS participant_ids
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = ${conversationId}::uuid
        AND EXISTS (
          SELECT 1 FROM conversation_participants membership
          WHERE membership.conversation_id = c.id AND membership.user_id = ${userId}
        )
      GROUP BY c.id
      HAVING COUNT(*) = 2
    ), inserted AS (
      INSERT INTO messages (id, conversation_id, sender_id, content)
      SELECT ${messageId}::uuid, eligible.id, ${userId}, ${content.trim()}
      FROM eligible
      RETURNING id, conversation_id, sender_id, content, created_at, read_at, deleted_at
    ), updated AS (
      UPDATE conversations c
      SET updated_at = GREATEST(c.updated_at, inserted.created_at)
      FROM inserted
      WHERE c.id = inserted.conversation_id
      RETURNING c.id
    )
    SELECT
      inserted.id,
      inserted.conversation_id AS "conversationId",
      inserted.sender_id AS "senderId",
      inserted.content,
      inserted.created_at AS "createdAt",
      inserted.read_at AS "readAt",
      inserted.deleted_at AS "deletedAt",
      eligible.participant_ids AS "participantIds"
    FROM inserted
    JOIN eligible ON eligible.id = inserted.conversation_id
    JOIN updated ON updated.id = inserted.conversation_id
  `;
  const row = rows[0];
  if (!row) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
  const { participantIds, ...message } = row;
  return { message, participantIds };
}

export async function markRead(
  userId: number,
  conversationId: string,
  messageId: string,
) {
  await requireConversation(userId, conversationId);
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
    select: { id: true, createdAt: true },
  });
  if (!message) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
  await prisma.$transaction([
    prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
        deletedAt: null,
        OR: [
          { createdAt: { lt: message.createdAt } },
          { createdAt: message.createdAt, id: { lte: message.id } },
        ],
      },
      data: { readAt: new Date() },
    }),
    prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
        OR: [{ lastReadAt: null }, { lastReadAt: { lt: message.createdAt } }],
      },
      data: { lastReadAt: message.createdAt },
    }),
  ]);
}

export async function deleteMessage(
  userId: number,
  conversationId: string,
  messageId: string,
) {
  await requireConversation(userId, conversationId);
  await prisma.$transaction(async (transaction) => {
    const message = await transaction.message.findFirst({
      where: { id: messageId, conversationId, senderId: userId },
      select: { id: true },
    });
    if (!message) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
    await transaction.message.updateMany({
      where: { id: messageId, conversationId, senderId: userId, deletedAt: null },
      data: { content: "", deletedAt: new Date() },
    });
  });
}
