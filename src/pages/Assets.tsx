import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/Assets.scss';

type Asset = {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: string;
    file: File;
};

const DATABASE_NAME = 'asset-management';
const STORE_NAME = 'assets';

function getOwner(): string {
    try {
        const user = JSON.parse(sessionStorage.getItem('authenticatedUser') ?? '{}') as { name?: string };
        return user.name?.trim() || 'Guest';
    } catch {
        return 'Guest';
    }
}

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('owner', 'owner', { unique: false });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function readAssets(owner: string): Promise<Asset[]> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).index('owner').getAll(owner);
        request.onsuccess = () => {
            database.close();
            resolve((request.result as Asset[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        };
        request.onerror = () => {
            database.close();
            reject(request.error);
        };
    });
}

async function saveAsset(owner: string, asset: Asset): Promise<void> {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ ...asset, owner });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    database.close();
}

async function removeAsset(id: string): Promise<void> {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
    database.close();
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
    const inputRef = useRef<HTMLInputElement>(null);
    const owner = useMemo(getOwner, []);

    useEffect(() => {
        readAssets(owner)
            .then(setAssets)
            .catch(() => setMessage('Your browser could not load saved assets.'))
            .finally(() => setIsLoading(false));
    }, [owner]);

    const addFiles = async (files: FileList | File[]) => {
        const newAssets = Array.from(files).map((file) => ({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            createdAt: new Date().toISOString(),
            file,
        }));

        if (!newAssets.length) return;
        try {
            await Promise.all(newAssets.map((asset) => saveAsset(owner, asset)));
            setAssets((current) => [...newAssets, ...current]);
            setMessage(`${newAssets.length} asset${newAssets.length === 1 ? '' : 's'} uploaded.`);
        } catch {
            setMessage('Upload failed. Your browser storage may be full.');
        }
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) void addFiles(event.target.files);
        event.target.value = '';
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        void addFiles(event.dataTransfer.files);
    };

    const handleDelete = async (id: string) => {
        try {
            await removeAsset(id);
            setAssets((current) => current.filter((asset) => asset.id !== id));
            setMessage('Asset removed.');
        } catch {
            setMessage('Could not remove this asset.');
        }
    };

    return (
        <main className="assets-page">
            <section className="assets-heading">
                <div>
                    <p className="eyebrow">Asset Management</p>
                    <h1>Your assets</h1>
                    <p>Upload, preview, download, and manage every file you add.</p>
                </div>
                <button className="upload-button" type="button" onClick={() => inputRef.current?.click()}>
                    Upload assets
                </button>
            </section>

            <input ref={inputRef} className="file-input" type="file" multiple onChange={handleFileChange} />

            <div
                className={`upload-dropzone${isDragging ? ' is-dragging' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <div className="upload-icon" aria-hidden="true">↑</div>
                <h2>Drop files here</h2>
                <p>or <button type="button" onClick={() => inputRef.current?.click()}>browse from your device</button></p>
                <span>Any file type is supported</span>
            </div>

            {message && <p className="asset-message" role="status">{message}</p>}

            <section className="asset-library" aria-labelledby="asset-library-title">
                <div className="library-heading">
                    <div>
                        <h2 id="asset-library-title">Asset library</h2>
                        <p>{assets.length} asset{assets.length === 1 ? '' : 's'} saved for {owner}</p>
                    </div>
                </div>

                {isLoading ? <p className="asset-empty">Loading your assets…</p> : assets.length === 0 ? (
                    <div className="asset-empty">
                        <strong>No assets yet</strong>
                        <span>Upload a file to build your library.</span>
                    </div>
                ) : (
                    <div className="asset-grid">
                        {assets.map((asset) => <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />)}
                    </div>
                )}
            </section>
        </main>
    );
}

function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: (id: string) => void }) {
    const previewUrl = useMemo(() => URL.createObjectURL(asset.file), [asset.file]);
    const isImage = asset.type.startsWith('image/');

    useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

    return (
        <article className="asset-card">
            <div className="asset-preview">
                {isImage ? <img src={previewUrl} alt={asset.name} /> : <span>{assetKind(asset.type)}</span>}
            </div>
            <div className="asset-details">
                <h3 title={asset.name}>{asset.name}</h3>
                <p>{assetKind(asset.type)} · {formatSize(asset.size)}</p>
                <time dateTime={asset.createdAt}>Added {new Date(asset.createdAt).toLocaleDateString()}</time>
                <div className="asset-actions">
                    <a href={previewUrl} download={asset.name}>Download</a>
                    <button type="button" onClick={() => void onDelete(asset.id)}>Delete</button>
                </div>
            </div>
        </article>
    );
}
