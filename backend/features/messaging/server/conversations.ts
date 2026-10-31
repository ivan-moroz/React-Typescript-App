import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import { ERROR_MESSAGES, HttpError } from "../../../../src/constants/errors";
import { messageSelect } from "./messageSelect";

export async function requireConversation(userId: number, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, participants: { some: { userId } } },
    select: { id: true },
  });
  if (!conversation)
    throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
}

export async function getConversationParticipantIds(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { participants: { select: { userId: true } } },
  });
  return conversation?.participants.map(({ userId }) => userId) ?? [];
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
          messages: {
            where: {
              senderId: { not: userId },
              readAt: null,
              deletedAt: null,
            },
          },
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
      readAt: null,
      deletedAt: null,
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
          messages: {
            where: {
              senderId: { not: userId },
              readAt: null,
              deletedAt: null,
            },
          },
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
    conversationIds: (
      await prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        select: { id: true },
      })
    ).map((item) => item.id),
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

export async function deleteConversation(userId: number, conversationId: string) {
  const result = await prisma.conversation.deleteMany({
    where: { id: conversationId, participants: { some: { userId } } },
  });
  if (result.count === 0)
    throw new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND);
}
