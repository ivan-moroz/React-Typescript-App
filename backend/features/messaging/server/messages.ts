import prisma from "../../../lib/prisma";
import { ERROR_MESSAGES, HttpError } from "../../../../src/constants/errors";
import { MAX_MESSAGE_LENGTH } from "../types/types";
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
  return prisma.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId } } },
      select: { _count: { select: { participants: true } } },
    });
    if (!conversation || conversation._count.participants !== 2)
      throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
    const message = await transaction.message.create({
      data: { conversationId, senderId: userId, content: content.trim() },
      select: messageSelect,
    });
    await transaction.conversation.updateMany({
      where: { id: conversationId, updatedAt: { lt: message.createdAt } },
      data: { updatedAt: message.createdAt },
    });
    return message;
  });
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
