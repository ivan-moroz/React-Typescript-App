export default function AIChatTrigger() {
  return (
    <button
      type="button"
      className="messages-link ai-chat-trigger"
      aria-label="Open AI chat"
      aria-haspopup="dialog"
      data-open-ai-chat
    >
      <span className="material-icons" aria-hidden="true">
        smart_toy
      </span>
    </button>
  );
}
