import { useEffect, useRef, useState } from "react";
import { fetchData } from "../../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import {
  publishMessagingUnread,
  subscribeMessagingMessages,
} from "../client/events";
import { subscribeMessagingRealtime } from "../client/realtime";
import type {
  ChatMessage,
  ConversationPage,
  ConversationSummary,
  MessagingSnapshot,
  MessagingUser,
} from "../types/types";

export function useConversationInbox({
  user,
  onUnread,
  onExpired,
  initialData,
  active,
  serverNavigation,
}: {
  user: MessagingUser;
  onUnread: (count: number) => void;
  onExpired: () => void;
  initialData?: MessagingSnapshot;
  active: boolean;
  serverNavigation: boolean;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialData?.conversationPage.conversations ?? [],
  );
  const [selected, setSelected] = useState<ConversationSummary | null>(
    initialData?.selectedConversation ?? null,
  );
  const [cursor, setCursor] = useState<string | null>(
    initialData?.conversationPage.nextCursor ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(initialData?.error ?? "");
  const removedIds = useRef(new Set<string>());
  const refreshInboxOnReturn = useRef(false);
  const lifetime = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  const navigateServerPage = (href: string) => {
    window.dispatchEvent(new CustomEvent("app:navigate", { detail: href }));
  };

  const removeFromPanel = (id: string) => {
    removedIds.current.add(id);
    setConversations((current) => current.filter((item) => item.id !== id));
    setSelected((current) => (current?.id === id ? null : current));
    if (serverNavigation && selected?.id === id)
      navigateServerPage("/messaging");
  };

  const load = async (signal: AbortSignal, next?: string) => {
    const result = await fetchData<ConversationPage>(
      `/api/messaging/conversations${next ? `?cursor=${next}` : ""}`,
      { signal, errorMessage: ERROR_MESSAGES.MESSAGING_LOAD_FAILED },
    );
    if (signal.aborted) return;
    setLoading(false);
    setLoadingMore(false);
    if (!result.success) {
      if (result.error.status === 401) onExpired();
      else setError(result.error.message);
      return;
    }
    setError("");
    onUnread(result.data.unreadCount);
    publishMessagingUnread(result.data.unreadCount);
    const activeIds = result.data.conversationIds
      ? new Set(result.data.conversationIds)
      : null;
    if (selected && activeIds && !activeIds.has(selected.id))
      removeFromPanel(selected.id);
    setSelected((current) =>
      current &&
      (!activeIds || activeIds.has(current.id)) &&
      !removedIds.current.has(current.id)
        ? result.data.conversations.find((item) => item.id === current.id) ??
          current
        : null,
    );
    setConversations((current) => {
      const map = new Map(
        current
          .filter(
            (item) =>
              (!activeIds || activeIds.has(item.id)) &&
              !removedIds.current.has(item.id),
          )
          .map((item) => [item.id, item]),
      );
      result.data.conversations.forEach((item) => {
        if (
          (!activeIds || activeIds.has(item.id)) &&
          !removedIds.current.has(item.id)
        )
          map.set(item.id, item);
      });
      return Array.from(map.values()).sort(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
      );
    });
    if (next || conversations.length <= 30)
      setCursor(result.data.nextCursor);
  };

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const applyMessage = (message: ChatMessage) => {
      setConversations((current) => {
        const next = current.map((item) =>
          item.id !== message.conversationId
            ? item
            : {
                ...item,
                updatedAt: message.createdAt,
                lastMessage: message,
                unreadCount:
                  message.senderId === user.id
                    ? item.unreadCount
                    : item.unreadCount + 1,
              },
        );
        return next.sort(
          (a, b) =>
            b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
        );
      });
      setSelected((current) =>
        current?.id === message.conversationId
          ? {
              ...current,
              updatedAt: message.createdAt,
              lastMessage: message,
            }
          : current,
      );
    };
    const unsubscribeLocalMessages = subscribeMessagingMessages(applyMessage);
    const unsubscribe = subscribeMessagingRealtime((event) => {
      if (event.type === "sync-inbox") {
        setConversations(event.conversations);
        setSelected((current) =>
          current
            ? event.conversations.find((item) => item.id === current.id) ??
              current
            : null,
        );
        return;
      }
      if (
        event.type === "update" &&
        event.kind === "message-sent" &&
        event.message
      ) {
        applyMessage(event.message);
        return;
      }
      const needsRefresh =
        event.type === "update" &&
        event.kind !== "message-read" &&
        (event.actorId !== user.id || event.kind === "message-sent");
      if (!needsRefresh) return;
      if (selected) {
        refreshInboxOnReturn.current = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        void load(controller.signal);
      }, 50);
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
      unsubscribe();
      unsubscribeLocalMessages();
    };
  }, [active, selected, user.id]);

  useEffect(() => {
    if (!active || selected || !refreshInboxOnReturn.current || !lifetime.current)
      return;
    refreshInboxOnReturn.current = false;
    void load(lifetime.current.signal);
  }, [active, selected]);

  return {
    conversations,
    selected,
    setSelected,
    cursor,
    loading,
    loadingMore,
    setLoadingMore,
    error,
    load,
    removeFromPanel,
    lifetime,
    navigateServerPage,
  };
}
