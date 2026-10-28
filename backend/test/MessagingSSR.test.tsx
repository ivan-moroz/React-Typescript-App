import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { GetServerSidePropsContext } from "next";
import MessagingPage, { getServerSideProps } from "../pages/messaging";
import Messaging from "../features/messaging/Messaging";
import { getInitialMessaging } from "../lib/messagingSSR";
import { getSessionUser } from "../lib/session";
import {
  getConversationSummary,
  listConversations,
  listMessages,
} from "../lib/messaging";
import { ERROR_MESSAGES, HttpError } from "../../src/constants/errors";

vi.mock("../lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("../lib/messaging", () => ({
  getConversationSummary: vi.fn(),
  listConversations: vi.fn(),
  listMessages: vi.fn(),
}));

const user = {
  id: 1,
  name: "Jane",
  passwordHash: "never-send-this-to-the-browser",
};
const conversationId = "11111111-1111-4111-8111-111111111111";
const message = {
  id: "22222222-2222-4222-8222-222222222222",
  conversationId,
  senderId: 2,
  content: "Rendered on the server",
  createdAt: new Date("2026-10-28T10:00:00Z"),
  readAt: new Date("2026-10-28T10:01:00Z"),
};
const summary = {
  id: conversationId,
  updatedAt: message.createdAt,
  user: { id: 2, name: "Alex" },
  lastMessage: message,
  unreadCount: 1,
};
const context = (conversation?: unknown) =>
  ({
    req: { headers: {} },
    res: { setHeader: vi.fn() },
    query: conversation === undefined ? {} : { conversation },
    resolvedUrl: conversation
      ? `/messaging?conversation=${conversation}`
      : "/messaging",
  }) as unknown as GetServerSidePropsContext;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(user);
  vi.mocked(listConversations).mockResolvedValue({
    conversations: [summary],
    unreadCount: 1,
    nextCursor: null,
  });
  vi.mocked(getConversationSummary).mockResolvedValue(summary);
  vi.mocked(listMessages).mockResolvedValue({
    messages: [message],
    hasMore: false,
    nextCursor: null,
  });
});
afterEach(() => vi.restoreAllMocks());

test("redirects anonymous visitors before loading private messaging data", async () => {
  vi.mocked(getSessionUser).mockResolvedValue(null);
  expect(await getServerSideProps(context())).toEqual({
    redirect: { destination: "/login?from=%2Fmessaging", permanent: false },
  });
  expect(listConversations).not.toHaveBeenCalled();
});

test("loads private conversations and selected history on the server and serializes dates without secrets", async () => {
  const ctx = context(conversationId);
  const result = await getServerSideProps(ctx);
  expect("props" in result).toBe(true);
  if (!("props" in result)) return;
  const props = await result.props;
  expect(ctx.res.setHeader).toHaveBeenCalledWith(
    "Cache-Control",
    "private, no-store",
  );
  expect(listConversations).toHaveBeenCalledWith(1);
  expect(getConversationSummary).toHaveBeenCalledWith(1, conversationId);
  expect(listMessages).toHaveBeenCalledWith(1, conversationId);
  expect(props.initialMessaging.messagePage?.messages[0].createdAt).toBe(
    "2026-10-28T10:00:00.000Z",
  );
  expect(props.initialMessaging.user).toEqual({ id: 1, name: "Jane" });
  expect(JSON.stringify(props)).not.toContain(user.passwordHash);
  const html = renderToString(<MessagingPage {...props} />);
  expect(html).toContain("Alex");
  expect(html).toContain("Rendered on the server");
  expect(html).toContain("10:00 UTC");
  expect(html).not.toContain("Loading messages");
});

test("renders the unread badge and inbox in the server-rendered header", async () => {
  const initialData = await getInitialMessaging(user);
  const html = renderToString(<Messaging initialData={initialData} />);
  expect(html).toContain("Messages, 1 unread");
  expect(html).toContain("Alex");
  expect(html).toContain("Rendered on the server");
  expect(html).toContain('hidden=""');
});

test("renders native conversation links that request server-rendered history", async () => {
  const initialMessaging = await getInitialMessaging(user);
  const html = renderToString(
    <MessagingPage initialMessaging={initialMessaging} />,
  );
  expect(html).toContain(
    `href="/messaging?conversation=${conversationId}&amp;returnTo=%2Fassets"`,
  );
  expect(html).toContain("Alex");
  expect(html).not.toContain("Loading conversations");
});

test("returns to the originating page with the panel open and preserves that destination in conversation links", async () => {
  const ctx = context();
  ctx.query.returnTo = "/users";
  const result = await getServerSideProps(ctx);
  if (!("props" in result)) throw new Error("Expected server props");
  const props = await result.props;
  render(<MessagingPage {...props} />);
  expect(screen.getByRole("link", { name: "Return to panel" })).toHaveAttribute(
    "href",
    "/users?messaging=panel",
  );
  expect(screen.getByRole("link", { name: /Alex/ })).toHaveAttribute(
    "href",
    `/messaging?conversation=${conversationId}&returnTo=%2Fusers`,
  );
});

test("can render the messaging panel initially open", async () => {
  const initialData = await getInitialMessaging(user);
  render(<Messaging initialData={initialData} initialOpen returnTo="/users" />);
  expect(
    screen.getByRole("dialog", { name: "Private messages" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Messages, 1 unread" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Open full inbox" })).toHaveAttribute(
    "href",
    "/messaging?returnTo=%2Fusers",
  );
});

test("ignores external return destinations", async () => {
  const ctx = context();
  ctx.query.returnTo = "https://untrusted.example";
  const result = await getServerSideProps(ctx);
  expect(result).toMatchObject({ props: { returnTo: "/assets" } });
});

test("hydrates SSR history without mismatches or refetching the initial data", async () => {
  const initialMessaging = await getInitialMessaging(user, conversationId);
  const content = <MessagingPage initialMessaging={initialMessaging} />;
  const container = document.createElement("div");
  container.innerHTML = renderToString(content);
  document.body.appendChild(container);
  const fetch = vi.spyOn(globalThis, "fetch");
  const onRecoverableError = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, content, { onRecoverableError });
    });
    expect(container.textContent).toContain("Rendered on the server");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

test("does not disclose a conversation belonging to someone else", async () => {
  vi.mocked(getConversationSummary).mockRejectedValue(
    new HttpError(404, ERROR_MESSAGES.MESSAGING_NOT_FOUND),
  );
  expect(await getServerSideProps(context(conversationId))).toEqual({
    notFound: true,
  });
  expect(listMessages).not.toHaveBeenCalled();
});

test.each(["invalid", ["duplicate", "query"]])(
  "rejects malformed conversation query parameters",
  async (selected) => {
    expect(await getServerSideProps(context(selected))).toEqual({
      notFound: true,
    });
    expect(listConversations).not.toHaveBeenCalled();
  },
);

test("returns a safe server error state without breaking other page headers", async () => {
  vi.mocked(listConversations).mockRejectedValue(
    new Error("private database error"),
  );
  const ctx = context();
  const result = await getServerSideProps(ctx);
  expect(ctx.res.statusCode).toBe(503);
  expect("props" in result).toBe(true);
  if (!("props" in result)) return;
  const props = await result.props;
  expect(props.initialMessaging.error).toBe(
    ERROR_MESSAGES.MESSAGING_LOAD_FAILED,
  );
  expect(JSON.stringify(props)).not.toContain("private database error");
});
