import { fetchData, type FetchResult } from "../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../src/constants/errors";
export type Authorization = "INTERNAL" | "PUBLIC";
export type Asset = {
	id: string;
	name: string;
	description: string;
	authorization: Authorization;
	type: string;
	size: number;
	createdAt: string;
	userId: number;
};
export type AuthenticatedUser = { id: number; name: string };
export type AssetForm = {
	name: string;
	description: string;
	authorization: Authorization;
	file: File | null;
};

export const MAX_FILE_SIZE = 1024 * 1024 * 1024;
export const EMPTY_FORM: AssetForm = {
	name: "",
	description: "",
	authorization: "INTERNAL",
	file: null,
};

export function getCurrentUser(): AuthenticatedUser | null {
	try {
		const user = JSON.parse(
			sessionStorage.getItem("authenticatedUser") ?? "{}",
		) as Partial<AuthenticatedUser>;
		return typeof user.id === "number" &&
			Number.isInteger(user.id) &&
			user.id > 0 &&
			typeof user.name === "string"
			? { id: user.id, name: user.name }
			: null;
	} catch {
		return null;
	}
}

export async function saveAsset(
	userId: number,
	form: AssetForm,
	asset?: Asset,
): Promise<FetchResult<Asset | undefined>> {
	const replacement = form.file
		? {
				originalFileName: form.file.name,
				type: form.file.type || "application/octet-stream",
				size: form.file.size,
			}
		: {};
	const options = {
		method: asset ? "PUT" : "POST",
		errorMessage: asset ? ERROR_MESSAGES.ASSET_UPDATE_FAILED : ERROR_MESSAGES.ASSET_CREATE_FAILED,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			userId,
			name: form.name,
			description: form.description,
			authorization: form.authorization,
			...replacement,
		}),
	};
	let saved: Asset;
	if (asset) {
		const result = await fetchData(`/api/assets/${asset.id}`, { ...options, responseType: "void" });
		if (!result.success) return result;
		saved = asset;
	} else {
		const result = await fetchData<Asset>("/api/assets", options);
		if (!result.success) return result;
		saved = result.data;
	}
	if (form.file) {
		const upload = await fetchData(
			`/api/assets/${saved.id}/file?userId=${userId}`,
			{
				method: "PUT",
				responseType: "void",
				errorMessage: ERROR_MESSAGES.ASSET_FILE_UPLOAD_FAILED,
				headers: {
					"Content-Type":
						form.file.type || "application/octet-stream",
				},
				body: form.file,
			},
		);
		if (!upload.success) return upload;
	}
	return { success: true, data: asset ? undefined : saved };
}
