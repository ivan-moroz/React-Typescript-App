import { fetchData } from './fetchData';
import { ERROR_MESSAGES } from '../constants/errors';

afterEach(() => vi.restoreAllMocks());

const statusMessages = [
  [401, ERROR_MESSAGES.UNAUTHORIZED],
  [403, ERROR_MESSAGES.FORBIDDEN],
  [404, ERROR_MESSAGES.NOT_FOUND],
  [500, ERROR_MESSAGES.INTERNAL_SERVER_ERROR],
] as const;

test.each(statusMessages)('handles HTTP %i with a status message and code', async (status, message) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>Error</html>', { status }));
  const result = await fetchData('/api/users', { errorMessage: ERROR_MESSAGES.USERS_LOAD_FAILED });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.message).toBe(message);
    expect(result.error.status).toBe(status);
  }
});

test.each(statusMessages)('preserves the API message for HTTP %i', async (status) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS }, { status }));
  const result = await fetchData('/api/users');
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
    expect(result.error.status).toBe(status);
  }
});

test('uses the status message when the API message is blank', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ message: ' ' }, { status: 500 }));
  const result = await fetchData('/api/users');
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
});

test('returns typed JSON and forwards request options', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 1 }));
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Jane' }) };
  expect(await fetchData<{ id: number }>('/api/users', options)).toEqual({ success: true, data: { id: 1 } });
  expect(fetch).toHaveBeenCalledWith('/api/users', options);
});

test('uses the API error message', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ message: ERROR_MESSAGES.EMAIL_IN_USE }, { status: 409 }));
  const result = await fetchData('/api/users');
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.message).toBe(ERROR_MESSAGES.EMAIL_IN_USE);
});

test('uses the supplied fallback for a non-JSON error response', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>Unavailable</html>', { status: 503 }));
  const result = await fetchData('/api/users', { errorMessage: ERROR_MESSAGES.USERS_LOAD_FAILED });
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.message).toBe(ERROR_MESSAGES.USERS_LOAD_FAILED);
});

test('handles a 204 without parsing JSON', async () => {
  const response = new Response(null, { status: 204 });
  const json = vi.spyOn(response, 'json');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
  expect(await fetchData('/api/auth/logout', { method: 'POST' })).toEqual({ success: true, data: undefined });
  expect(json).not.toHaveBeenCalled();
});

test('preserves raw upload bodies and cancellation signals and ignores an unused response body', async () => {
  const response = new Response('Uploaded');
  const json = vi.spyOn(response, 'json');
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
  const file = new File(['image'], 'photo.png', { type: 'image/png' });
  const signal = new AbortController().signal;
  await fetchData('/api/assets/a1/file', { method: 'PUT', body: file, signal, responseType: 'void' });
  expect(fetch).toHaveBeenCalledWith('/api/assets/a1/file', { method: 'PUT', body: file, signal });
  expect(json).not.toHaveBeenCalled();
});

test('supports text, blob, and raw responses', async () => {
  const raw = new Response('raw');
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('text'))
    .mockResolvedValueOnce(new Response('file'))
    .mockResolvedValueOnce(raw);
  expect(await fetchData('/file', { responseType: 'text' })).toEqual({ success: true, data: 'text' });
  const result = await fetchData('/file', { responseType: 'blob' });
  expect(result.success).toBe(true);
  if (!result.success) throw result.error;
  const blob = result.data;
  expect(blob.size).toBe(4);
  expect(blob.type).toBe('text/plain;charset=utf-8');
  expect(await fetchData('/file', { responseType: 'response' })).toEqual({ success: true, data: raw });
});

test('preserves network and cancellation errors', async () => {
  const error = new DOMException('Aborted', 'AbortError');
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(error);
  expect(await fetchData('/api/users')).toEqual({ success: false, error });
});

test('returns a failure result when a successful response contains invalid JSON', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('invalid JSON'));
  const result = await fetchData('/api/users');
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBeInstanceOf(Error);
});

test('normalizes a non-Error rejection using the supplied fallback', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(null);
  const result = await fetchData('/api/users', { errorMessage: ERROR_MESSAGES.USERS_LOAD_FAILED });
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.message).toBe(ERROR_MESSAGES.USERS_LOAD_FAILED);
});
