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

export type EmailCampaign = {
  id: string;
  subject: string;
  description?: string | null;
  imageUrl?: string | null;
  htmlContent: string;
  textContent: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  openCount?: number;
  clickCount?: number;
  sentAt?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  recipients?: Array<{
    email: string;
    status: string;
    failureReason?: string | null;
    sentAt?: string | null;
  }>;
  _count?: {
    recipients?: number;
  };
};

export type EmailCustomer = {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    source?: string;
    authProvider?: string;
    emailVerified?: boolean;
    [key: string]: unknown;
  };
  _count?: {
    recipients: number;
  };
};

type DashboardResponse = {
  stats?: {
    sentToday?: number;
    dailyLimitRemaining?: number;
    totalCustomers?: number;
    totalCampaigns?: number;
  };
};

export type EmailAnalyticsSummary = {
  range?: {
    startDate?: string;
    endDate?: string;
  };
  stats?: {
    customersCreated?: number;
    campaignsCreated?: number;
    campaignsSent?: number;
    recipientCount?: number;
    sentCount?: number;
    failedCount?: number;
    deliveryRate?: number;
    failureRate?: number;
  };
  latestCampaign?: {
    id: string;
    subject: string;
    status: string;
    recipientCount?: number;
    sentCount?: number;
    failedCount?: number;
    sentAt?: string;
    createdAt?: string;
  } | null;
};

class EmailService {
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

  private async request<T>(
    path: string,
    {
      firebaseId,
      role = 'cafe_admin',
      method = 'GET',
      body,
    }: {
      firebaseId: string;
      role?: string;
      method?: string;
      body?: unknown;
    }
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.getHeaders(firebaseId, role),
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Email API request failed (${response.status})`);
    }

    return payload as T;
  }

  async createCampaign(
    firebaseId: string,
    cafeId: string,
    campaign: Pick<EmailCampaign, 'subject' | 'htmlContent' | 'textContent'> & {
      description?: string | null;
      imageUrl?: string | null;
      scheduledAt?: string | null;
    }
  ) {
    return this.request<EmailCampaign>('/campaigns', {
      firebaseId,
      method: 'POST',
      body: { ...campaign, cafeId },
    });
  }

  async getCampaign(firebaseId: string, campaignId: string) {
    return this.request<EmailCampaign>(`/campaigns/${campaignId}`, { firebaseId });
  }

  async updateCampaign(
    firebaseId: string,
    campaignId: string,
    campaign: Pick<EmailCampaign, 'subject' | 'htmlContent' | 'textContent'> & {
      description?: string | null;
      imageUrl?: string | null;
      scheduledAt?: string | null;
    }
  ) {
    return this.request<EmailCampaign>(`/campaigns/${campaignId}`, {
      firebaseId,
      method: 'PATCH',
      body: campaign,
    });
  }

  async deleteCampaign(firebaseId: string, campaignId: string) {
    return this.request<{ message: string }>(`/campaigns/${campaignId}`, {
      firebaseId,
      method: 'DELETE',
    });
  }

  async archiveCampaign(firebaseId: string, campaignId: string) {
    return this.request<EmailCampaign>(`/campaigns/${campaignId}/archive`, {
      firebaseId,
      method: 'POST',
    });
  }

  async restoreCampaign(firebaseId: string, campaignId: string) {
    return this.request<EmailCampaign>(`/campaigns/${campaignId}/restore`, {
      firebaseId,
      method: 'POST',
    });
  }

  async listCampaigns(firebaseId: string, cafeId: string, limit = 20, skip = 0) {
    return this.request<{ campaigns: EmailCampaign[]; total: number }>(
      `/cafes/${cafeId}/campaigns?limit=${limit}&skip=${skip}`,
      { firebaseId }
    );
  }

  async sendCampaign(firebaseId: string, campaignId: string, recipientEmails: string[] = []) {
    return this.request<{ success: boolean; message: string; recipientCount?: number }>(
      `/campaigns/${campaignId}/send`,
      {
        firebaseId,
        method: 'POST',
        body: recipientEmails.length > 0 ? { recipientEmails } : undefined,
      }
    );
  }

  async scheduleCampaign(
    firebaseId: string,
    campaignId: string,
    scheduledAt: string,
    recipientEmails: string[] = []
  ) {
    return this.request<{ success: boolean; message: string; recipientCount?: number; scheduledAt?: string }>(
      `/campaigns/${campaignId}/schedule`,
      {
        firebaseId,
        method: 'POST',
        body: { scheduledAt, recipientEmails },
      }
    );
  }

  async createCustomer(firebaseId: string, cafeId: string, customer: Pick<EmailCustomer, 'email' | 'name'>) {
    return this.request<EmailCustomer>(`/cafes/${cafeId}/customers`, {
      firebaseId,
      method: 'POST',
      body: customer,
    });
  }

  async syncCurrentVisitorCustomer(firebaseId: string, cafeId: string) {
    return this.request<EmailCustomer>(`/cafes/${cafeId}/customers/sync-self`, {
      firebaseId,
      role: 'guest',
      method: 'POST',
    });
  }

  async listCustomers(firebaseId: string, cafeId: string, limit = 100, skip = 0) {
    return this.request<{ customers: EmailCustomer[]; total: number }>(
      `/cafes/${cafeId}/customers?limit=${limit}&skip=${skip}`,
      { firebaseId }
    );
  }

  async getCafeDashboard(firebaseId: string, cafeId: string) {
    return this.request<DashboardResponse>(`/cafes/${cafeId}/dashboard`, { firebaseId });
  }

  async getCafeAnalyticsSummary(
    firebaseId: string,
    cafeId: string,
    startDate: string,
    endDate: string
  ) {
    const search = new URLSearchParams({
      startDate,
      endDate,
    });

    return this.request<EmailAnalyticsSummary>(
      `/cafes/${cafeId}/analytics/summary?${search.toString()}`,
      { firebaseId }
    );
  }
}

export const emailService = new EmailService();
