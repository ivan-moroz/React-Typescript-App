import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import Messaging from "../Messaging";
import ChatThread from '../components/ChatThread';
import { useChatMessages } from "../hooks/useChatMessages";
import type { ChatMessage, MessagingSnapshot } from "../types/types";

const conversationId = "11111111-1111-4111-8111-111111111111";
const user = { id: 1, name: "Jane" };
class MockWebSocket extends EventTarget {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];

  constructor(readonly url: string) {
    super();
    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  receive(event: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(event) }));
  }

  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}
const incoming: ChatMessage = {
  id: "a",
  conversationId,
  senderId: 2,
  content: "<script>hello</script>",
  createdAt: "2026-10-28T10:00:00.000Z",
  readAt: null,
};
const outgoing: ChatMessage = {
  ...incoming,
  id: "c",
  senderId: 1,
  content: "Hello Alex",
  createdAt: "2026-10-28T10:02:00.000Z",
};
const snapshot = (unread = 0): MessagingSnapshot => ({
  user,
  conversationPage: {
    conversations: unread
      ? [
          {
            id: conversationId,
            user: { id: 2, name: "Alex" },
            updatedAt: incoming.createdAt,
            lastMessage: incoming,
            unreadCount: unread,
          },
        ]
      : [],
    unreadCount: unread,
    nextCursor: null,
  },
  selectedConversation: null,
  messagePage: null,
  error: "",
});

