import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import MessagingPageClient from "../features/messaging/MessagingPageClient";
import Messaging from "../features/messaging/Messaging";
import { getInitialMessaging } from "../features/messaging/server/messagingSSR";
import { loadMessagingPage } from "../features/messaging/server/loadMessagingPage";
import { getSessionUserFromCookie } from "../lib/session";
import { getConversationSummary, listConversations, listMessages } from "../features/messaging/server/messaging";
import { ERROR_MESSAGES, HttpError } from "../../src/constants/errors";

vi.mock("../lib/session", () => ({ getSessionUserFromCookie: vi.fn() }));
vi.mock("../features/messaging/server/messaging", () => ({ getConversationSummary: vi.fn(), listConversations: vi.fn(), listMessages: vi.fn() }));

const user = { id: 1, name: "Jane", passwordHash: "never-send-this-to-the-browser" };
const conversationId = "11111111-1111-4111-8111-111111111111";
const message = { id: "22222222-2222-4222-8222-222222222222", conversationId, senderId: 2, content: "Rendered on the server", createdAt: new Date("2026-10-28T10:00:00Z"), readAt: new Date("2026-10-28T10:01:00Z") };
const summary = { id: conversationId, updatedAt: message.createdAt, user: { id: 2, name: "Alex" }, lastMessage: message, unreadCount: 1 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionUserFromCookie).mockResolvedValue(user);
  vi.mocked(listConversations).mockResolvedValue({ conversations: [summary], unreadCount: 1, nextCursor: null });
  vi.mocked(getConversationSummary).mockResolvedValue(summary);
  vi.mocked(listMessages).mockResolvedValue({ messages: [message], hasMore: false, nextCursor: null });
});
afterEach(() => vi.restoreAllMocks());

test("redirects anonymous visitors before loading private messaging data", async () => {
  vi.mocked(getSessionUserFromCookie).mockResolvedValue(null);
  expect(await loadMessagingPage(undefined, {})).toEqual({ kind: "redirect", destination: "/login?from=%2Fmessaging" });
  expect(listConversations).not.toHaveBeenCalled();
});

test("loads conversations and selected history on the server without leaking secrets", async () => {
  const result = await loadMessagingPage("app_session=valid", { conversation: conversationId });
  expect(result.kind).toBe("page");
  if (result.kind !== "page") return;
  expect(listConversations).toHaveBeenCalledWith(1);
  expect(getConversationSummary).toHaveBeenCalledWith(1, conversationId);
  expect(listMessages).toHaveBeenCalledWith(1, conversationId);
  expect(result.initialMessaging.messagePage?.messages[0].createdAt).toBe("2026-10-28T10:00:00.000Z");
  expect(result.initialMessaging.user).toEqual({ id: 1, name: "Jane" });
  expect(JSON.stringify(result)).not.toContain(user.passwordHash);
  const html = renderToString(<MessagingPageClient initialMessaging={result.initialMessaging} />);
  expect(html).toContain("Alex");
  expect(html).toContain("Rendered on the server");
  expect(html).toContain("10:00 UTC");
});

test("renders the unread badge and inbox in server-rendered messaging", async () => {
  const initialData = await getInitialMessaging(user);
  const html = renderToString(<Messaging initialData={initialData} />);
  expect(html).toContain("Messages, 1 unread");
  expect(html).toContain("Alex");
  expect(html).toContain("Rendered on the server");
  expect(html).toContain('hidden=""');
});

test("renders native conversation links for server-rendered history", async () => {
  const initialMessaging = await getInitialMessaging(user);
  const html = renderToString(<MessagingPageClient initialMessaging={initialMessaging} />);
  expect(html).toContain(`href="/messaging?conversation=${conversationId}"`);
  expect(html).toContain("Alex");
  expect(html).not.toContain("Loading conversations");
});

test("full inbox does not offer a return-to-panel action", async () => {
  const result = await loadMessagingPage("app_session=valid", {});
  if (result.kind !== "page") throw new Error("Expected messaging page");
  render(<MessagingPageClient initialMessaging={result.initialMessaging} />);
  expect(screen.queryByRole("link", { name: "Return to panel" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Alex/ })).toHaveAttribute(
    "href",
    `/messaging?conversation=${conversationId}`,
  );
});

test("opens the selected conversation when App Router supplies updated page data", async () => {
  const inbox = await getInitialMessaging(user);
  const selected = await getInitialMessaging(user, conversationId);
  const { rerender } = render(<MessagingPageClient initialMessaging={inbox} />);

  expect(screen.queryByRole("heading", { level: 3, name: "Alex" })).not.toBeInTheDocument();

  rerender(<MessagingPageClient initialMessaging={selected} />);

  expect(screen.getByRole("heading", { level: 3, name: "Alex" })).toBeInTheDocument();
  expect(screen.getByText("Rendered on the server")).toBeInTheDocument();
});

test("opens the messaging panel when requested", async () => {
  const initialData = await getInitialMessaging(user);
  render(<Messaging initialData={initialData} initialOpen />);
  expect(screen.getByRole("dialog", { name: "Private messages" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Messages, 1 unread" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Open full inbox" })).toHaveAttribute("href", "/messaging");
});

test("hydrates server history without mismatch or duplicate fetch", async () => {
  const initialMessaging = await getInitialMessaging(user, conversationId);
  const content = <MessagingPageClient initialMessaging={initialMessaging} />;
  const container = document.createElement("div");
  container.innerHTML = renderToString(content);
  document.body.appendChild(container);
  const fetch = vi.spyOn(globalThis, "fetch");
  const onRecoverableError = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, content, { onRecoverableError }); });
    expect(container.textContent).toContain("Rendered on the server");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

test("does not reveal a conversation belonging to someone else", async () => {
  vi.mocked(getConversationSummary).mockRejectedValue(new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND));
  expect(await loadMessagingPage("app_session=valid", { conversation: conversationId })).toEqual({ kind: "notFound" });
  expect(listMessages).not.toHaveBeenCalled();
});

test.each(["invalid", ["duplicate", "query"]])("rejects malformed conversation parameters", async (conversation) => {
  expect(await loadMessagingPage("app_session=valid", { conversation })).toEqual({ kind: "notFound" });
  expect(listConversations).not.toHaveBeenCalled();
});

test("returns a safe server error state when messaging data fails", async () => {
  vi.mocked(listConversations).mockRejectedValue(new Error("private database error"));
  const result = await loadMessagingPage("app_session=valid", {});
  expect(result).toMatchObject({ kind: "page", initialMessaging: { error: ERROR_MESSAGES.MESSAGING_LOAD_FAILED } });
  expect(JSON.stringify(result)).not.toContain("private database error");
});
