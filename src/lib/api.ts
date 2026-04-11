/**
 * Centralized API client for Ho-orbit.
 *
 * Currently all service functions use localStorage mock data.
 * When the backend is ready, services swap their implementation
 * to use this client by changing one line:
 *
 *   BEFORE: const data = JSON.parse(localStorage.getItem(key) || '[]');
 *   AFTER:  const data = await api.get<MyType[]>('/my-endpoint');
 *
 * The client reads VITE_API_URL from environment variables.
 * All methods return the parsed JSON body directly, or throw on
 * non-2xx responses.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string,
  ) {
    super(message ?? `API error ${status}: ${statusText}`);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    init.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    // Let browser set multipart Content-Type with boundary
    init.body = body;
    const headers = init.headers as Record<string, string>;
    delete headers['Content-Type'];
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    let message: string | undefined;
    try {
      const errBody = (await response.json()) as Record<string, unknown>;
      message = (errBody?.error as string) ?? (errBody?.message as string);
    } catch {
      // response body not JSON — use status text
    }
    throw new ApiError(response.status, response.statusText, message);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

/**
 * API client methods.
 *
 * Example usage:
 *   const playlists = await api.get<Playlist[]>('/playlists?userId=123');
 *   const newPlaylist = await api.post<Playlist>('/playlists', { name: 'My Playlist', userId: 123 });
 *   await api.delete<void>('/playlists/456');
 */
export const api = {
  /**
   * GET request
   * @example const tracks = await api.get<Track[]>('/tracks');
   */
  get: <T>(path: string, options?: RequestInit): Promise<T> =>
    request<T>('GET', path, undefined, options),

  /**
   * POST request
   * @example const playlist = await api.post<Playlist>('/playlists', { name: 'My Playlist' });
   */
  post: <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>('POST', path, body, options),

  /**
   * PATCH request
   * @example await api.patch('/user/profile', { displayName: 'New Name' });
   */
  patch: <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>('PATCH', path, body, options),

  /**
   * PUT request (full replacement)
   * @example await api.put<Playlist>('/playlists/123', { name: 'Updated Name', trackIds: [...] });
   */
  put: <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>('PUT', path, body, options),

  /**
   * DELETE request
   * @example await api.delete<void>('/playlists/123');
   */
  delete: <T = void>(path: string, options?: RequestInit): Promise<T> =>
    request<T>('DELETE', path, undefined, options),

  /**
   * Multipart file upload
   * Browser automatically sets Content-Type header with boundary.
   * @example const result = await api.upload<Track>('/tracks/upload', formData);
   */
  upload: <T>(path: string, formData: FormData, options?: RequestInit): Promise<T> =>
    request<T>('POST', path, formData, options),
};