afterEach(() => {
  MockWebSocket.instances = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("shows unread conversations, reads a chat, safely renders text, and sends a message", async () => {
  let unreadCount = 1;
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, options) => {
      const url = String(input);
      if (url.endsWith("/unread")) return Response.json({ unreadCount });
      if (url.endsWith("/conversations"))
        return Response.json({
          conversations: [
            {
              id: conversationId,
              user: { id: 2, name: "Alex" },
              updatedAt: incoming.createdAt,
              lastMessage: incoming,
              unreadCount,
            },
          ],
          unreadCount,
          nextCursor: null,
        });
      if (url.endsWith("/read")) {
        unreadCount = 0;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/messages") && options?.method === "POST")
        return Response.json(outgoing, { status: 201 });
      if (url.includes("/messages"))
        return Response.json({
          messages: url.includes("?after=") ? [] : [incoming],
          hasMore: false,
          nextCursor: null,
        });
      return new Response(null, { status: 404 });
    });
  render(<Messaging initialData={snapshot(1)} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Messages, 1 unread" }),
  );
  fireEvent.click(await screen.findByRole("button", { name: /^Alex/ }));
  const text = await screen.findByText("<script>hello</script>");
  expect(text.closest(".chat-message")).toHaveClass("is-theirs");
  expect(document.querySelector("script")).toBeNull();
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/read"),
      expect.objectContaining({ method: "POST" }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Message to Alex"), {
    target: { value: "Hello Alex" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(
    (await within(screen.getByRole("log")).findByText("Hello Alex")).closest(
      ".chat-message",
    ),
  ).toHaveClass("is-mine");
  expect(screen.getByLabelText("Message to Alex")).toHaveValue("");
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/messages"),
    expect.objectContaining({
      body: JSON.stringify({ content: "Hello Alex" }),
    }),
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("debounces user search and creates a private conversation", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, options) => {
      const url = String(input);
      if (url.includes("/users?q="))
        return Response.json([{ id: 2, name: "Alex" }]);
      if (url.endsWith("/unread")) return Response.json({ unreadCount: 0 });
      if (url.endsWith("/conversations") && options?.method === "POST")
        return Response.json({
          id: conversationId,
          user: { id: 2, name: "Alex" },
          lastMessage: null,
          unreadCount: 0,
          updatedAt: incoming.createdAt,
        });
      if (url.includes("/messages"))
        return Response.json({
          messages: [],
          hasMore: false,
          nextCursor: null,
        });
      return Response.json({
        conversations: [],
        unreadCount: 0,
        nextCursor: null,
      });
    });
  render(<Messaging initialData={snapshot()} />);
  fireEvent.click(screen.getByRole("button", { name: "Messages" }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Alex" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: /Alex.*Start chat/ }),
  );
  expect(await screen.findByLabelText("Message to Alex")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    "/api/messaging/conversations",
    expect.objectContaining({ body: JSON.stringify({ userId: 2 }) }),
  );
});

test("shows a login prompt to an anonymous visitor", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(null));
  render(<Messaging initialData={{ ...snapshot(), user: null }} />);
  fireEvent.click(screen.getByRole("button", { name: "Messages" }));
  expect(await screen.findByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("can render the messaging panel without a floating trigger button", () => {
  render(<Messaging initialData={snapshot()} initialOpen showTrigger={false} />);

  expect(
    screen.queryByRole("button", { name: "Messages" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("dialog", { name: "Private messages" }),
  ).toBeInTheDocument();
});

test("refreshes the open conversation list only when a WebSocket update arrives", async () => {
  vi.stubGlobal("WebSocket", MockWebSocket);
  MockWebSocket.instances = [];
  const updated = {
    ...incoming,
    content: "Realtime update",
    createdAt: "2026-10-28T10:03:00.000Z",
  };
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      conversations: [
        {
          id: conversationId,
          user: { id: 2, name: "Alex" },
          updatedAt: updated.createdAt,
          lastMessage: updated,
          unreadCount: 1,
        },
      ],
      conversationIds: [conversationId],
      unreadCount: 1,
      nextCursor: null,
    }),
  );
  render(<Messaging initialData={snapshot(1)} initialOpen />);
  const socket = MockWebSocket.instances[0];
  socket.open();
  socket.receive({
    type: "update",
    conversationId,
    actorId: 2,
    kind: "message-sent",
  });

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(screen.getByText("Realtime update")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "/api/messaging/conversations",
    expect.anything(),
  );
});

test("does not skip an incoming message that arrives while a message is being sent", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  const between = {
    ...incoming,
    id: "b",
    content: "In between",
    createdAt: "2026-10-28T10:01:00.000Z",
    readAt: incoming.createdAt,
  };
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, options) => {
      if (options?.method === "POST") return Response.json(outgoing);
      return Response.json({
        messages: String(input).includes("?after=")
          ? [between, outgoing]
          : [{ ...incoming, readAt: incoming.createdAt }],
        hasMore: false,
        nextCursor: null,
      });
    });
  const { result, unmount } = renderHook(() =>
    useChatMessages(conversationId, 1, vi.fn(), vi.fn()),
  );
  const socket = MockWebSocket.instances[0];
  socket.open();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await result.current.send("Hello Alex");
  });
  await act(async () => {
    socket.receive({
      type: "update",
      conversationId,
      actorId: 2,
      kind: "message-sent",
    });
    socket.receive({
      type: "sync-messages",
      conversationId,
      messages: [between, outgoing],
    });
    await vi.advanceTimersByTimeAsync(25);
  });
  expect(socket.sent).toContainEqual(expect.objectContaining({
    type: "sync-messages",
    conversationId,
  }));
  expect(result.current.messages.map((message) => message.id)).toEqual([
    "a",
    "b",
    "c",
  ]);
  unmount();
});

test("syncs a message sent from another messaging panel on the Messages page", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  const { result, unmount } = renderHook(() =>
    useChatMessages(
      conversationId,
      user.id,
      vi.fn(),
      vi.fn(),
      { messages: [incoming], hasMore: false, nextCursor: null },
    ),
  );
  const socket = MockWebSocket.instances[0];
  socket.open();

  await act(async () => {
    socket.receive({
      type: "update",
      conversationId,
      actorId: user.id,
      kind: "message-sent",
    });
    socket.receive({
      type: "sync-messages",
      conversationId,
      messages: [{ ...incoming, readAt: incoming.createdAt }, outgoing],
    });
    await vi.advanceTimersByTimeAsync(25);
  });

  expect(socket.sent).toContainEqual(expect.objectContaining({
    type: "sync-messages",
    conversationId,
  }));
  expect(result.current.messages).toContainEqual(outgoing);
  unmount();
});

