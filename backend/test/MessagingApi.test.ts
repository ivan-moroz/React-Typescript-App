import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../pages/api/messaging/[[...route]]";
import { getSessionUser } from "../lib/session";
import { ERROR_MESSAGES } from "../../src/constants/errors";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  conversation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  message: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  conversationParticipant: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("../lib/prisma", () => ({ default: db }));
vi.mock("../lib/session", () => ({ getSessionUser: vi.fn() }));
const conversationId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-10-28T10:00:00.000Z");

async function request(
  route: string[],
  method = "GET",
  body?: unknown,
  query = {},
  origin?: string,
) {
  const req = {
    method,
    body,
    query: { route, ...query },
    headers: { host: "localhost:3001", ...(origin ? { origin } : {}) },
  } as unknown as NextApiRequest;
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  await handler(req, res as unknown as NextApiResponse);
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
  globalThis.publishMessagingUpdate = vi.fn();
  vi.mocked(getSessionUser).mockResolvedValue({ id: 1, name: "Jane" });
  db.$transaction.mockImplementation(async (work: unknown) =>
    typeof work === "function"
      ? work(db)
      : Promise.all(work as Promise<unknown>[]),
  );
  db.message.count.mockResolvedValue(0);
});

afterEach(() => {
  globalThis.publishMessagingUpdate = undefined;
});

test.each(["conversations", "unread", "users"])(
  "rejects anonymous access to %s",
  async (route) => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await request([route]);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(db.conversation.findMany).not.toHaveBeenCalled();
    expect(db.user.findMany).not.toHaveBeenCalled();
  },
);

test.each(["messages", "read"])(
  "rejects non-members accessing conversation %s",
  async (action) => {
    db.conversation.findFirst.mockResolvedValue(null);
    const res = await request(
      ["conversations", conversationId, action],
      action === "read" ? "POST" : "GET",
      { messageId },
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.message.findMany).not.toHaveBeenCalled();
    expect(db.message.updateMany).not.toHaveBeenCalled();
  },
);

test("rejects sending as a non-member", async () => {
  db.conversation.findFirst.mockResolvedValue(null);
  const res = await request(
    ["conversations", conversationId, "messages"],
    "POST",
    { content: "Hello", senderId: 2 },
  );
  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.message.create).not.toHaveBeenCalled();
});

test("uses the authenticated sender and saves a message transactionally", async () => {
  db.conversation.findFirst.mockResolvedValue({ _count: { participants: 2 } });
  db.conversation.findUnique.mockResolvedValue({
    participants: [{ userId: 1 }, { userId: 2 }],
  });
  db.message.create.mockResolvedValue({ id: messageId, createdAt: now });
  const res = await request(
    ["conversations", conversationId, "messages"],
    "POST",
    { content: " Hello <script>text</script> ", senderId: 2 },
  );
  expect(res.status).toHaveBeenCalledWith(201);
  expect(db.message.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        conversationId,
        senderId: 1,
        content: "Hello <script>text</script>",
      },
    }),
  );
  expect(db.conversation.updateMany).toHaveBeenCalledWith({
    where: { id: conversationId, updatedAt: { lt: now } },
    data: { updatedAt: now },
  });
  expect(globalThis.publishMessagingUpdate).toHaveBeenCalledWith([1, 2], {
    type: "update",
    conversationId,
    actorId: 1,
    kind: "message-sent",
  });
});

test.each(["", "   ", "a".repeat(2001), null, 123])(
  "rejects invalid message content",
  async (content) => {
    const res = await request(
      ["conversations", conversationId, "messages"],
      "POST",
      { content },
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.message.create).not.toHaveBeenCalled();
  },
);

test.each([1, -1, "2", undefined])(
  "rejects self or invalid recipient IDs",
  async (userId) => {
    const res = await request(["conversations"], "POST", { userId });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.conversation.upsert).not.toHaveBeenCalled();
  },
);

test("rejects a nonexistent recipient", async () => {
  db.user.findUnique.mockResolvedValue(null);
  const res = await request(["conversations"], "POST", { userId: 2 });
  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.conversation.upsert).not.toHaveBeenCalled();
});

