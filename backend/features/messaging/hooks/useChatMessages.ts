import { useEffect, useRef, useState } from "react";
import { fetchData } from "../../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import { usePolling } from "./usePolling";
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
  const pollCursor = useRef<string | null>(lastInitial?.id ?? null);
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

  usePolling(
    async (signal) => {
      const result = await fetchData<MessagePage>(
        `${endpoint}/messages${initialized.current && pollCursor.current ? `?after=${pollCursor.current}&from=${current.current[0]?.id ?? pollCursor.current}` : ""}`,
        { signal },
      );
      if (signal.aborted) return;
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
        pollCursor.current = fetchedLatest.id;
        readCursor.current = fetchedLatest;
      }
      result.data.deletedMessageIds?.forEach(id => deletedIds.current.add(id));
      merge(result.data.messages);
      await markSeen(signal);
    },
    3000,
    active,
    !initialPage,
  );

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
    onChanged();
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
