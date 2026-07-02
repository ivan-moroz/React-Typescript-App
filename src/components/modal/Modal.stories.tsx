import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';

import Modal from './Modal';

const meta: Meta<typeof Modal> = {
    title: 'Components/Modal',
    component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

function ConfirmationModalExample() {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const username = 'User 1';

    const closeModal = (): void => {
        setIsOpen(false);
    };

    return (
        <div>
            <button type='button' onClick={() => setIsOpen(true)}>
                Open confirmation modal
            </button>
            <Modal
                isOpen={isOpen}
                title='Delete user'
                onClose={closeModal}
                footer={(
                    <>
                        <button type='button' onClick={closeModal}>
                            Cancel
                        </button>
                        <button type='button' onClick={closeModal}>
                            Delete
                        </button>
                    </>
                )}
            >
                <p>Are you sure to delete user {username}</p>
            </Modal>
        </div>
    );
}

export const Functional: Story = {
    render: () => <ConfirmationModalExample />,
};
