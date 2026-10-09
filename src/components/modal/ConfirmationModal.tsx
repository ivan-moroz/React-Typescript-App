import Modal from './Modal';
import type {ModalControls} from './ModalProvider';

export default function ConfirmationModal({username, onClose}: ModalControls & {username: string}) {
    return <Modal isOpen title='Delete user' onClose={onClose} footer={<>
        <button type='button' onClick={onClose}>Cancel</button>
        <button type='button' onClick={onClose}>Delete</button>
    </>}><p>Are you sure to delete user {username}</p></Modal>;
}
