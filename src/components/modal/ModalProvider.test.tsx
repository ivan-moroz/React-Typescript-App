import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';
import Modal from './Modal';
import {ModalProvider, useModal} from './ModalProvider';
import type {ModalControls} from './ModalProvider';

let closePrevious: () => void;
function TestModal({name, onClose}: ModalControls & {name: string}) {
    const [value, setValue] = useState('');
    if (name === 'First') closePrevious = onClose;
    return <Modal isOpen title={name} onClose={onClose}>
        <input aria-label='Value' value={value} onChange={(event) => setValue(event.target.value)} />
    </Modal>;
}
function Launcher({onRender}: {onRender?: () => void}) {
    onRender?.();
    const {openModal, closeModal} = useModal();
    return <>
        <button onClick={() => openModal(TestModal, {name: 'First'})}>First</button>
        <button onClick={() => openModal(TestModal, {name: 'Second'})}>Second</button>
        <button onClick={() => closePrevious()}>Close previous</button>
        <button onClick={closeModal}>Close current</button>
    </>;
}

test('renders one modal, passes props, resets state, and ignores stale close callbacks', () => {
    const onRender = vi.fn();
    render(<ModalProvider><Launcher onRender={onRender} /></ModalProvider>);
    fireEvent.click(screen.getByText('First'));
    fireEvent.change(screen.getByLabelText('Value'), {target: {value: 'draft'}});
    fireEvent.click(screen.getByText('Second'));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Second');
    expect(screen.getByLabelText('Value')).toHaveValue('');
    fireEvent.click(screen.getByText('Close previous'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Second');
    fireEvent.click(screen.getByText('Close current'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onRender).toHaveBeenCalledTimes(1);
});

test('keeps clicks inside open and supports header and backdrop closing', () => {
    render(<ModalProvider><Launcher /></ModalProvider>);
    fireEvent.click(screen.getByText('First'));
    fireEvent.click(screen.getByLabelText('Value'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('First'));
    fireEvent.click(screen.getByRole('presentation'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('closes an owned modal when its launcher unmounts', () => {
    const view = render(<ModalProvider><Launcher /></ModalProvider>);
    fireEvent.click(screen.getByText('First'));
    view.rerender(<ModalProvider><span>Another page</span></ModalProvider>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
