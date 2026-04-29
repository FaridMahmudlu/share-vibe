import { auth } from '../firebase';

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

export type QrStandRecord = {
  id: string;
  name: string;
  location: string;
  tableCount: number;
  status: 'active' | 'inactive' | 'pending' | string;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  requestCount?: number;
};

export type QrStandRequestRecord = {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  location?: string | null;
  tableCount: number;
  notes?: string | null;
  status: 'pending' | 'contacted' | 'scheduled' | 'completed' | 'cancelled' | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type QrDashboardResponse = {
  summary: {
    totalStands: number;
    totalTables: number;
    activeStands: number;
    pendingRequests: number;
    averageTablesPerStand: number;
    largestStand?: {
      id: string;
      name: string;
      tableCount: number;
    } | null;
    latestRequestAt?: string | null;
  };
  stands: QrStandRecord[];
  recentRequests?: QrStandRequestRecord[];
};

type RequestOptions = {
  firebaseId: string;
  role?: string;
  method?: string;
  body?: unknown;
};

class QrService {
  private getHeaders(firebaseId: string, role = 'cafe_admin') {
    const currentUser = auth.currentUser;
    const authProvider = currentUser?.providerData?.find((provider) => provider?.providerId)?.providerId;

    return {
      'Content-Type': 'application/json',
      'X-Firebase-Id': firebaseId,
      ...(currentUser?.email ? { 'X-Firebase-Email': currentUser.email } : {}),
      ...(currentUser?.displayName ? { 'X-Firebase-Name': currentUser.displayName } : {}),
      ...(typeof currentUser?.emailVerified === 'boolean'
        ? { 'X-Firebase-Verified': String(currentUser.emailVerified) }
        : {}),
      ...(authProvider ? { 'X-Auth-Provider': authProvider } : {}),
      'X-User-Role': role,
    };
  }

  private async request<T>(path: string, { firebaseId, role = 'cafe_admin', method = 'GET', body }: RequestOptions): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.getHeaders(firebaseId, role),
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `QR API request failed (${response.status})`);
    }

    return payload as T;
  }

  async getCafeQrDashboard(
    firebaseId: string,
    cafeId: string,
    params?: {
      search?: string;
      status?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    }
  ) {
    const searchParams = new URLSearchParams();

    if (params?.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }

    if (params?.status?.trim()) {
      searchParams.set('status', params.status.trim());
    }

    if (params?.sort?.trim()) {
      searchParams.set('sort', params.sort.trim());
    }

    if (params?.order) {
      searchParams.set('order', params.order);
    }

    const query = searchParams.toString();
    return this.request<QrDashboardResponse>(`/cafes/${cafeId}/qr-stands${query ? `?${query}` : ''}`, {
      firebaseId,
    });
  }

  async createQrStandRequest(
    firebaseId: string,
    cafeId: string,
    request: {
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      location?: string;
      tableCount: number;
      notes?: string;
    }
  ) {
    return this.request<{ request: QrStandRequestRecord; message: string }>(
      `/cafes/${cafeId}/qr-stand-requests`,
      {
        firebaseId,
        method: 'POST',
        body: request,
      }
    );
  }
}

export const qrService = new QrService();