import {useState} from 'react';
import Modal from '../../../components/modal/Modal';
import type {ModalControls} from '../../../components/modal/ModalProvider';
import type {User} from '../types/types';
type Props = ModalControls & {user: User; onDeleted: () => Promise<void>; onError: (message: string) => void};
export default function DeleteUserModal({user, onDeleted, onError, onClose}: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const handleDeleteUser = async (): Promise<void> => {
        if (!user) {
            return;
        }

        if (isDeleting) return;
        setIsDeleting(true);
        onError('');

        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Unable to delete user');
            }

            await onDeleted();
            onClose();
        } catch {
            onError('Failed to delete user');
        } finally { setIsDeleting(false); }
    };

    return (
            <Modal
                isOpen
                title='Delete user'
                onClose={onClose}
                footer={(
                    <>
                        <button type='button' onClick={onClose}>
                            Cancel
                        </button>
                        <button type='button' disabled={isDeleting} onClick={() => void handleDeleteUser()}>
                            Delete
                        </button>
                    </>
                )}
            >
                <p>Are you sure to delete user {user.name}</p>
            </Modal>
    );
}
