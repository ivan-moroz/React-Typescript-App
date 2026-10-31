import { useState } from "react";
import { MAX_MESSAGE_LENGTH } from "../types/types";

export default function MessageComposer({
  recipientName,
  sending,
  loading,
  active,
  onSend,
}: {
  recipientName: string;
  sending: boolean;
  loading: boolean;
  active: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");

  return (
    <form
      className="chat-composer"
      onSubmit={async (event) => {
        event.preventDefault();
        if (loading || sending) return;
        if (await onSend(draft)) setDraft("");
      }}
    >
      <label htmlFor="message-draft" className="messaging-sr-only">
        Message to {recipientName}
      </label>
      <textarea
        id="message-draft"
        placeholder="Write a message…"
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        value={draft}
        disabled={sending}
        autoFocus={active}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button type="submit" disabled={sending || !draft.trim() || loading}>
        {sending ? "Sending…" : "Send"}
      </button>
      <small>
        {draft.length}/{MAX_MESSAGE_LENGTH} · Shift+Enter for a new line
      </small>
    </form>
  );
}
