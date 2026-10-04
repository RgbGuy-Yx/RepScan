export interface ApiRequestOptions extends RequestInit {
  workspaceId?: string;
}

class ApiClient {
  private baseUrl: string;
  private tokenProvider: (() => Promise<string | null> | string | null) | null = null;
  private currentWorkspaceId: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  public setTokenProvider(provider: () => Promise<string | null> | string | null) {
    this.tokenProvider = provider;
  }

  public setWorkspaceId(workspaceId: string | null) {
    this.currentWorkspaceId = workspaceId;
  }

  public getWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }

  public async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach Clerk token if available
    if (this.tokenProvider) {
      try {
        const token = await this.tokenProvider();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch (err) {
        console.warn('Failed to retrieve auth token for request:', err);
      }
    }

    // Attach workspace context header if present
    const workspaceId = options.workspaceId || this.currentWorkspaceId;
    if (workspaceId && !headers.has('x-workspace-id')) {
      headers.set('x-workspace-id', workspaceId);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Unauthenticated
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Unauthorized: Please sign in to continue.');
    }

    if (response.status === 403) {
      // Forbidden (e.g. cross-workspace access or insufficient permissions)
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Forbidden: You do not have permission to perform this action.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  public get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public patch<T>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public async downloadBlob(endpoint: string, options: ApiRequestOptions = {}): Promise<Blob> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (this.tokenProvider) {
      try {
        const token = await this.tokenProvider();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch (err) {
        console.warn('Failed to retrieve auth token for download:', err);
      }
    }

    const workspaceId = options.workspaceId || this.currentWorkspaceId;
    if (workspaceId && !headers.has('x-workspace-id')) {
      headers.set('x-workspace-id', workspaceId);
    }

    const response = await fetch(url, { ...options, headers, method: 'GET' });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    return response.blob();
  }
}

export const apiClient = new ApiClient();
