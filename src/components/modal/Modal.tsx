import type {ReactNode} from 'react';

import './styles/styles.scss';

type ModalProps = {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
};

export default function Modal({isOpen, title, children, footer, onClose}: ModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className='modal-backdrop' role='presentation' onClick={onClose}>
            <div
                className='modal'
                role='dialog'
                aria-modal='true'
                aria-labelledby='modal-title'
                onClick={(event) => event.stopPropagation()}
            >
                <div className='modal-header'>
                    <h2 id='modal-title'>{title}</h2>
                    <button type='button' aria-label='Close modal' onClick={onClose}>
                        <span className='material-icons'>close</span>
                    </button>
                </div>
                <div className='modal-body'>{children}</div>
                {footer && <div className='modal-footer'>{footer}</div>}
            </div>
        </div>
    );
}
