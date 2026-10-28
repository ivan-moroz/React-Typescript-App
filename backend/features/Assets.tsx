import { fetchData } from "../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../src/constants/errors";
import { useEffect, useMemo, useState } from "react";

import ConfirmationModal from "../../src/components/modal/ConfirmationModal";
import { useModal } from "../../src/components/modal/useModal";
import AssetCard from "./assets/components/AssetCard";
import AssetEditorModal from "./assets/components/modals/AssetEditorModal";
import AssetPreviewModal from "./assets/components/modals/AssetPreviewModal";
import { Asset, AuthenticatedUser, getCurrentUser } from "./assets/assetHelpers";

export type AssetsPageProps = { initialAssets?: Asset[]; initialUser?: AuthenticatedUser | null; initialError?: string };

export default function AssetsPage({ initialAssets, initialUser, initialError = "" }: AssetsPageProps) {
	const [assets, setAssets] = useState<Asset[]>(initialAssets ?? []);
	const [isLoading, setIsLoading] = useState(initialAssets === undefined);
	const [message, setMessage] = useState(initialError);
	const { openModal } = useModal();
	const user = useMemo(() => initialUser === undefined ? getCurrentUser() : initialUser, [initialUser]);

	useEffect(() => {
		if (initialAssets !== undefined) return;
		if (!user) {
			setMessage(ERROR_MESSAGES.LOGIN_REQUIRED);
			setIsLoading(false);
			return;
		}
		const loadAssets = async () => {
			const result = await fetchData<Asset[]>(`/api/assets?userId=${user.id}`, {
				errorMessage: ERROR_MESSAGES.ASSETS_FETCH_FAILED,
			});
			setIsLoading(false);
			if (result.success) setAssets(result.data);
			else setMessage(result.error.message);
		};
		void loadAssets();
	}, [user, initialAssets]);

	const onSaved = (saved: Asset, editing: boolean) => {
		setAssets((current) =>
			editing
				? current.map((asset) =>
						asset.id === saved.id ? saved : asset,
					)
				: [saved, ...current],
		);
	};
	const openUpload = () => {
		if (user) openModal(AssetEditorModal, { user, onSaved, setMessage });
	};
	const openEdit = (asset: Asset) => {
		if (user)
			openModal(AssetEditorModal, {
				user,
				editingAsset: asset,
				onSaved,
				setMessage,
			});
	};
	const openPreview = (asset: Asset) => {
		if (user)
			openModal(AssetPreviewModal, {
				previewAsset: asset,
				user,
				openEdit,
			});
	};
	const handleDelete = async (id: string) => {
		if (!user) return;
		setMessage("");
		const result = await fetchData(`/api/assets/${id}`, {
			responseType: "void",
			errorMessage: ERROR_MESSAGES.ASSET_REMOVE_FAILED,
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId: user.id }),
		});
		if (!result.success) throw result.error;
		setAssets((current) => current.filter((asset) => asset.id !== id));
		setMessage("Asset removed.");
	};
	const openDelete = (asset: Asset) =>
		openModal(ConfirmationModal, {
			title: "Delete asset",
			message: `Are you sure you want to delete asset ${asset.name}?`,
			confirmLabel: "Delete",
			onConfirm: () => handleDelete(asset.id),
		});
	const previewUrl = (id: string) =>
		user ? `/api/assets/${id}?userId=${user.id}` : "";
	const downloadUrl = (id: string) =>
		user ? `/api/assets/${id}?userId=${user.id}&download=1` : "";

	return (
		<main className="assets-page">
			<section className="assets-heading">
				<div>
					<p className="eyebrow">Asset Management</p>
					<h1>Your assets</h1>
					{!user ? null : (
						<p>
							Upload, preview, download, and manage every file you
							add.
						</p>
					)}
				</div>
				{!user ? null : (
					<button
						className="upload-button"
						type="button"
						disabled={!user}
						onClick={openUpload}
					>
						Upload assets
					</button>
				)}
			</section>
			{message && (
				<p className="asset-message" role="status">
					{message}
				</p>
			)}
			{!user ? null : (
				<section
					className="asset-library"
					aria-labelledby="asset-library-title"
				>
					<div className="library-heading">
						<div>
							<h2 id="asset-library-title">Asset library</h2>
							<p>
								{assets.length} asset
								{assets.length === 1 ? "" : "s"} available to{" "}
								{user?.name ?? "your account"}
							</p>
						</div>
					</div>
					{isLoading ? (
						<p className="asset-empty">Loading assets…</p>
					) : assets.length === 0 ? (
						<div className="asset-empty">
							<strong>No assets yet</strong>
							<span>Upload a file to build your library.</span>
						</div>
					) : (
						<div className="asset-grid">
							{assets.map((asset) => (
								<AssetCard
									key={asset.id}
									asset={asset}
									previewUrl={previewUrl(asset.id)}
									downloadUrl={downloadUrl(asset.id)}
									isOwner={asset.userId === user?.id}
									onOpen={() => openPreview(asset)}
									onEdit={() => openEdit(asset)}
									onDelete={() => openDelete(asset)}
								/>
							))}
						</div>
					)}
				</section>
			)}
		</main>
	);
}
