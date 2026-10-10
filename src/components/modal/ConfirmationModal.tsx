import { useRef, useState } from "react";
import type { ReactNode } from "react";
import Modal from "./Modal";
import type { ModalControls } from "./ModalProvider";

type Props = ModalControls & {
	title: string;
	message: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void | Promise<void>;
};

export default function ConfirmationModal({
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onClose,
}: Props) {
	const [isConfirming, setIsConfirming] = useState(false);
	const [error, setError] = useState("");
	const pending = useRef(false);
	const handleClose = () => {
		if (!pending.current) onClose();
	};
	const handleConfirm = async () => {
		if (pending.current) return;
		pending.current = true;
		setIsConfirming(true);
		setError("");
		try {
			await onConfirm();
			onClose();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Could not complete the action.",
			);
		} finally {
			pending.current = false;
			setIsConfirming(false);
		}
	};

	return (
		<Modal
			isOpen
			title={title}
			onClose={handleClose}
			footer={
				<>
					<button
						type="button"
						disabled={isConfirming}
						onClick={handleClose}
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						disabled={isConfirming}
						onClick={() => void handleConfirm()}
					>
						{confirmLabel}
					</button>
				</>
			}
		>
			<p>{message}</p>
			{error && <p role="alert">{error}</p>}
		</Modal>
	);
}
