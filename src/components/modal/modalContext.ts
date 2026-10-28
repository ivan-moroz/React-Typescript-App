import { createContext } from "react";
import type { ComponentType } from "react";

export type ModalControls = { onClose: () => void };
export type ModalActions = {
	openModal: <P extends object>(
		component: ComponentType<P & ModalControls>,
		props: Omit<P, keyof ModalControls>,
	) => () => void;
	closeModal: () => void;
};

export const ModalContext = createContext<ModalActions | null>(null);
