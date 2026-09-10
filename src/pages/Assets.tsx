import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../components/modal/Modal';
import '../styles/Assets.scss';

type Authorization = 'INTERNAL' | 'PUBLIC';
type Asset = { id: string; name: string; description: string; authorization: Authorization; type: string; size: number; createdAt: string; userId: number };
type AuthenticatedUser = { id: number; name: string };
type AssetForm = { name: string; description: string; authorization: Authorization; file: File | null };

const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const EMPTY_FORM: AssetForm = { name: '', description: '', authorization: 'INTERNAL', file: null };

function getCurrentUser(): AuthenticatedUser | null {
    try {
        const user = JSON.parse(sessionStorage.getItem('authenticatedUser') ?? '{}') as Partial<AuthenticatedUser>;
        return typeof user.id === 'number' && Number.isInteger(user.id) && user.id > 0 && typeof user.name === 'string' ? { id: user.id, name: user.name } : null;
    } catch { return null; }
}

async function responseError(response: Response, fallback: string): Promise<Error> {
    const payload = await response.json().catch(() => null);
    return new Error(typeof payload?.message === 'string' ? payload.message : fallback);
}

async function saveAsset(userId: number, form: AssetForm, asset?: Asset): Promise<Asset | undefined> {
    const replacement = form.file ? { originalFileName: form.file.name, type: form.file.type || 'application/octet-stream', size: form.file.size } : {};
    const response = await fetch(asset ? `/api/assets/${asset.id}` : '/api/assets', {
        method: asset ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: form.name, description: form.description, authorization: form.authorization, ...replacement }),
    });
    if (!response.ok) throw await responseError(response, asset ? 'Could not update asset' : 'Could not create asset');
    const saved = asset ? asset : await response.json() as Asset;
    if (form.file) {
        const upload = await fetch(`/api/assets/${saved.id}/file?userId=${userId}`, { method: 'PUT', headers: { 'Content-Type': form.file.type || 'application/octet-stream' }, body: form.file });
        if (!upload.ok) throw await responseError(upload, 'Could not upload file');
    }
    return asset ? undefined : saved;
}

function formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function assetKind(type: string): string {
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Audio';
    if (type === 'application/pdf') return 'PDF';
    return 'File';
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [message, setMessage] = useState('');
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<AssetForm>(EMPTY_FORM);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const user = useMemo(getCurrentUser, []);

    useEffect(() => {
        if (!user) { setMessage('Log in to manage your assets.'); setIsLoading(false); return; }
        fetch(`/api/assets?userId=${user.id}`)
            .then(async (response) => { if (!response.ok) throw await responseError(response, 'Could not load assets'); return response.json() as Promise<Asset[]>; })
            .then(setAssets)
            .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load assets.'))
            .finally(() => setIsLoading(false));
    }, [user]);

    const closeEditor = () => { setIsEditorOpen(false); setEditingAsset(null); setForm(EMPTY_FORM); setIsDragging(false); };
    const openUpload = () => { setEditingAsset(null); setForm(EMPTY_FORM); setIsEditorOpen(true); };
    const openEdit = (asset: Asset) => {
        setPreviewAsset(null);
        setEditingAsset(asset);
        setForm({ name: asset.name, description: asset.description, authorization: asset.authorization, file: null });
        setIsEditorOpen(true);
    };
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
                setAssets((current) => current.map((asset) => asset.id === updated.id ? updated : asset));
                setPreviewAsset((current) => current?.id === updated.id ? updated : current);
                setMessage('Asset updated.');
            } else if (created) {
                setAssets((current) => [created, ...current]);
                setMessage('Asset uploaded.');
            }
            closeEditor();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save asset.'); }
        finally { setIsSaving(false); }
    };
    const handleDelete = async (id: string) => {
        if (!user) return;
        try {
            const response = await fetch(`/api/assets/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
            if (!response.ok) throw await responseError(response, 'Could not remove asset');
            setAssets((current) => current.filter((asset) => asset.id !== id)); setPreviewAsset(null); setMessage('Asset removed.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove asset.'); }
    };
    const previewUrl = (id: string) => user ? `/api/assets/${id}?userId=${user.id}` : '';
    const downloadUrl = (id: string) => user ? `/api/assets/${id}?userId=${user.id}&download=1` : '';

    return <main className="assets-page">
        <section className="assets-heading">
            <div>
                <p className="eyebrow">Asset Management</p>
                <h1>Your assets</h1>
                {!user ? null : <p>Upload, preview, download, and manage every file you add.</p>}
            </div>
            {!user ? null : <button className="upload-button" type="button" disabled={!user} onClick={openUpload}>Upload assets</button>}
        </section>
        {message && <p className="asset-message" role="status">{message}</p>}
        {!user ? null : 
        <section className="asset-library" aria-labelledby="asset-library-title"><div className="library-heading"><div><h2 id="asset-library-title">Asset library</h2><p>{assets.length} asset{assets.length === 1 ? '' : 's'} available to {user?.name ?? 'your account'}</p></div></div>
            {isLoading ? <p className="asset-empty">Loading assets…</p> : assets.length === 0 ? <div className="asset-empty"><strong>No assets yet</strong><span>Upload a file to build your library.</span></div> : <div className="asset-grid">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} previewUrl={previewUrl(asset.id)} downloadUrl={downloadUrl(asset.id)} isOwner={asset.userId === user?.id} onOpen={() => setPreviewAsset(asset)} onEdit={() => openEdit(asset)} onDelete={handleDelete} />)}</div>}
        </section>
        }
        <Modal 
            isOpen={isEditorOpen} 
            title={editingAsset ? 'Edit asset' : 'Upload asset'} 
            onClose={closeEditor} 
            footer={<>
                <button type="button" onClick={closeEditor}>Cancel</button>
                <button type="submit" form="asset-form" disabled={isSaving}>{isSaving ? 'Saving…' : editingAsset ? 'Save changes' : 'Upload asset'}</button>
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
                         · up to 1 GB
                    </span>
                </div>
            </form>
        </Modal>
        <Modal isOpen={previewAsset !== null} title={previewAsset?.name ?? 'Asset preview'} onClose={() => setPreviewAsset(null)} footer={previewAsset && <><a href={downloadUrl(previewAsset.id)} download={previewAsset.name}>Download</a>{previewAsset.userId === user?.id && <button type="button" onClick={() => openEdit(previewAsset)}>Edit</button>}<button type="button" onClick={() => setPreviewAsset(null)}>Close</button></>}>
            {previewAsset && <div className="asset-modal-content">{previewAsset.type.startsWith('image/') ? 
                <img className="asset-modal-image" src={previewUrl(previewAsset.id)} alt={previewAsset.name} /> : 
                previewAsset.type.startsWith('video/') ? 
                <video className="asset-modal-video" controls src={previewUrl(previewAsset.id)}>Your browser cannot play this video.</video> : 
                <p>Preview is unavailable for this file type.</p>}
                <dl className="asset-preview-details">
                    <dt>Asset Name</dt>
                    <dd>{previewAsset.name}</dd>
                    <dt>Description</dt>
                    <dd>{previewAsset.description || '—'}</dd>
                    <dt>Authorization</dt>
                    <dd>{previewAsset.authorization === 'PUBLIC' ? 'Public' : 'Internal'}</dd>
                </dl>
            </div>}
        </Modal>
    </main>;
}

function AssetCard({ asset, previewUrl, downloadUrl, isOwner, onOpen, onEdit, onDelete }: { asset: Asset; previewUrl: string; downloadUrl: string; isOwner: boolean; onOpen: () => void; onEdit: () => void; onDelete: (id: string) => void }) {
    return <article className="asset-card"><div className="asset-preview"><button type="button" onClick={onOpen} aria-label={`Open ${asset.name}`}>{asset.type.startsWith('image/') ? <img src={previewUrl} alt={asset.name} /> : <span>{assetKind(asset.type)}</span>}</button></div><div className="asset-details"><h3 title={asset.name}>{asset.name}</h3><p>{assetKind(asset.type)} · {formatSize(asset.size)}</p><p className={`asset-authorization is-${asset.authorization.toLowerCase()}`}>{asset.authorization === 'PUBLIC' ? 'Public' : 'Internal'}</p><time dateTime={asset.createdAt}>Added {new Date(asset.createdAt).toLocaleDateString()}</time><div className="asset-actions"><button type="button" className="asset-open-button" onClick={onOpen}>Open</button><a href={downloadUrl} download={asset.name}>Download</a>{isOwner && <><button type="button" className="asset-open-button" onClick={onEdit}>Edit</button><button type="button" onClick={() => void onDelete(asset.id)}>Delete</button></>}</div></div></article>;
}
