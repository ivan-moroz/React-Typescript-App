import { ERROR_MESSAGES, HTTP_ERROR_MESSAGES, HttpError } from '../constants/errors';

export type FetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error & { status?: number } };

type ResponseType = 'json' | 'text' | 'blob' | 'response' | 'void';
export type FetchDataOptions = RequestInit & {
  responseType?: ResponseType;
  errorMessage?: string;
};

export function fetchData(input: RequestInfo | URL, options: FetchDataOptions & { responseType: 'void' }): Promise<FetchResult<void>>;
export function fetchData(input: RequestInfo | URL, options: FetchDataOptions & { responseType: 'response' }): Promise<FetchResult<Response>>;
export function fetchData(input: RequestInfo | URL, options: FetchDataOptions & { responseType: 'text' }): Promise<FetchResult<string>>;
export function fetchData(input: RequestInfo | URL, options: FetchDataOptions & { responseType: 'blob' }): Promise<FetchResult<Blob>>;
export function fetchData<T = unknown>(input: RequestInfo | URL, options?: FetchDataOptions & { responseType?: 'json' }): Promise<FetchResult<T>>;
export async function fetchData(input: RequestInfo | URL, options: FetchDataOptions = {}): Promise<FetchResult<unknown>> {
  const { responseType = 'json', errorMessage = ERROR_MESSAGES.REQUEST_FAILED, ...requestOptions } = options;
  try {
    const response = Object.keys(requestOptions).length
      ? await fetch(input, requestOptions)
      : await fetch(input);

    if (!response.ok) {
      let message = HTTP_ERROR_MESSAGES[response.status] ?? errorMessage;
      try {
        const payload: unknown = await response.json();
        if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' && payload.message.trim()) {
          message = payload.message;
        }
      } catch {
        // Non-JSON errors use the status message or the caller's fallback.
      }
      throw new HttpError(response.status, message);
    }

    let data: unknown;
    if (responseType === 'response') data = response;
    else if (responseType === 'void' || response.status === 204 || response.status === 205) data = undefined;
    else if (responseType === 'text') data = await response.text();
    else if (responseType === 'blob') data = await response.blob();
    else data = await response.json();
    return { success: true, data };
  } catch (error) {
    const isError = error instanceof Error || (typeof DOMException !== 'undefined' && error instanceof DOMException);
    return { success: false, error: isError ? error : new Error(errorMessage) };
  }
}
