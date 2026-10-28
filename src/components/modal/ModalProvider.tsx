import { useCallback, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { ModalContext, type ModalActions, type ModalControls } from "./modalContext";

export type { ModalControls } from "./modalContext";

type ActiveModal = { id: number; content: ReactNode };

export function ModalProvider({ children }: { children: ReactNode }) {
	const [active, setActive] = useState<ActiveModal | null>(null);
	const nextId = useRef(0);
	const closeModal = useCallback(() => setActive(null), []);
	const openModal = useCallback(
		<P extends object>(
			Component: ComponentType<P & ModalControls>,
			props: Omit<P, keyof ModalControls>,
		) => {
			const id = ++nextId.current;
			// A completed request from a replaced dialog must not close the new one.
			const onClose = () =>
				setActive((current) => (current?.id === id ? null : current));
			setActive({
				id,
				content: <Component {...(props as P)} onClose={onClose} />,
			});
			return onClose;
		},
		[],
	);
	const actions = useMemo(
		() => ({ openModal, closeModal }),
		[openModal, closeModal],
	);

	return (
		<ModalContext.Provider value={actions}>
			{children}
			{active && <div key={active.id}>{active.content}</div>}
		</ModalContext.Provider>
	);
}