test("uses the same unique key for both directions of a private conversation", async () => {
  db.user.findUnique.mockResolvedValue({ id: 2, name: "Alex" });
  db.conversation.upsert.mockResolvedValue({
    id: conversationId,
    updatedAt: now,
  });
  await request(["conversations"], "POST", { userId: 2 });
  vi.mocked(getSessionUser).mockResolvedValue({ id: 2, name: "Alex" });
  await request(["conversations"], "POST", { userId: 1 });
  expect(
    db.conversation.upsert.mock.calls.map(([input]) => input.where.directKey),
  ).toEqual(["1:2", "1:2"]);
  expect(
    db.conversation.upsert.mock.calls[0][0].create.participants.create,
  ).toEqual([{ userId: 1 }, { userId: 2 }]);
});

test("limits history to 40 messages and returns a stable older-history cursor", async () => {
  db.conversation.findFirst.mockResolvedValue({ id: conversationId });
  db.message.findMany.mockResolvedValue(
    Array.from({ length: 41 }, (_, index) => ({
      id: String(41 - index),
      createdAt: now,
    })),
  );
  const res = await request(["conversations", conversationId, "messages"]);
  const payload = res.json.mock.calls[0][0];
  expect(payload.messages).toHaveLength(40);
  expect(payload.hasMore).toBe(true);
  expect(payload.nextCursor).toBe("2");
  expect(db.message.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { conversationId }, take: 41 }),
  );
});

test("rejects a history cursor from another conversation", async () => {
  db.conversation.findFirst.mockResolvedValue({ id: conversationId });
  db.message.findFirst.mockResolvedValue(null);
  const res = await request(
    ["conversations", conversationId, "messages"],
    "GET",
    undefined,
    { before: messageId },
  );
  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.message.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: messageId, conversationId } }),
  );
  expect(db.message.findMany).not.toHaveBeenCalled();
});

test("marks only received messages through the displayed message as read", async () => {
  db.conversation.findFirst.mockResolvedValue({ id: conversationId });
  db.message.findFirst.mockResolvedValue({ id: messageId, createdAt: now });
  db.message.updateMany.mockResolvedValue({ count: 2 });
  db.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });
  const res = await request(["conversations", conversationId, "read"], "POST", {
    messageId,
  });
  expect(res.status).toHaveBeenCalledWith(204);
  expect(db.message.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        conversationId,
        senderId: { not: 1 },
        readAt: null, deletedAt: null,
        OR: [
          { createdAt: { lt: now } },
          { createdAt: now, id: { lte: messageId } },
        ],
      },
    }),
  );
});

test("scopes unread counts to the authenticated participant", async () => {
  await request(["unread"]);
  expect(db.message.count).toHaveBeenCalledWith({
    where: {
      senderId: { not: 1 },
      readAt: null, deletedAt: null,
      conversation: { participants: { some: { userId: 1 } } },
    },
  });
});

test("lists only the current participant’s conversations with unread counts and a last-message preview", async () => {
  db.conversation.findMany.mockResolvedValue([
    {
      id: conversationId,
      updatedAt: now,
      participants: [{ user: { id: 2, name: "Alex" } }],
      messages: [{ id: messageId, content: "Hello", createdAt: now }],
      _count: { messages: 2 },
    },
  ]);
  db.message.count.mockResolvedValue(2);
  const res = await request(["conversations"]);
  expect(db.conversation.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { participants: { some: { userId: 1 } } },
      take: 31,
    }),
  );
  expect(res.json).toHaveBeenCalledWith({
    conversations: [
      {
        id: conversationId,
        updatedAt: now,
        user: { id: 2, name: "Alex" },
        lastMessage: { id: messageId, content: "Hello", createdAt: now },
        unreadCount: 2,
      },
    ],
    unreadCount: 2,
    nextCursor: null,
    conversationIds: [conversationId],
  });
});

test("validates pagination parameters before querying history", async () => {
  const invalid = await request(
    ["conversations", conversationId, "messages"],
    "GET",
    undefined,
    { before: "invalid" },
  );
  expect(invalid.status).toHaveBeenCalledWith(400);
  const conflicting = await request(
    ["conversations", conversationId, "messages"],
    "GET",
    undefined,
    { before: messageId, after: messageId },
  );
  expect(conflicting.status).toHaveBeenCalledWith(400);
  expect(db.message.findMany).not.toHaveBeenCalled();
});

