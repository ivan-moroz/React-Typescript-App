import { useEffect, useRef, useState } from "react";
import { fetchData } from "../../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import {
  publishMessagingMessage,
  subscribeMessagingMessages,
} from "../client/events";
import { requestMessagingSync, subscribeMessagingRealtime } from "../client/realtime";
import {
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
  type MessagePage,
} from "../types/types";

export function useChatMessages(
  conversationId: string,
  userId: number,
  onChanged: () => void,
  onExpired: () => void,
  initialPage?: MessagePage,
  active = true,
  onConversationDeleted?: () => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialPage?.messages ?? [],
  );
  const current = useRef<ChatMessage[]>(initialPage?.messages ?? []);
  const deletedIds = useRef(new Set(initialPage?.messages.filter(message => message.deletedAt).map(message => message.id) ?? []));
  const [loading, setLoading] = useState(!initialPage);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialPage?.hasMore ?? false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(Boolean(initialPage));
  const sendingRef = useRef(false);
  const olderRef = useRef(false);
  const readThrough = useRef("");
  const lastInitial =
    initialPage?.messages[initialPage.messages.length - 1] ?? null;
  const latestCursor = useRef<string | null>(lastInitial?.id ?? null);
  const readCursor = useRef<ChatMessage | null>(lastInitial);
  const lifetime = useRef<AbortController | null>(null);
  const endpoint = `/api/messaging/conversations/${conversationId}`;
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  const merge = (incoming: ChatMessage[]) => {
    const map = new Map(
      current.current.map((message) => [message.id, message]),
    );
    incoming.forEach((message) => {
      if (message.deletedAt) deletedIds.current.add(message.id);
      map.set(message.id, message);
    });
    for (const id of deletedIds.current) {
      const message = map.get(id);
      if (message) map.set(id, { ...message, content: '', deletedAt: message.deletedAt ?? new Date().toISOString() });
    }
    current.current = Array.from(map.values()).sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    setMessages(current.current);
  };
  const fail = (failure: Error & { status?: number }) => {
    if (failure.status === 401) onExpired();
    else if (failure.status === 404 && onConversationDeleted) onConversationDeleted();
    else setError(failure.message);
  };
  const markSeen = async (signal: AbortSignal) => {
    const last = readCursor.current;
    if (
      !last ||
      readThrough.current === last.id ||
      document.visibilityState === "hidden"
    )
      return;
    const unread = current.current.some(
      (message) => message.senderId !== userId && !message.readAt && !message.deletedAt,
    );
    if (!unread) return;
    const result = await fetchData(`${endpoint}/read`, {
      method: "POST",
      responseType: "void",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: last.id }),
      signal,
    });
    if (signal.aborted) return;
    if (result.success) {
      readThrough.current = last.id;
      // Only messages included in this request are considered read locally.
      const cutoff = current.current.findIndex(
        (message) => message.id === last.id,
      );
      const now = new Date().toISOString();
      current.current = current.current.map((message, index) =>
        index <= cutoff && message.senderId !== userId && !message.readAt
          ? { ...message, readAt: now }
          : message,
      );
      setMessages(current.current);
      onChanged();
    } else fail(result.error);
  };

  useEffect(() => {
    if (initialPage && active && lifetime.current)
      void markSeen(lifetime.current.signal);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let syncRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let syncReceived = false;
    let syncAttempts = 0;
    let emptySyncRecoveryStarted = false;
    const sendSyncAttempt = () => {
      if (syncReceived) return;
      if (syncAttempts >= 4) {
        void refresh();
        return;
      }
      syncAttempts += 1;
      const loaded = current.current;
      const request = {
        type: "sync-messages" as const,
        conversationId,
        // Reconcile the latest page on reconnect/hints. Cursor-only sync can
        // miss a message if an event advanced a stale local cursor.
        after: null,
        from: loaded[0]?.id ?? null,
      };
      requestMessagingSync(request);
      clearTimeout(syncRetryTimer);
      syncRetryTimer = setTimeout(sendSyncAttempt, 1000);
    };
    const requestSync = () => {
      syncReceived = false;
      syncAttempts = 0;
      clearTimeout(syncRetryTimer);
      sendSyncAttempt();
    };
    const refresh = async (latestPage = false) => {
      const result = await fetchData<MessagePage>(
        `${endpoint}/messages${!latestPage && initialized.current && latestCursor.current ? `?after=${latestCursor.current}&from=${current.current[0]?.id ?? latestCursor.current}` : ""}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setLoading(false);
      if (!result.success) {
        fail(result.error);
        return;
      }
      setError("");
      if (!initialized.current) setHasOlder(result.data.hasMore);
      initialized.current = true;
      const fetchedLatest =
        result.data.messages[result.data.messages.length - 1];
      if (fetchedLatest) {
        latestCursor.current = fetchedLatest.id;
        readCursor.current = fetchedLatest;
      }
      result.data.deletedMessageIds?.forEach(id => deletedIds.current.add(id));
      merge(result.data.messages);
      await markSeen(controller.signal);
    };
    if (!initialPage) timer = setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeMessagingRealtime((event) => {
      if (event.type === "connected") {
        requestSync();
        return;
      }
      if (event.type === "sync-messages" && event.conversationId === conversationId) {
        syncReceived = true;
        syncAttempts = 0;
        clearTimeout(syncRetryTimer);
        // A successful WebSocket response can still be stale/empty while this
        // tab already has history. Reconcile once from the latest page so a
        // missed message is recovered after reconnect without polling.
        if (
          event.messages.length === 0 &&
          current.current.length > 0 &&
          !event.deletedMessageIds?.length
        ) {
          if (!emptySyncRecoveryStarted) {
            emptySyncRecoveryStarted = true;
            void refresh(true);
          }
          return;
        }
        emptySyncRecoveryStarted = false;
        event.deletedMessageIds?.forEach((id) => deletedIds.current.add(id));
        const latest = event.messages[event.messages.length - 1];
        if (latest) {
          latestCursor.current = latest.id;
          readCursor.current = latest;
        }
        merge(event.messages);
        // Messages received while this conversation is open should be marked
        // read as soon as the authoritative socket sync includes them. Without
        // this, only the initial page load clears the unread badge.
        void markSeen(controller.signal);
        return;
      }
      if (event.type === "sync-error") {
        clearTimeout(syncRetryTimer);
        sendSyncAttempt();
        return;
      }
      if (event.type === "sync-inbox") {
        const summary = event.conversations.find((item) => item.id === conversationId);
        if (summary?.lastMessage) {
          latestCursor.current = summary.lastMessage.id;
          readCursor.current = summary.lastMessage;
          merge([summary.lastMessage]);
        }
        return;
      }
      if (event.type === "update" && event.conversationId === conversationId) {
        if (event.kind === "conversation-deleted") {
          onConversationDeleted?.();
          return;
        }
        if (event.message) {
          latestCursor.current = event.message.id;
          readCursor.current = event.message;
          merge([event.message]);
        }
        // Treat the live event as a hint and reconcile against the server over
        // the same socket, so a dropped or malformed event cannot hide a message.
        requestSync();
      }
    });
    const handleConnectionRestore = () => {
      if (document.visibilityState === "visible") requestSync();
    };
    const unsubscribeLocalMessages = subscribeMessagingMessages((message) => {
      if (message.conversationId === conversationId) merge([message]);
    });
    window.addEventListener("online", handleConnectionRestore);
    window.addEventListener("focus", handleConnectionRestore);
    document.addEventListener("visibilitychange", handleConnectionRestore);
    return () => {
      clearTimeout(timer);
      clearTimeout(syncRetryTimer);
      controller.abort();
      unsubscribe();
      unsubscribeLocalMessages();
      window.removeEventListener("online", handleConnectionRestore);
      window.removeEventListener("focus", handleConnectionRestore);
      document.removeEventListener("visibilitychange", handleConnectionRestore);
    };
  }, [active, conversationId, endpoint, initialPage, userId]);

  const loadOlder = async () => {
    if (olderRef.current || !hasOlder || !current.current.length) return;
    olderRef.current = true;
    setLoadingOlder(true);
    const signal = lifetime.current!.signal;
    const result = await fetchData<MessagePage>(
      `${endpoint}/messages?before=${current.current[0].id}`,
      { signal },
    );
    if (signal.aborted) return;
    olderRef.current = false;
    setLoadingOlder(false);
    if (!result.success) {
      fail(result.error);
      return;
    }
    setHasOlder(result.data.hasMore);
    merge(result.data.messages);
  };
  const send = async (text: string): Promise<boolean> => {
    if (sendingRef.current) return false;
    if (!text.trim() || text.trim().length > MAX_MESSAGE_LENGTH) {
      setError(ERROR_MESSAGES.MESSAGING_CONTENT_INVALID);
      return false;
    }
    sendingRef.current = true;
    setSending(true);
    setError("");
    const signal = lifetime.current!.signal;
    const result = await fetchData<ChatMessage>(`${endpoint}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
      signal,
      errorMessage: ERROR_MESSAGES.MESSAGING_SEND_FAILED,
    });
    if (signal.aborted) return false;
    sendingRef.current = false;
    setSending(false);
    if (!result.success) {
      fail(result.error);
      return false;
    }
    merge([result.data]);
    publishMessagingMessage(result.data);
    return true;
  };
  const removeMessage = async (id: string) => {
    const signal = lifetime.current!.signal;
    const result = await fetchData(`${endpoint}/messages/${id}`, { method: 'DELETE', responseType: 'void', signal, errorMessage: ERROR_MESSAGES.MESSAGE_DELETE_FAILED });
    if (signal.aborted) return;
    if (!result.success) throw result.error;
    deletedIds.current.add(id);
    merge([]);
    onChanged();
  };
  return {
    messages,
    loading,
    loadingOlder,
    hasOlder,
    sending,
    error,
    loadOlder,
    send,
    removeMessage,
  };
}