test("immediately shows a panel-sent message in the Messages page thread", async () => {
  const sentMessage = { ...outgoing, content: "Sent from the panel" };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(sentMessage));
  const initialPage = {
    messages: [{ ...incoming, readAt: incoming.createdAt }],
    hasMore: false,
    nextCursor: null,
  };
  const panel = renderHook(() =>
    useChatMessages(conversationId, user.id, vi.fn(), vi.fn(), initialPage),
  );
  const messagesPage = renderHook(() =>
    useChatMessages(conversationId, user.id, vi.fn(), vi.fn(), initialPage),
  );

  await act(async () => {
    expect(await panel.result.current.send("Sent from the panel")).toBe(true);
  });

  expect(messagesPage.result.current.messages).toContainEqual(sentMessage);
  panel.unmount();
  messagesPage.unmount();
});

test('only offers deletion for own messages and retains the confirmation after a failed deletion', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ message: 'Delete failed' }, { status: 500 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  render(<ChatThread conversation={snapshot(1).conversationPage.conversations[0]} user={user}
    initialMessages={{ messages: [{ ...incoming, readAt: incoming.createdAt }, outgoing], hasMore: false, nextCursor: null }}
    onBack={vi.fn()} onChanged={vi.fn()} onExpired={vi.fn()} />);
  expect(screen.getAllByRole('button', { name: 'Delete message' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Delete message' }));
  const dialog = screen.getByRole('dialog', { name: 'Delete message' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete', exact: true }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Delete failed');
  expect(screen.getByText('Hello Alex')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete', exact: true }));
  expect(await screen.findByText('Message deleted')).toBeInTheDocument();
  expect(screen.queryByText('Hello Alex')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete message' })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/messages/${outgoing.id}`), expect.objectContaining({ method: 'DELETE' }));
});

test('requires confirmation before deleting a conversation and refreshes the inbox afterwards', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, options) => options?.method === 'DELETE'
    ? new Response(null, { status: 204 })
    : Response.json({ conversations: [], conversationIds: [], unreadCount: 0, nextCursor: null }));
  render(<Messaging initialData={snapshot(1)} initialOpen />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete conversation with Alex' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete conversation' })).getByRole('button', { name: 'Cancel' }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete conversation with Alex' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete conversation' })).getByRole('button', { name: 'Delete', exact: true }));
  expect(await screen.findByText('No conversations yet. Search for a user to say hello.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete conversation with Alex' })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/messaging/conversations/${conversationId}`, expect.objectContaining({ method: 'DELETE' }));
});

test('WebSocket updates synchronize message deletions made in another session', async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ messages: [], deletedMessageIds: [outgoing.id], hasMore: false, nextCursor: null }));
  const { result, unmount } = renderHook(() => useChatMessages(conversationId, 1, vi.fn(), vi.fn(), { messages: [outgoing], hasMore: false, nextCursor: null }));
  const socket = MockWebSocket.instances[0];
  socket.open();
  await act(async () => {
    socket.receive({ type: "update", conversationId, actorId: 2, kind: "message-deleted" });
    socket.receive({ type: "sync-messages", conversationId, messages: [], deletedMessageIds: [outgoing.id] });
    await vi.advanceTimersByTimeAsync(25);
  });
  expect(result.current.messages[0]).toMatchObject({ id: outgoing.id, content: '', deletedAt: expect.any(String) });
  unmount();
});

test('closes a conversation deleted by the other participant', async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ message: 'Conversation not found' }, { status: 404 }));
  const onDeleted = vi.fn();
  const { unmount } = renderHook(() => useChatMessages(conversationId, 1, vi.fn(), vi.fn(), { messages: [outgoing], hasMore: false, nextCursor: null }, true, onDeleted));
  const socket = MockWebSocket.instances[0];
  socket.open();
  await act(async () => {
    socket.receive({ type: "update", conversationId, actorId: 2, kind: "conversation-deleted" });
    await vi.advanceTimersByTimeAsync(25);
  });
  expect(onDeleted).toHaveBeenCalledTimes(1);
  unmount();
});
