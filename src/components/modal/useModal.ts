import { ERROR_MESSAGES } from "../../constants/errors";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { ModalContext, type ModalActions } from "./modalContext";

export function useModal(): ModalActions {
	const actions = useContext(ModalContext);
	if (!actions) throw new Error(ERROR_MESSAGES.MODAL_PROVIDER_REQUIRED);
	const ownedClose = useRef<(() => void) | null>(null);
	useEffect(() => () => ownedClose.current?.(), []);
	const openModal = useCallback<ModalActions["openModal"]>(
		(component, props) => {
			const close = actions.openModal(component, props);
			ownedClose.current = close;
			return close;
		},
		[actions],
	);
	return useMemo(
		() => ({ openModal, closeModal: actions.closeModal }),
		[openModal, actions],
	);
}
