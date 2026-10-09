import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import type {ComponentType, ReactNode} from 'react';

export type ModalControls = {onClose: () => void};
type ModalActions = {
    openModal: <P extends object>(component: ComponentType<P & ModalControls>, props: Omit<P, keyof ModalControls>) => () => void;
    closeModal: () => void;
};
type ActiveModal = {id: number; content: ReactNode};
const ModalContext = createContext<ModalActions | null>(null);

export function ModalProvider({children}: {children: ReactNode}) {
    const [active, setActive] = useState<ActiveModal | null>(null);
    const nextId = useRef(0);
    const closeModal = useCallback(() => setActive(null), []);
    const openModal = useCallback(<P extends object,>(Component: ComponentType<P & ModalControls>, props: Omit<P, keyof ModalControls>) => {
        const id = ++nextId.current;
        // A completed request from a replaced dialog must not close the new one.
        const onClose = () => setActive((current) => current?.id === id ? null : current);
        setActive({id, content: <Component {...props as P} onClose={onClose} />});
        return onClose;
    }, []);
    const actions = useMemo(() => ({openModal, closeModal}), [openModal, closeModal]);

    return <ModalContext.Provider value={actions}>
        {children}
        {active && <div key={active.id}>{active.content}</div>}
    </ModalContext.Provider>;
}

export function useModal(): ModalActions {
    const actions = useContext(ModalContext);
    if (!actions) throw new Error('useModal must be used within ModalProvider');
    const ownedClose = useRef<(() => void) | null>(null);
    useEffect(() => () => ownedClose.current?.(), []);
    const openModal = useCallback<ModalActions['openModal']>((component, props) => {
        const close = actions.openModal(component, props);
        ownedClose.current = close;
        return close;
    }, [actions]);
    return useMemo(() => ({openModal, closeModal: actions.closeModal}), [openModal, actions]);
}
