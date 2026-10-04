import { apiClient } from './client';

export type WorkspaceRole = 'owner' | 'admin' | 'analyst';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  role?: WorkspaceRole;
  business_count?: number;
}

export interface AuthProfileResponse {
  user: {
    id: string;
    auth_provider_id: string;
    email: string;
    name: string | null;
    created_at: string;
  };
  workspaces: Array<Workspace & { role: WorkspaceRole }>;
  businesses: Business[];
}

export interface Business {
  id: string;
  name: string;
  workspace_id: string;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  description?: string | null;
  sentiment_score?: number | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorkspacePayload {
  name: string;
}

export interface CreateBusinessPayload {
  name: string;
  workspace_id?: string;
  industry?: string;
  website?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
  description?: string;
}

export const workspaceApi = {
  async getAuthProfile(): Promise<AuthProfileResponse> {
    return apiClient.get<AuthProfileResponse>('/v1/auth/me');
  },

  async listWorkspaces(): Promise<Array<Workspace & { role: WorkspaceRole }>> {
    return apiClient.get<Array<Workspace & { role: WorkspaceRole }>>('/v1/workspaces');
  },

  async createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    return apiClient.post<Workspace>('/v1/workspaces', payload);
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return apiClient.get<Workspace>(`/v1/workspaces/${workspaceId}`, { workspaceId });
  },

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return apiClient.get<WorkspaceMember[]>(`/v1/workspaces/${workspaceId}/members`, { workspaceId });
  },

  async addMember(workspaceId: string, email: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    return apiClient.post<WorkspaceMember>(
      `/v1/workspaces/${workspaceId}/members`,
      { email, role },
      { workspaceId }
    );
  },

  async listWorkspaceBusinesses(workspaceId: string): Promise<Business[]> {
    return apiClient.get<Business[]>(`/v1/workspaces/${workspaceId}/businesses`, { workspaceId });
  },

  async createWorkspaceBusiness(workspaceId: string, payload: CreateBusinessPayload): Promise<Business> {
    return apiClient.post<Business>(
      `/v1/workspaces/${workspaceId}/businesses`,
      payload,
      { workspaceId }
    );
  },
};