test("search returns only public user identifiers and names", async () => {
  db.user.findMany.mockResolvedValue([{ id: 2, name: "Alex" }]);
  const res = await request(["users"], "GET", undefined, { q: "Alex" });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(db.user.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      select: { id: true, name: true },
      take: 20,
      where: {
        id: { not: 1 },
        name: { contains: "Alex", mode: "insensitive" },
      },
    }),
  );
});

test("rejects cross-origin mutations and does not leak unexpected database errors", async () => {
  const res = await request(
    ["conversations"],
    "POST",
    { userId: 2 },
    {},
    "https://untrusted.example",
  );
  expect(res.status).toHaveBeenCalledWith(403);
  db.message.count.mockRejectedValue(new Error("private database details"));
  const failure = await request(["unread"]);
  expect(failure.status).toHaveBeenCalledWith(500);
  expect(failure.json).toHaveBeenCalledWith({
    message: ERROR_MESSAGES.MESSAGING_LOAD_FAILED,
  });
});

test('only the sender can redact a message in their conversation', async () => {
  db.conversation.findFirst.mockResolvedValue({ id: conversationId });
  db.message.findFirst.mockResolvedValue({ id: messageId });
  db.message.updateMany.mockResolvedValue({ count: 1 });
  const res = await request(['conversations', conversationId, 'messages', messageId], 'DELETE');
  expect(res.status).toHaveBeenCalledWith(204);
  expect(db.message.findFirst).toHaveBeenCalledWith({ where: { id: messageId, conversationId, senderId: 1 }, select: { id: true } });
  expect(db.message.updateMany).toHaveBeenCalledWith({ where: { id: messageId, conversationId, senderId: 1, deletedAt: null }, data: { content: '', deletedAt: expect.any(Date) } });
});

test('rejects deleting another user’s message', async () => {
  db.conversation.findFirst.mockResolvedValue({ id: conversationId });
  db.message.findFirst.mockResolvedValue(null);
  const res = await request(['conversations', conversationId, 'messages', messageId], 'DELETE');
  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.message.updateMany).not.toHaveBeenCalled();
});

test('rejects a non-member attempting to delete a message', async () => {
  db.conversation.findFirst.mockResolvedValue(null);
  const res = await request(['conversations', conversationId, 'messages', messageId], 'DELETE');
  expect(res.status).toHaveBeenCalledWith(404);
  expect(db.message.findFirst).not.toHaveBeenCalled();
  expect(db.message.updateMany).not.toHaveBeenCalled();
});

test.each([0, 1])('conversation deletion is atomically scoped to membership (deleted count: %s)', async count => {
  db.conversation.deleteMany.mockResolvedValue({ count });
  const res = await request(['conversations', conversationId], 'DELETE');
  expect(res.status).toHaveBeenCalledWith(count ? 204 : 404);
  expect(db.conversation.deleteMany).toHaveBeenCalledWith({ where: { id: conversationId, participants: { some: { userId: 1 } } } });
});

test('rejects anonymous and cross-origin deletion', async () => {
  const foreign = await request(['conversations', conversationId], 'DELETE', undefined, {}, 'https://untrusted.example');
  expect(foreign.status).toHaveBeenCalledWith(403);
  vi.mocked(getSessionUser).mockResolvedValue(null);
  const guest = await request(['conversations', conversationId], 'DELETE');
  expect(guest.status).toHaveBeenCalledWith(401);
  expect(db.conversation.deleteMany).not.toHaveBeenCalled();
});

test('synchronizes deletions in the loaded message window without invalidating a deleted cursor', async () => {
  db.conversation.findFirst.mockResolvedValue({ id: conversationId });
  db.message.findFirst.mockResolvedValue({ id: messageId, createdAt: now });
  db.message.findMany.mockResolvedValueOnce([{ id: messageId }]).mockResolvedValueOnce([]);
  const res = await request(['conversations', conversationId, 'messages'], 'GET', undefined, { after: messageId, from: messageId });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deletedMessageIds: [messageId], messages: [] }));
  expect(db.message.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { conversationId, deletedAt: { not: null }, OR: [{ createdAt: { gt: now } }, { createdAt: now, id: { gte: messageId } }] } }));
});
