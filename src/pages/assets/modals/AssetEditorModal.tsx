import {ChangeEvent, DragEvent, FormEvent, useRef, useState} from 'react';
import Modal from '../../../components/modal/Modal';
import type {ModalControls} from '../../../components/modal/ModalProvider';
import {Asset, AssetForm, AuthenticatedUser, Authorization, EMPTY_FORM, MAX_FILE_SIZE, saveAsset} from '../assetHelpers';
import '../../../styles/assets.scss';
type Props = ModalControls & {user: AuthenticatedUser; editingAsset?: Asset; onSaved: (asset: Asset, editing: boolean) => void; setMessage: (message: string) => void};
export default function AssetEditorModal({user, editingAsset, onSaved, setMessage, onClose}: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<AssetForm>(() => editingAsset ? {
        name: editingAsset.name, description: editingAsset.description, authorization: editingAsset.authorization, file: null
    } : EMPTY_FORM);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const setFile = (file: File | null) => {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) { setMessage('Files must be 10 MB or smaller.'); return; }
        setForm((current) => ({ ...current, file, name: current.name || file.name }));
    };
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] ?? null); event.target.value = ''; };
    const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); setFile(event.dataTransfer.files[0] ?? null); };
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) return;
        if (!form.name.trim()) { setMessage('Asset Name is required.'); return; }
        if (!editingAsset && !form.file) { setMessage('Choose a file to upload.'); return; }
        setIsSaving(true);
        try {
            const created = await saveAsset(user.id, form, editingAsset ?? undefined);
            if (editingAsset) {
                const updated: Asset = { ...editingAsset, name: form.name.trim(), description: form.description, authorization: form.authorization, ...(form.file ? { type: form.file.type || 'application/octet-stream', size: form.file.size } : {}) };
                onSaved(updated, true);
                setMessage('Asset updated.');
            } else if (created) {
                onSaved(created, false);
                setMessage('Asset uploaded.');
            }
            onClose();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save asset.'); }
        finally { setIsSaving(false); }
    };
    return (
        <Modal 
            isOpen 
            title={editingAsset ? 'Edit asset' : 'Upload asset'} 
            onClose={onClose} 
            footer={<>
                <button type="button" onClick={onClose}>Cancel</button>
                <button type="submit" form="asset-form" disabled={isSaving}>{isSaving ? 'Savingâ€¦' : editingAsset ? 'Save changes' : 'Upload asset'}</button>
            </>}>
            <form id="asset-form" className="asset-editor" onSubmit={(event) => void handleSubmit(event)}>
                <label>Asset Name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                <label>Description
                    <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />                        
                </label>
                <label>Authorization
                    <select 
                        value={form.authorization} 
                        onChange={(event) => setForm((current) => ({ ...current, authorization: event.target.value as Authorization }))}>
                            <option value="INTERNAL">Internal</option>
                            <option value="PUBLIC">Public</option>
                    </select>
                </label>
                <input ref={fileInputRef} className="file-input" type="file" onChange={handleFileChange} />
                <div className={`upload-dropzone asset-file-dropzone${isDragging ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
                    <strong>{form.file ? form.file.name : editingAsset ? 'Replace file (optional)' : 'Choose a file'}</strong>
                    <span>Drag a file here or 
                        <button type="button" onClick={() => fileInputRef.current?.click()}>browse</button>
                         up to 1 GB
                    </span>
                </div>
            </form>
        </Modal>
    );
}
