import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../components/modal/Modal';
import '../styles/Assets.scss';

type Asset = { id: string; name: string; type: string; size: number; createdAt: string };
type AuthenticatedUser = { id: number; name: string };
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

async function readFileAsBase64(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

async function uploadAsset(userId: number, file: File): Promise<Asset> {
    const response = await fetch('/api/assets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: await readFileAsBase64(file) }),
    });
    if (!response.ok) throw await responseError(response, 'Could not upload asset');
    return response.json() as Promise<Asset>;
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
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const user = useMemo(getCurrentUser, []);

    useEffect(() => {
        if (!user) { setMessage('Log in to manage your assets.'); setIsLoading(false); return; }
        fetch(`/api/assets?userId=${user.id}`)
            .then(async (response) => { if (!response.ok) throw await responseError(response, 'Could not load assets'); return response.json() as Promise<Asset[]>; })
            .then(setAssets)
            .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load assets.'))
            .finally(() => setIsLoading(false));
    }, [user]);

    const addFiles = async (files: FileList | File[]) => {
        if (!user) return;
        const selectedFiles = Array.from(files);
        const uploadableFiles = selectedFiles.filter((file) => file.size <= MAX_FILE_SIZE);
        const skipped = selectedFiles.length - uploadableFiles.length;
        if (!uploadableFiles.length) { setMessage('Files must be 10 MB or smaller.'); return; }
        try {
            const uploaded = await Promise.all(uploadableFiles.map((file) => uploadAsset(user.id, file)));
            setAssets((current) => [...uploaded, ...current]);
            setMessage(`${uploaded.length} asset${uploaded.length === 1 ? '' : 's'} uploaded.${skipped ? ` ${skipped} file${skipped === 1 ? ' was' : 's were'} over 10 MB and skipped.` : ''}`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed.'); }
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ''; };
    const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void addFiles(event.dataTransfer.files); };
    const handleDelete = async (id: string) => {
        if (!user) return;
        try {
            const response = await fetch(`/api/assets/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
            if (!response.ok) throw await responseError(response, 'Could not remove asset');
            setAssets((current) => current.filter((asset) => asset.id !== id)); setMessage('Asset removed.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove asset.'); }
    };
    const previewUrl = (id: string) => user ? `/api/assets/${id}?userId=${user.id}` : '';
    const downloadUrl = (id: string) => user ? `/api/assets/${id}?userId=${user.id}&download=1` : '';

    return <main className="assets-page">
        <section className="assets-heading"><div><p className="eyebrow">Asset Management</p><h1>Your assets</h1><p>Upload, preview, download, and manage every file you add.</p></div>
            <button className="upload-button" type="button" disabled={!user} onClick={() => inputRef.current?.click()}>Upload assets</button></section>
        <input ref={inputRef} className="file-input" type="file" multiple onChange={handleFileChange} />
        <div className={`upload-dropzone${isDragging ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
            <div className="upload-icon" aria-hidden="true">↑</div><h2>Drop files here</h2><p>or <button type="button" disabled={!user} onClick={() => inputRef.current?.click()}>browse from your device</button></p><span>Any file type is supported, up to 10 MB.</span>
        </div>
        {message && <p className="asset-message" role="status">{message}</p>}
        <section className="asset-library" aria-labelledby="asset-library-title"><div className="library-heading"><div><h2 id="asset-library-title">Asset library</h2><p>{assets.length} asset{assets.length === 1 ? '' : 's'} saved for {user?.name ?? 'your account'}</p></div></div>
            {isLoading ? <p className="asset-empty">Loading your assets…</p> : assets.length === 0 ? <div className="asset-empty"><strong>No assets yet</strong><span>Upload a file to build your library.</span></div> : <div className="asset-grid">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} previewUrl={previewUrl(asset.id)} downloadUrl={downloadUrl(asset.id)} onOpen={() => setPreviewAsset(asset)} onDelete={handleDelete} />)}</div>}
        </section>
        <Modal
            isOpen={previewAsset !== null}
            title={previewAsset?.name ?? 'Asset preview'}
            onClose={() => setPreviewAsset(null)}
            footer={previewAsset && <><a href={downloadUrl(previewAsset.id)} download={previewAsset.name}>Download</a><button type="button" onClick={() => setPreviewAsset(null)}>Close</button></>}
        >
            {previewAsset && <img className="asset-modal-image" src={previewUrl(previewAsset.id)} alt={previewAsset.name} />}
        </Modal>
    </main>;
}

function AssetCard({ asset, previewUrl, downloadUrl, onOpen, onDelete }: { asset: Asset; previewUrl: string; downloadUrl: string; onOpen: () => void; onDelete: (id: string) => void }) {
    return <article className="asset-card"><div className="asset-preview">{asset.type.startsWith('image/') ? <button type="button" onClick={onOpen} aria-label={`Open ${asset.name}`}><img src={previewUrl} alt={asset.name} /></button> : <span>{assetKind(asset.type)}</span>}</div><div className="asset-details"><h3 title={asset.name}>{asset.name}</h3><p>{assetKind(asset.type)} · {formatSize(asset.size)}</p><time dateTime={asset.createdAt}>Added {new Date(asset.createdAt).toLocaleDateString()}</time><div className="asset-actions"><a href={downloadUrl} download={asset.name}>Download</a>{asset.type.startsWith('image/') && <button type="button" className="asset-open-button" onClick={onOpen}>Open</button>}<button type="button" onClick={() => void onDelete(asset.id)}>Delete</button></div></div></article>;
}
