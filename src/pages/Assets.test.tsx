import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {ModalProvider} from '../components/modal/ModalProvider';
import AssetsPage from './Assets';

const asset = {id: 'a1', name: 'Photo', description: 'A photo', authorization: 'INTERNAL', type: 'image/png', size: 100, createdAt: '2026-01-01', userId: 1};
beforeEach(() => sessionStorage.setItem('authenticatedUser', JSON.stringify({id: 1, name: 'Jane'})));
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

test('replaces preview with editor, saves edits, and refreshes the library', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ok: true, json: async () => [asset]} as Response)
        .mockResolvedValueOnce({ok: true} as Response);
    render(<ModalProvider><AssetsPage /></ModalProvider>);
    fireEvent.click(await screen.findByLabelText('Open Photo'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo');
    expect(within(screen.getByRole('dialog')).getByRole('link', {name: 'Download'})).toHaveAttribute('href', '/api/assets/a1?userId=1&download=1');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Edit'}));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Edit asset');
    fireEvent.change(screen.getByLabelText('Asset Name'), {target: {value: 'Updated photo'}});
    fireEvent.click(screen.getByText('Save changes'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Updated photo')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/assets/a1', expect.objectContaining({method: 'PUT'}));
});

test('uploads a file and resets the editor after cancellation', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ok: true, json: async () => []} as Response)
        .mockResolvedValueOnce({ok: true, json: async () => asset} as Response)
        .mockResolvedValueOnce({ok: true} as Response);
    render(<ModalProvider><AssetsPage /></ModalProvider>);
    await screen.findByText('No assets yet');
    fireEvent.click(screen.getByText('Upload assets'));
    fireEvent.change(screen.getByLabelText('Asset Name'), {target: {value: 'Discarded'}});
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Upload assets'));
    expect(screen.getByLabelText('Asset Name')).toHaveValue('');
    const file = new File(['image'], 'photo.png', {type: 'image/png'});
    fireEvent.change(document.querySelector('input[type=file]')!, {target: {files: [file]}});
    fireEvent.click(screen.getByRole('button', {name: 'Upload asset'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Photo')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/assets/a1/file?userId=1', expect.objectContaining({method: 'PUT', body: file}));
});

test('requires confirmation before deleting an asset and supports cancellation', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ok: true, json: async () => [asset]} as Response)
        .mockResolvedValueOnce({ok: true} as Response);
    render(<ModalProvider><AssetsPage /></ModalProvider>);
    await screen.findByText('Photo');
    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Delete asset');
    expect(screen.getByRole('dialog')).toHaveTextContent('Photo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Delete'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('No assets yet')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/assets/a1', {
        method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId: 1}),
    });
});

test('keeps the asset confirmation open after a failed deletion and allows retry', async () => {
    vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ok: true, json: async () => [asset]} as Response)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ok: true} as Response);
    render(<ModalProvider><AssetsPage /></ModalProvider>);
    await screen.findByText('Photo');
    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Delete'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection failed');
    expect(screen.getByText('Photo')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Delete'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('No assets yet')).toBeInTheDocument();
});
