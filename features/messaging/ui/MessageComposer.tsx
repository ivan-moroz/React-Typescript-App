import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ChangeEvent } from "react";
import { MAX_MESSAGE_LENGTH } from "../model/types";

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
  const draftInput = useRef<HTMLTextAreaElement>(null);
  const wasSending = useRef(sending);
  const restoreFocusAfterSend = useRef(false);

  useEffect(() => {
    const finishedSending = wasSending.current && !sending;
    wasSending.current = sending;
    if (!finishedSending || !restoreFocusAfterSend.current) return;

    restoreFocusAfterSend.current = false;
    draftInput.current?.focus();
  }, [sending]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || sending || !draft.trim()) return;

    restoreFocusAfterSend.current = true;
    if (await onSend(draft)) setDraft("");
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form className="chat-composer" onSubmit={onSubmit}>
      <label htmlFor="message-draft" className="messaging-sr-only">
        Message to {recipientName}
      </label>
      <textarea
        id="message-draft"
        placeholder="Write a message…"
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        ref={draftInput}
        value={draft}
        disabled={sending}
        autoFocus={active}
        onChange={onChange}
        onKeyDown={onKeyDown}
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
