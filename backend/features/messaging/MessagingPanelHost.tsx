import { useCallback, useEffect, useRef, useState } from "react";
import { fetchData } from "../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../src/constants/errors";
import Messaging from "./Messaging";
import type {
  ConversationPage,
  MessagePage,
  MessagingSnapshot,
  MessagingUser,
} from "./types/types";

const emptySnapshot = (
  user: MessagingUser | null,
  error = "",
): MessagingSnapshot => ({
  user,
  conversationPage: { conversations: [], unreadCount: 0, nextCursor: null },
  selectedConversation: null,
  messagePage: null,
  error,
});

export default function MessagingPanelHost({
  initialData,
}: {
  initialData?: MessagingSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<MessagingSnapshot | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  const opening = useRef(false);

  const openPanel = useCallback(async () => {
    if (opening.current) return;
    opening.current = true;
    const session = await fetchData<MessagingUser | null>("/api/auth/session");
    let nextSnapshot: MessagingSnapshot;
    if (!session.success) {
      nextSnapshot = emptySnapshot(null, session.error.message);
    } else if (!session.data) {
      nextSnapshot = emptySnapshot(null);
    } else {
      const conversations = await fetchData<ConversationPage>(
        "/api/messaging/conversations",
        { errorMessage: ERROR_MESSAGES.MESSAGING_LOAD_FAILED },
      );
      if (!conversations.success) {
        nextSnapshot = emptySnapshot(session.data, conversations.error.message);
      } else {
        const selectedId = initialData?.selectedConversation?.id;
        let selectedConversation = selectedId
          ? conversations.data.conversations.find((item) => item.id === selectedId) ??
            initialData?.selectedConversation ??
            null
          : null;
        let messagePage: MessagePage | null = null;
        if (selectedId) {
          const messages = await fetchData<MessagePage>(
            `/api/messaging/conversations/${selectedId}/messages`,
            { errorMessage: ERROR_MESSAGES.MESSAGING_LOAD_FAILED },
          );
          if (messages.success) messagePage = messages.data;
          else selectedConversation = null;
        }
        nextSnapshot = {
          ...emptySnapshot(session.data),
          conversationPage: conversations.data,
          selectedConversation,
          messagePage,
        };
      }
    }
    setSnapshot(nextSnapshot);
    setPanelKey((current) => current + 1);
    opening.current = false;
  }, [initialData]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLAnchorElement>(
        "a[data-open-messaging-panel]",
      );
      if (!trigger) return;
      event.preventDefault();
      void openPanel();
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openPanel]);

  useEffect(() => {
    const openRequested = () => void openPanel();
    window.addEventListener("messaging:open", openRequested);
    return () => window.removeEventListener("messaging:open", openRequested);
  }, [openPanel]);

  if (!snapshot || panelKey === 0) return null;
  return (
    <div className="messaging-dock">
      <Messaging
        key={panelKey}
        initialData={snapshot}
        initialOpen
        showTrigger={false}
      />
    </div>
  );
}
