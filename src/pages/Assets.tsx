import {useEffect, useMemo, useState} from 'react';

import ConfirmationModal from '../components/modal/ConfirmationModal';
import {useModal} from '../components/modal/ModalProvider';
import AssetEditorModal from './assets/modals/AssetEditorModal';
import AssetPreviewModal from './assets/modals/AssetPreviewModal';
import {Asset, getCurrentUser, responseError} from './assets/assetHelpers';
import '../styles/assets.scss';

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
    const [message, setMessage] = useState('');
    const {openModal} = useModal();
    const user = useMemo(getCurrentUser, []);

    useEffect(() => {
        if (!user) { setMessage('Log in to manage your assets.'); setIsLoading(false); return; }
        fetch(`/api/assets?userId=${user.id}`)
            .then(async (response) => { if (!response.ok) throw await responseError(response, 'Could not load assets'); return response.json() as Promise<Asset[]>; })
            .then(setAssets)
            .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load assets.'))
            .finally(() => setIsLoading(false));
    }, [user]);

    const onSaved = (saved: Asset, editing: boolean) => {
        setAssets((current) => editing ? current.map((asset) => asset.id === saved.id ? saved : asset) : [saved, ...current]);
    };
    const openUpload = () => { if (user) openModal(AssetEditorModal, {user, onSaved, setMessage}); };
    const openEdit = (asset: Asset) => { if (user) openModal(AssetEditorModal, {user, editingAsset: asset, onSaved, setMessage}); };
    const openPreview = (asset: Asset) => { if (user) openModal(AssetPreviewModal, {previewAsset: asset, user, openEdit}); };
    const handleDelete = async (id: string) => {
        if (!user) return;
        setMessage('');
        const response = await fetch(`/api/assets/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
        if (!response.ok) throw await responseError(response, 'Could not remove asset');
        setAssets((current) => current.filter((asset) => asset.id !== id));
        setMessage('Asset removed.');
    };
    const openDelete = (asset: Asset) => openModal(ConfirmationModal, {
        title: 'Delete asset',
        message: `Are you sure you want to delete asset ${asset.name}?`,
        confirmLabel: 'Delete',
        onConfirm: () => handleDelete(asset.id),
    });
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
            {isLoading ? <p className="asset-empty">Loading assets…</p> : assets.length === 0 ? <div className="asset-empty"><strong>No assets yet</strong><span>Upload a file to build your library.</span></div> : <div className="asset-grid">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} previewUrl={previewUrl(asset.id)} downloadUrl={downloadUrl(asset.id)} isOwner={asset.userId === user?.id} onOpen={() => openPreview(asset)} onEdit={() => openEdit(asset)} onDelete={() => openDelete(asset)} />)}</div>}
        </section>
        }
    </main>;
}

function AssetCard({ asset, previewUrl, downloadUrl, isOwner, onOpen, onEdit, onDelete }: { asset: Asset; previewUrl: string; downloadUrl: string; isOwner: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
    return <article className="asset-card"><div className="asset-preview"><button type="button" onClick={onOpen} aria-label={`Open ${asset.name}`}>{asset.type.startsWith('image/') ? <img src={previewUrl} alt={asset.name} /> : <span>{assetKind(asset.type)}</span>}</button></div><div className="asset-details"><h3 title={asset.name}>{asset.name}</h3><p>{assetKind(asset.type)} · {formatSize(asset.size)}</p><p className={`asset-authorization is-${asset.authorization.toLowerCase()}`}>{asset.authorization === 'PUBLIC' ? 'Public' : 'Internal'}</p><time dateTime={asset.createdAt}>Added {new Date(asset.createdAt).toLocaleDateString()}</time><div className="asset-actions"><button type="button" className="asset-open-button" onClick={onOpen}>Open</button><a href={downloadUrl} download={asset.name}>Download</a>{isOwner && <><button type="button" className="asset-open-button" onClick={onEdit}>Edit</button><button type="button" onClick={onDelete}>Delete</button></>}</div></div></article>;
}
