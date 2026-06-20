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

export type QrStandRecord = {
  id: string;
  name: string;
  location: string;
  tableCount: number;
  status: 'active' | 'inactive' | 'pending' | string;
  notes?: string | null;
  photoCount?: number;
  publicUrl?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  requestCount?: number;
};

export type QrStandRequestRecord = {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  standName?: string | null;
  location?: string | null;
  placement?: string | null;
  tableCount: number;
  preferredDate?: string | null;
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
    pendingStands?: number;
    inactiveStands?: number;
    pendingRequests: number;
    totalQrPhotos?: number;
    photoActiveStands?: number;
    averagePhotosPerStand?: number;
    averageTablesPerStand: number;
    activityRate?: number;
    topStand?: {
      id: string;
      name: string;
      photoCount: number;
      lastActivityAt?: string | null;
    } | null;
    largestStand?: {
      id: string;
      name: string;
      tableCount: number;
    } | null;
    latestActivityAt?: string | null;
    latestRequestAt?: string | null;
  };
  stands: QrStandRecord[];
  recentRequests?: QrStandRequestRecord[];
};

type RequestOptions = {
  firebaseId: string;
  role?: string;
  cafeName?: string;
  method?: string;
  body?: unknown;
};

class QrService {
  private async request<T>(
    path: string,
    { firebaseId, role = 'cafe_admin', cafeName, method = 'GET', body }: RequestOptions
  ): Promise<T> {
    const headers = await getFirebaseApiHeaders(role, cafeName);
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
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

  async syncCafeQrStands(
    firebaseId: string,
    cafeId: string,
    stands: Array<{
      name?: string;
      table?: string;
      location?: string;
      tableCount?: number;
      shareCount?: number;
      photoCount?: number;
      publicUrl?: string;
      lastActivityAt?: string | null;
      notes?: string;
      status?: 'active' | 'inactive' | 'pending' | string;
    }>,
    cafeName?: string
  ) {
    return this.request<{ syncedCount: number; deletedStaleCount?: number; stands: QrStandRecord[] }>(
      `/cafes/${cafeId}/qr-stands/sync`,
      {
        firebaseId,
        cafeName,
        method: 'POST',
        body: { stands },
      }
    );
  }

  async createQrStandRequest(
    firebaseId: string,
    cafeId: string,
    request: {
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      standName?: string;
      location?: string;
      placement?: string;
      tableCount: number;
      preferredDate?: string;
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
