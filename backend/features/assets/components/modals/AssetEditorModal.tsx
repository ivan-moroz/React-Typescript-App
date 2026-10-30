import { ERROR_MESSAGES } from "../../../../../src/constants/errors";
import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import Modal from "../../../../../src/components/modal/Modal";
import type { ModalControls } from "../../../../../src/components/modal/ModalProvider";
import {
	Asset,
	AssetForm,
	AuthenticatedUser,
	Authorization,
	EMPTY_FORM,
	MAX_FILE_SIZE,
	saveAsset,
} from "../../assetHelpers";
type Props = ModalControls & {
	user: AuthenticatedUser;
	editingAsset?: Asset;
	onSaved: (asset: Asset, editing: boolean) => void;
	setMessage: (message: string) => void;
};
export default function AssetEditorModal({
	user,
	editingAsset,
	onSaved,
	setMessage,
	onClose,
}: Props) {
	const [isDragging, setIsDragging] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [form, setForm] = useState<AssetForm>(() =>
		editingAsset
			? {
					name: editingAsset.name,
					description: editingAsset.description,
					authorization: editingAsset.authorization,
					file: null,
				}
			: EMPTY_FORM,
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const setFile = (file: File | null) => {
		if (!file) return;
		if (file.size > MAX_FILE_SIZE) {
			setMessage(ERROR_MESSAGES.ASSET_FILE_TOO_LARGE);
			return;
		}
		setForm((current) => ({
			...current,
			file,
			name: current.name || file.name,
		}));
	};
	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		setFile(event.target.files?.[0] ?? null);
		event.target.value = "";
	};
	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		setFile(event.dataTransfer.files[0] ?? null);
	};
	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!user) return;
		if (!form.name.trim()) {
			setMessage(ERROR_MESSAGES.ASSET_NAME_REQUIRED);
			return;
		}
		if (!editingAsset && !form.file) {
			setMessage(ERROR_MESSAGES.ASSET_FILE_REQUIRED);
			return;
		}
		setIsSaving(true);
		const result = await saveAsset(
			user.id,
			form,
			editingAsset ?? undefined,
		);
		setIsSaving(false);
		if (!result.success) {
			setMessage(result.error.message);
			return;
		}
		const created = result.data;
		if (editingAsset) {
			const updated: Asset = {
				...editingAsset,
				name: form.name.trim(),
				description: form.description,
				authorization: form.authorization,
				...(form.file
					? {
							type:
								form.file.type ||
								"application/octet-stream",
							size: form.file.size,
						}
					: {}),
			};
			onSaved(updated, true);
			setMessage("Asset updated.");
		} else if (created) {
			onSaved(created, false);
			setMessage("Asset uploaded.");
		}
		onClose();
	};
	return (
		<Modal
			isOpen
			title={editingAsset ? "Edit asset" : "Upload asset"}
			onClose={onClose}
			footer={
				<>
					<button type="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" form="asset-form" disabled={isSaving}>
						{isSaving
							? "Saving..."
							: editingAsset
								? "Save changes"
								: "Upload asset"}
					</button>
				</>
			}
		>
			<form
				id="asset-form"
				className="asset-editor"
				onSubmit={(event) => void handleSubmit(event)}
			>
				<label>
					Asset Name
					<input
						value={form.name}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								name: event.target.value,
							}))
						}
						required
					/>
				</label>
				<label>
					Description
					<textarea
						value={form.description}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								description: event.target.value,
							}))
						}
					/>
				</label>
				<label>
					Authorization
					<select
						value={form.authorization}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								authorization: event.target
									.value as Authorization,
							}))
						}
					>
						<option value="INTERNAL">Internal</option>
						<option value="PUBLIC">Public</option>
					</select>
				</label>
				<input
					ref={fileInputRef}
					className="file-input"
					type="file"
					onChange={handleFileChange}
				/>
				<div
					className={`upload-dropzone asset-file-dropzone${isDragging ? " is-dragging" : ""}`}
					onDragEnter={(event) => {
						event.preventDefault();
						setIsDragging(true);
					}}
					onDragOver={(event) => event.preventDefault()}
					onDragLeave={() => setIsDragging(false)}
					onDrop={handleDrop}
				>
					<strong>
						{form.file
							? form.file.name
							: editingAsset
								? "Replace file (optional)"
								: "Choose a file"}
					</strong>
					<span>
						Drag a file here or
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
						>
							browse
						</button>
						up to 1 GB
					</span>
				</div>
			</form>
		</Modal>
	);
}
