import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import { ERROR_MESSAGES, HttpError } from "../../../../src/constants/errors";
import { MAX_MESSAGE_LENGTH } from "../types/types";

const PAGE_SIZE = 40;
const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true,
  readAt: true,
  deletedAt: true,
} as const;

export async function requireConversation(userId: number, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, participants: { some: { userId } } },
    select: { id: true },
  });
  if (!conversation)
    throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
}

export async function getConversationSummary(userId: number, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, participants: { some: { userId } } },
    select: {
      id: true,
      updatedAt: true,
      participants: {
        where: { userId: { not: userId } },
        select: { user: { select: { id: true, name: true } } },
      },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: messageSelect,
      },
      _count: {
        select: {
          messages: { where: { senderId: { not: userId }, readAt: null, deletedAt: null } },
        },
      },
    },
  });
  if (!conversation)
    throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    user: conversation.participants[0]?.user ?? null,
    lastMessage: conversation.messages[0] ?? null,
    unreadCount: conversation._count.messages,
  };
}

export async function unreadCount(userId: number) {
  return prisma.message.count({
    where: {
      senderId: { not: userId },
      readAt: null, deletedAt: null,
      conversation: { participants: { some: { userId } } },
    },
  });
}

export async function listConversations(userId: number, cursor?: string) {
  if (cursor) await requireConversation(userId, cursor);
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: 31,
    select: {
      id: true,
      updatedAt: true,
      participants: {
        where: { userId: { not: userId } },
        select: { user: { select: { id: true, name: true } } },
      },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: messageSelect,
      },
      _count: {
        select: {
          messages: { where: { senderId: { not: userId }, readAt: null, deletedAt: null } },
        },
      },
    },
  });
  const page = conversations.slice(0, 30);
  return {
    conversations: page.map((conversation) => ({
      id: conversation.id,
      updatedAt: conversation.updatedAt,
      user: conversation.participants[0]?.user ?? null,
      lastMessage: conversation.messages[0] ?? null,
      unreadCount: conversation._count.messages,
    })),
    unreadCount: await unreadCount(userId),
    nextCursor: conversations.length > 30 ? page[page.length - 1].id : null,
    conversationIds: (await prisma.conversation.findMany({ where: { participants: { some: { userId } } }, select: { id: true } })).map(item => item.id),
  };
}

export async function createConversation(userId: number, otherUserId: number) {
  if (
    !Number.isSafeInteger(otherUserId) ||
    otherUserId <= 0 ||
    otherUserId === userId
  ) {
    throw new HttpError(400, ERROR_MESSAGES.MESSAGING_USER_INVALID);
  }
  const user = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, name: true },
  });
  if (!user) throw new HttpError(404, ERROR_MESSAGES.USER_NOT_FOUND);
  const directKey = [userId, otherUserId].sort((a, b) => a - b).join(":");
  let conversation;
  try {
    conversation = await prisma.conversation.upsert({
      where: { directKey },
      update: {},
      create: {
        directKey,
        participants: { create: [{ userId }, { userId: otherUserId }] },
      },
      select: { id: true, updatedAt: true },
    });
  } catch (error) {
    // A concurrent request from the other participant may win the unique-key race.
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    )
      throw error;
    conversation = await prisma.conversation.findUnique({
      where: { directKey },
      select: { id: true, updatedAt: true },
    });
    if (!conversation) throw error;
  }
  return { ...conversation, user, lastMessage: null, unreadCount: 0 };
}

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
    const floor = from === cursorId ? cursor : await prisma.message.findFirst({ where: { id: from, conversationId }, select: { id: true, createdAt: true } });
    if (!floor) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
    const deleted = await prisma.message.findMany({ where: { conversationId, deletedAt: { not: null }, OR: [{ createdAt: { gt: floor.createdAt } }, { createdAt: floor.createdAt, id: { gte: floor.id } }] }, select: { id: true } });
    deletedMessageIds = deleted.map(message => message.id);
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
        readAt: null, deletedAt: null,
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

export async function searchUsers(userId: number, query: string) {
  return prisma.user.findMany({
    where: {
      id: { not: userId },
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 20,
    select: { id: true, name: true },
  });
}

export async function deleteMessage(userId: number, conversationId: string, messageId: string) {
  await requireConversation(userId, conversationId);
  await prisma.$transaction(async transaction => {
    const message = await transaction.message.findFirst({
      where: { id: messageId, conversationId, senderId: userId }, select: { id: true },
    });
    if (!message) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
    // Keep a redacted tombstone so existing pagination cursors remain valid.
    await transaction.message.updateMany({
      where: { id: messageId, conversationId, senderId: userId, deletedAt: null },
      data: { content: '', deletedAt: new Date() },
    });
  });
}

export async function deleteConversation(userId: number, conversationId: string) {
  const result = await prisma.conversation.deleteMany({
    where: { id: conversationId, participants: { some: { userId } } },
  });
  if (result.count === 0) throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
}
