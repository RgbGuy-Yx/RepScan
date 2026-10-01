import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { apiClient } from '../api/client';
import {
  workspaceApi,
  type Workspace,
  type WorkspaceRole,
  type Business,
  type CreateBusinessPayload,
} from '../api/workspaceApi';
import { businessApi } from '../api/businessApi';

export interface BusinessContextType {
  // Auth state
  isAuthenticated: boolean;
  isAuthLoaded: boolean;
  userProfile: {
    id: string;
    auth_provider_id: string;
    email: string;
    name: string | null;
  } | null;
  logout: () => Promise<void>;

  // Workspaces
  workspaces: Array<Workspace & { role: WorkspaceRole }>;
  activeWorkspace: (Workspace & { role: WorkspaceRole }) | null;
  activeRole: WorkspaceRole;
  setActiveWorkspace: (workspace: Workspace & { role: WorkspaceRole }) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;

  // Businesses
  businesses: Business[];
  activeBusiness: Business | null;
  setActiveBusiness: (business: Business) => void;
  createBusiness: (payload: CreateBusinessPayload) => Promise<Business>;
  refreshBusinesses: () => Promise<void>;

  // Loading & Onboarding
  isLoading: boolean;
  needsOnboarding: boolean;
  setNeedsOnboarding: (needed: boolean) => void;
  refreshAll: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Core Data Hook shared between Clerk & Dev mode
function useBusinessDataLogic(
  authLoaded: boolean,
  signedIn: boolean,
  clerkGetToken?: () => Promise<string | null>
) {
  const [userProfile, setUserProfile] = useState<BusinessContextType['userProfile']>(null);
  const [workspaces, setWorkspaces] = useState<Array<Workspace & { role: WorkspaceRole }>>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<(Workspace & { role: WorkspaceRole }) | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusinessState] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Set token provider on apiClient
  useEffect(() => {
    if (clerkGetToken) {
      apiClient.setTokenProvider(async () => {
        try {
          return await clerkGetToken();
        } catch {
          return null;
        }
      });
    } else {
      apiClient.setTokenProvider(() => null);
    }
  }, [clerkGetToken]);

  // Synchronize workspace context with apiClient
  useEffect(() => {
    if (activeWorkspace) {
      apiClient.setWorkspaceId(activeWorkspace.id);
    }
  }, [activeWorkspace]);

  // Load auth profile, workspaces and businesses
  const loadProfileAndData = useCallback(async () => {
    if (!signedIn) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [profile, allBusinesses] = await Promise.all([
        workspaceApi.getAuthProfile().catch(() => ({ user: null, workspaces: [] })),
        businessApi.getAllBusinesses().catch(() => []),
      ]);
      setUserProfile(profile.user);
      setWorkspaces(profile.workspaces || []);
      setBusinesses(allBusinesses || []);

      if (allBusinesses && allBusinesses.length > 0) {
        const savedBizId = localStorage.getItem('repscan_active_business_id');
        const matchedBiz =
          allBusinesses.find((b) => b.id === savedBizId) || allBusinesses[0];
        setActiveBusinessState(matchedBiz);
      } else {
        setActiveBusinessState(null);
      }
      setNeedsOnboarding(false);
    } catch (err) {
      console.warn('RepScan auth profile loading note:', err);
      setNeedsOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (authLoaded) {
      if (signedIn) {
        loadProfileAndData();
      } else {
        setIsLoading(false);
        setUserProfile(null);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        setBusinesses([]);
        setActiveBusinessState(null);
      }
    }
  }, [authLoaded, signedIn, loadProfileAndData]);

  // Handle switching active workspace
  const setActiveWorkspace = useCallback(async (workspace: Workspace & { role: WorkspaceRole }) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('repscan_active_workspace_id', workspace.id);
    apiClient.setWorkspaceId(workspace.id);

    try {
      setIsLoading(true);
      const wsBusinesses = await workspaceApi.listWorkspaceBusinesses(workspace.id);
      setBusinesses(wsBusinesses || []);
      if (wsBusinesses && wsBusinesses.length > 0) {
        setActiveBusinessState(wsBusinesses[0]);
        localStorage.setItem('repscan_active_business_id', wsBusinesses[0].id);
        setNeedsOnboarding(false);
      } else {
        setActiveBusinessState(null);
        setNeedsOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load businesses for switched workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle switching active business
  const setActiveBusiness = useCallback((business: Business) => {
    setActiveBusinessState(business);
    localStorage.setItem('repscan_active_business_id', business.id);
  }, []);

  // Create new workspace
  const createWorkspace = useCallback(async (name: string) => {
    const newWs = await workspaceApi.createWorkspace({ name });
    const fullWs = { ...newWs, role: 'owner' as WorkspaceRole };
    setWorkspaces((prev) => [...prev, fullWs]);
    await setActiveWorkspace(fullWs);
    return newWs;
  }, [setActiveWorkspace]);

  // Create new business directly
  const createBusiness = useCallback(async (payload: CreateBusinessPayload) => {
    const newBiz = await businessApi.createBusiness(payload);
    setBusinesses((prev) => [newBiz, ...prev]);
    setActiveBusinessState(newBiz);
    localStorage.setItem('repscan_active_business_id', newBiz.id);
    setNeedsOnboarding(false);
    return newBiz;
  }, []);

  // Refresh businesses
  const refreshBusinesses = useCallback(async () => {
    try {
      const allBusinesses = await businessApi.getAllBusinesses();
      setBusinesses(allBusinesses || []);
      if (allBusinesses && allBusinesses.length > 0) {
        setActiveBusinessState((prev) => {
          if (!prev) return allBusinesses[0];
          const found = allBusinesses.find((b) => b.id === prev.id);
          return found || allBusinesses[0];
        });
      } else {
        setActiveBusinessState(null);
      }
    } catch (err) {
      console.warn('Failed to refresh businesses:', err);
    }
  }, []);

  const activeRole: WorkspaceRole = activeWorkspace?.role || 'owner';

  return {
    isAuthenticated: signedIn,
    isAuthLoaded: authLoaded,
    userProfile,
    workspaces,
    activeWorkspace,
    activeRole,
    setActiveWorkspace,
    createWorkspace,
    businesses,
    activeBusiness,
    setActiveBusiness,
    createBusiness,
    refreshBusinesses,
    isLoading,
    needsOnboarding,
    setNeedsOnboarding,
    refreshAll: loadProfileAndData,
  };
}

// 1. Clerk-enabled provider (only rendered within ClerkProvider)
export const ClerkBusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clerkAuth = useAuth();
  const { signOut } = useClerk();
  const data = useBusinessDataLogic(
    clerkAuth.isLoaded,
    Boolean(clerkAuth.isSignedIn),
    () => clerkAuth.getToken()
  );

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <BusinessContext.Provider value={{ ...data, logout: handleLogout }}>
      {children}
    </BusinessContext.Provider>
  );
};

// 2. Dev-mode fallback provider (rendered when Clerk publishable key is not set yet)
export const DevBusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useBusinessDataLogic(true, false, undefined);
  const handleLogout = async () => {
    window.location.href = '/';
  };
  return (
    <BusinessContext.Provider value={{ ...data, logout: handleLogout }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
