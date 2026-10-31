import ConfirmationModal from "../../../../src/components/modal/ConfirmationModal";
import type { ConversationSummary } from "../types/types";

export default function ConversationDeleteDialog({
  conversation,
  onClose,
  onConfirm,
}: {
  conversation: ConversationSummary;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmationModal
      title="Delete conversation"
      message={`Delete the conversation with ${conversation.user?.name ?? "this user"} for both participants? All messages will be permanently removed.`}
      confirmLabel="Delete"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
