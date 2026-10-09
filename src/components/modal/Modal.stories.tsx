import {ModalProvider, useModal} from './ModalProvider';
import ConfirmationModal from './ConfirmationModal';
import type {Meta, StoryObj} from '@storybook/react-vite';

import Modal from './Modal';

const meta: Meta<typeof Modal> = {
    title: 'Components/Modal',
    component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

function ConfirmationModalExample() {
    const {openModal} = useModal();
    return <button type='button' onClick={() => openModal(ConfirmationModal, {username: 'User 1'})}>
        Open confirmation modal
    </button>;
}

export const Functional: Story = {
    render: () => <ModalProvider><ConfirmationModalExample /></ModalProvider>,
};
