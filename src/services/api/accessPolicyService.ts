import { getFirebaseApiHeaders } from './authHeaders';

const getApiBase = () => {
  const configuredBase = import.meta.env.VITE_EMAIL_API_BASE?.trim();

  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  return '/api';
};

const API_BASE = getApiBase();

export type AccessRole = 'super_owner' | 'owner' | 'manager' | 'none';

export type AccessPolicyRule = {
  cafeSlug: string;
  ownerEmails: string[];
  managerEmails: string[];
};

export type AccessPolicyPayload = {
  superOwnerEmails: string[];
  cafeAccess: AccessPolicyRule[];
};

export type AccessAssignment = {
  email: string;
  role: AccessRole;
  cafeIds: string[];
  ownerCafeIds: string[];
  managerCafeIds: string[];
};

export type AccessPolicyResponse = {
  policy: AccessPolicyPayload;
  effectivePolicy?: AccessPolicyPayload;
  assignments: AccessAssignment[];
};

export type AccessPolicySyncResponse = {
  success: boolean;
  result: {
    synced: number;
    missingUsers: string[];
    failed: Array<{ email: string; code: string }>;
  };
  message: string;
};

const createWorkspaceHeaders = (workspaceSlug?: string) =>
  workspaceSlug?.trim()
    ? { 'X-Access-Workspace': workspaceSlug.trim() }
    : {};

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = await getFirebaseApiHeaders('super_admin');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...((options.headers || {}) as Record<string, string>),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Yetki yönetimi isteği tamamlanamadı.');
  }

  return payload as T;
};

export const accessPolicyService = {
  getPolicy: (workspaceSlug?: string) =>
    requestJson<AccessPolicyResponse>('/access-policy', {
      headers: createWorkspaceHeaders(workspaceSlug),
    }),

  updatePolicy: (policy: AccessPolicyPayload, workspaceSlug?: string) =>
    requestJson<AccessPolicyResponse & { success: boolean; message: string }>('/access-policy', {
      method: 'PUT',
      headers: createWorkspaceHeaders(workspaceSlug),
      body: JSON.stringify({ policy, workspaceSlug }),
    }),

  syncClaims: (email?: string, workspaceSlug?: string) =>
    requestJson<AccessPolicySyncResponse>('/access-policy/sync-claims', {
      method: 'POST',
      headers: createWorkspaceHeaders(workspaceSlug),
      body: JSON.stringify({ ...(email ? { email } : {}), workspaceSlug }),
    }),
};
