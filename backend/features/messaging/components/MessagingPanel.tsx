import { useEffect, useRef, useState } from "react";
import { fetchData } from "../../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import {
  publishMessagingUnread,
  subscribeMessagingMessages,
} from "../client/events";
import { subscribeMessagingRealtime } from "../client/realtime";
import ConversationDeleteDialog from "./ConversationDeleteDialog";
import ConversationInbox from "./ConversationInbox";
import ConversationSearch from "./ConversationSearch";
import ChatThread from "./ChatThread";
import { useConversationSearch } from "../hooks/useConversationSearch";
import type {
  ChatMessage,
  ConversationPage,
  ConversationSummary,
  MessagingSnapshot,
  MessagingUser,
} from "../types/types";

export default function MessagingPanel({
  user,
  onUnread,
  onExpired,
  initialData,
  active = true,
  serverNavigation = false,
}: {
  user: MessagingUser;
  onUnread: (count: number) => void;
  onExpired: () => void;
  initialData?: MessagingSnapshot;
  active?: boolean;
  serverNavigation?: boolean;
}) {
  const navigateServerPage = (href: string) => {
    window.dispatchEvent(new CustomEvent("app:navigate", { detail: href }));
  };
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
  const {
    query,
    setQuery,
    users,
    searching,
    searchError,
    setSearchError,
  } = useConversationSearch(active, onExpired);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);
  const removedIds = useRef(new Set<string>());
  const refreshInboxOnReturn = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

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
    const activeIds = result.data.conversationIds ? new Set(result.data.conversationIds) : null;
    if (selected && activeIds && !activeIds.has(selected.id)) removeFromPanel(selected.id);
    setSelected((current) =>
      current && (!activeIds || activeIds.has(current.id)) && !removedIds.current.has(current.id)
        ? (result.data.conversations.find((item) => item.id === current.id) ??
          current)
        : null,
    );
    setConversations((current) => {
      const map = new Map(current.filter(item => (!activeIds || activeIds.has(item.id)) && !removedIds.current.has(item.id)).map((item) => [item.id, item]));
      result.data.conversations.forEach((item) => { if ((!activeIds || activeIds.has(item.id)) && !removedIds.current.has(item.id)) map.set(item.id, item); });
      return Array.from(map.values()).sort(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
      );
    });
    // Refreshing the first page must not reset the user's history pagination.
    if (next || conversations.length <= 30) setCursor(result.data.nextCursor);
  };
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const applyMessage = (message: ChatMessage) => {
      setConversations((current) => {
        const next = current.map((item) => item.id !== message.conversationId ? item : {
          ...item,
          updatedAt: message.createdAt,
          lastMessage: message,
          unreadCount: message.senderId === user.id ? item.unreadCount : item.unreadCount + 1,
        });
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
      });
      setSelected((current) => current?.id === message.conversationId ? {
        ...current,
        updatedAt: message.createdAt,
        lastMessage: message,
      } : current);
    };
    const unsubscribeLocalMessages = subscribeMessagingMessages(applyMessage);
    const unsubscribe = subscribeMessagingRealtime((event) => {
      if (event.type === "sync-inbox") {
        setConversations(event.conversations);
        setSelected((current) => current ? event.conversations.find((item) => item.id === current.id) ?? current : null);
        return;
      }
      if (event.type === "update" && event.kind === "message-sent" && event.message) {
        applyMessage(event.message);
        return;
      }
      const needsRefresh =
        (event.type === "update" &&
          event.kind !== "message-read" &&
          (event.actorId !== user.id || event.kind === "message-sent"));
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
    if (!active || selected || !refreshInboxOnReturn.current || !lifetime.current) return;
    refreshInboxOnReturn.current = false;
    void load(lifetime.current.signal);
  }, [active, selected]);

  const start = async (recipient: MessagingUser) => {
    if (starting) return;
    setStarting(true);
    setSearchError("");
    const signal = lifetime.current!.signal;
    const result = await fetchData<ConversationSummary>(
      "/api/messaging/conversations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: recipient.id }),
        signal,
      },
    );
    if (signal.aborted) return;
    setStarting(false);
    if (!result.success) {
      setSearchError(result.error.message);
      if (result.error.status === 401) onExpired();
      return;
    }
    if (serverNavigation) {
      navigateServerPage(`/messaging?conversation=${result.data.id}`);
      return;
    }
    setSelected(result.data);
    setQuery("");
  };

  const removeFromPanel = (id: string) => {
    removedIds.current.add(id);
    setConversations(current => current.filter(item => item.id !== id));
    setSelected(current => current?.id === id ? null : current);
    if (serverNavigation && selected?.id === id) navigateServerPage("/messaging");
  };
  const deleteDialog = deleting && (
    <ConversationDeleteDialog
      conversation={deleting}
      onClose={() => setDeleting(null)}
      onConfirm={async () => {
      const signal = lifetime.current!.signal;
      const result = await fetchData(`/api/messaging/conversations/${deleting.id}`, { method: 'DELETE', responseType: 'void', signal, errorMessage: ERROR_MESSAGES.CONVERSATION_DELETE_FAILED });
      if (signal.aborted) return;
      if (!result.success) throw result.error;
      removeFromPanel(deleting.id);
      await load(signal);
      }}
    />
  );

  if (selected)
    return (
      <><ChatThread
        key={selected.id}
        conversation={selected}
        user={user}
        active={active}
        initialMessages={
          initialData?.selectedConversation?.id === selected.id
            ? (initialData.messagePage ?? undefined)
            : undefined
        }
        onBack={() => {
          if (serverNavigation)
            navigateServerPage("/messaging");
          else setSelected(null);
        }}
        onExpired={onExpired}
        onDeleteConversation={() => setDeleting(selected)}
        onConversationDeleted={() => removeFromPanel(selected.id)}
        onChanged={() => {
          if (lifetime.current) void load(lifetime.current.signal);
        }}
      />{deleteDialog}</>
    );

  return (
    <div className="messaging-body">
      <ConversationSearch
        query={query}
        users={users}
        searching={searching}
        error={searchError}
        starting={starting}
        active={active}
        onQueryChange={setQuery}
        onStart={(recipient) => void start(recipient)}
      />
      <ConversationInbox
        loading={loading}
        error={error}
        conversations={conversations}
        cursor={cursor}
        loadingMore={loadingMore}
        serverNavigation={serverNavigation}
        onSelect={setSelected}
        onDelete={setDeleting}
        onRetry={() => {
          if (lifetime.current) void load(lifetime.current.signal);
        }}
        onLoadOlder={() => {
          setLoadingMore(true);
          void load(lifetime.current!.signal, cursor ?? undefined);
        }}
      />
      {deleteDialog}
    </div>
  );
}
