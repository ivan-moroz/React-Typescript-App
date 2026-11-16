"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchData } from "../../../shared/lib/fetchData";
import type { ChatMessage } from "../../messaging/model/types";
import MessageComposer from "../../messaging/ui/MessageComposer";
import MessageList from "../../messaging/ui/MessageList";

type AIMessage = { role: "user" | "assistant"; content: string };
const MAX_HISTORY_MESSAGES = 20;
const MAX_LOCAL_MESSAGES = 100;
const AI_SENDER_ID = 0;
const CURRENT_USER_ID = 1;
const AI_CONVERSATION_ID = "ollama-ai-chat";

export default function AIChatPanelHost() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const messageId = useRef(0);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLButtonElement>(
        "button[data-open-ai-chat]",
      );
      if (!target) return;
      trigger.current = target;
      setOpen((currentlyOpen) => !currentlyOpen);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !(event.target instanceof Element &&
          event.target.closest("button[data-open-ai-chat]"))
      ) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) document.getElementById("ai-chat-draft")?.focus();
  }, [open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return false;
    setSending(true);
    setError("");

    const recentMessages: AIMessage[] = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((message): AIMessage => ({
        role: message.senderId === CURRENT_USER_ID ? "user" : "assistant",
        content: message.content,
      }));
    const currentMessage: AIMessage = { role: "user", content };
    const history: AIMessage[] = [
      ...recentMessages,
      currentMessage,
    ].slice(-MAX_HISTORY_MESSAGES);
    if (history[0]?.role === "assistant") history.shift();

    const userMessage: ChatMessage = {
      id: `ai-user-${++messageId.current}`,
      conversationId: AI_CONVERSATION_ID,
      senderId: CURRENT_USER_ID,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((currentMessages) =>
      [...currentMessages, userMessage].slice(-MAX_LOCAL_MESSAGES),
    );

    try {
      const result = await fetchData<{ message: string }>("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!result.success) {
        setError(result.error.message);
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== userMessage.id),
        );
        return false;
      }
      if (typeof result.data?.message !== "string") {
        setError("The AI response was invalid. Please try again.");
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== userMessage.id),
        );
        return false;
      }
      const assistantMessage: ChatMessage = {
        id: `ai-response-${++messageId.current}`,
        conversationId: AI_CONVERSATION_ID,
        senderId: AI_SENDER_ID,
        content: result.data.message,
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      setMessages((currentMessages) =>
        [...currentMessages, assistantMessage].slice(-MAX_LOCAL_MESSAGES),
      );
      return true;
    } catch (sendError) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== userMessage.id),
      );
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send your message. Please try again.",
      );
      return false;
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messaging-dock ai-chat-dock" ref={panel}>
      <section
        className="messaging-panel"
        hidden={!open}
        role="dialog"
        aria-label="AI chat"
        aria-busy={sending}
      >
        <header className="chat-heading">
          <h3>Ollama AI</h3>
          <button
            type="button"
            aria-label="Close AI chat"
            onClick={() => close(true)}
          >
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </header>
        {error && <p role="alert" className="messaging-error">{error}</p>}
        <MessageList
          messages={messages}
          currentUserId={CURRENT_USER_ID}
          loading={sending}
          loadingOlder={false}
          hasOlder={false}
          onLoadOlder={async () => {}}
          onDeleteMessage={() => {}}
          historyLabel="AI chat history"
          loadingMessage="AI is thinking…"
          loadingAtEnd
          emptyMessage="Ask the AI assistant a question."
          allowDelete={false}
        />
        <MessageComposer
          recipientName="AI assistant"
          sending={sending}
          loading={false}
          active={open}
          onSend={send}
          inputId="ai-chat-draft"
          placeholder="Message the AI…"
        />
      </section>
    </div>
  );
}
