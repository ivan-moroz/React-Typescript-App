import type { Asset } from "../assetHelpers";

function formatSize(size: number): string {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function assetKind(type: string): string {
	if (type.startsWith("image/")) return "Image";
	if (type.startsWith("video/")) return "Video";
	if (type.startsWith("audio/")) return "Audio";
	if (type === "application/pdf") return "PDF";
	return "File";
}

export default function AssetCard({
	asset,
	previewUrl,
	downloadUrl,
	isOwner,
	onOpen,
	onEdit,
	onDelete,
}: {
	asset: Asset;
	previewUrl: string;
	downloadUrl: string;
	isOwner: boolean;
	onOpen: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<article className="asset-card">
			<div className="asset-preview">
				<button
					type="button"
					onClick={onOpen}
					aria-label={`Open ${asset.name}`}
				>
					{asset.type.startsWith("image/") ? (
						<img src={previewUrl} alt={asset.name} />
					) : (
						<span>{assetKind(asset.type)}</span>
					)}
				</button>
			</div>
			<div className="asset-details">
				<h3 title={asset.name}>{asset.name}</h3>
				<p>
					{assetKind(asset.type)} · {formatSize(asset.size)}
				</p>
				<p
					className={`asset-authorization is-${asset.authorization.toLowerCase()}`}
				>
					{asset.authorization === "PUBLIC" ? "Public" : "Internal"}
				</p>
				<time dateTime={asset.createdAt}>
					Added {new Date(asset.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}
				</time>
				<div className="asset-actions">
					<button
						type="button"
						className="asset-open-button"
						onClick={onOpen}
					>
						Open
					</button>
					<a href={downloadUrl} download={asset.name}>
						Download
					</a>
					{isOwner && (
						<>
							<button
								type="button"
								className="asset-open-button"
								onClick={onEdit}
							>
								Edit
							</button>
							<button type="button" onClick={onDelete}>
								Delete
							</button>
						</>
					)}
				</div>
			</div>
		</article>
	);
}
