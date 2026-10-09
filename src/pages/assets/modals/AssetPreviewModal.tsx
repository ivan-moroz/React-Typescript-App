import Modal from '../../../components/modal/Modal';
import type {ModalControls} from '../../../components/modal/ModalProvider';
import type {Asset, AuthenticatedUser} from '../assetHelpers';
import '../../../styles/assets.scss';
type Props = ModalControls & {previewAsset: Asset; user: AuthenticatedUser; openEdit: (asset: Asset) => void};
export default function AssetPreviewModal({previewAsset, user, openEdit, onClose}: Props) {
    const previewUrl = (id: string) => `/api/assets/${id}?userId=${user.id}`;
    const downloadUrl = (id: string) => `${previewUrl(id)}&download=1`;
    return (
        <Modal isOpen title={previewAsset.name ?? 'Asset preview'} onClose={onClose} footer={previewAsset && <><a href={downloadUrl(previewAsset.id)} download={previewAsset.name}>Download</a>{previewAsset.userId === user.id && <button type="button" onClick={() => openEdit(previewAsset)}>Edit</button>}<button type="button" onClick={onClose}>Close</button></>}>
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
    );
}
