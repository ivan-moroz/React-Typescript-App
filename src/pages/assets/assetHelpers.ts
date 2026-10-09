export type Authorization = 'INTERNAL' | 'PUBLIC';
export type Asset = { id: string; name: string; description: string; authorization: Authorization; type: string; size: number; createdAt: string; userId: number };
export type AuthenticatedUser = { id: number; name: string };
export type AssetForm = { name: string; description: string; authorization: Authorization; file: File | null };

export const MAX_FILE_SIZE = 1024 * 1024 * 1024;
export const EMPTY_FORM: AssetForm = { name: '', description: '', authorization: 'INTERNAL', file: null };

export function getCurrentUser(): AuthenticatedUser | null {
    try {
        const user = JSON.parse(sessionStorage.getItem('authenticatedUser') ?? '{}') as Partial<AuthenticatedUser>;
        return typeof user.id === 'number' && Number.isInteger(user.id) && user.id > 0 && typeof user.name === 'string' ? { id: user.id, name: user.name } : null;
    } catch { return null; }
}

export async function responseError(response: Response, fallback: string): Promise<Error> {
    const payload = await response.json().catch(() => null);
    return new Error(typeof payload?.message === 'string' ? payload.message : fallback);
}

export async function saveAsset(userId: number, form: AssetForm, asset?: Asset): Promise<Asset | undefined> {
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

