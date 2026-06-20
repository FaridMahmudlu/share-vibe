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
  phone?: string | null;
  segment?: string;
  tags?: string[];
  emailSubscribed?: boolean;
  lastInteractionAt?: string | null;
  lastInteractionType?: string;
  lastInteractionLabel?: string;
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
    registeredEmails?: number;
    totalCampaigns?: number;
  };
};

export type EmailTemplate = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  description?: string | null;
  type?: string;
  category: string;
  tone?: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  htmlContent: string;
  textContent: string;
  isSystem?: boolean;
  status?: string;
  usageCount?: number;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EmailTemplatePayload = Pick<EmailTemplate, 'title' | 'subject' | 'textContent'> & {
  description?: string | null;
  category?: string;
  tone?: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  htmlContent?: string;
};

type CustomerQueryParams = {
  page?: number;
  search?: string;
  segment?: string;
  tag?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};

export type CustomerOverviewResponse = {
  stats: {
    totalCustomers: number;
    newCustomers: number;
    loyalCustomers: number;
    emailSubscribers: number;
    activeCustomers: number;
    campaignReachedCustomers: number;
    trends: {
      totalCustomers: number;
      newCustomers: number;
      loyalCustomers: number;
      emailSubscribers: number;
      activeCustomers: number;
      campaignReachedCustomers: number;
    };
  };
  segments: Array<{
    key: string;
    label: string;
    count: number;
    percent: number;
    color: string;
  }>;
  interactions: Array<{
    key: string;
    label: string;
    count: number;
    percent: number;
    color: string;
  }>;
  tags: Array<{
    name: string;
    count: number;
  }>;
  topCustomers: EmailCustomer[];
};

export type EmailAnalyticsSummary = {
  range?: {
    startDate?: string;
    endDate?: string;
  };
  stats?: {
    totalCustomers?: number;
    registeredEmails?: number;
    customersCreated?: number;
    campaignsCreated?: number;
    campaignsSent?: number;
    recipientCount?: number;
    sentCount?: number;
    failedCount?: number;
    openCount?: number;
    clickCount?: number;
    deliveryRate?: number;
    failureRate?: number;
    openRate?: number;
    clickRate?: number;
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

export type StatsDashboardResponse = {
  range: {
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
    updatedAt: string;
    groupBy?: 'day' | 'week' | 'month' | string;
  };
  cafe?: {
    id: string;
    name: string;
  };
  metrics: Record<string, {
    value: number;
    previousValue: number;
    change: number;
  }>;
  trend: Array<{
    date: string;
    startDate?: string;
    endDate?: string;
    label: string;
    value: number;
    photos?: number;
    qrShares?: number;
    galleryShares?: number;
    storyShares?: number;
    templateShares?: number;
    emailShares?: number;
    otherShares?: number;
    customerAdds?: number;
  }>;
  sources: Array<{
    key: string;
    label: string;
    value: number;
    percent: number;
    color: string;
  }>;
  topEmailTemplates: Array<{
    id: string;
    rank: number;
    name: string;
    category?: string | null;
    count: number;
    percent: number;
  }>;
  topStoryTemplates?: Array<{
    id: string;
    rank: number;
    name: string;
    category?: string | null;
    count: number;
    percent: number;
  }>;
  impact: {
    reachIncrease: number;
    engagementIncrease: number;
    loyalCustomerIncrease: number;
    activeCustomers: number;
    loyalCustomers: number;
    totalCustomers: number;
  };
  email: {
    recipients: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
  };
  qr: {
    totalPhotos: number;
    activeStands: number;
    topStand?: {
      id: string;
      name: string;
      photoCount: number;
      lastActivityAt?: string | null;
    } | null;
  };
  emailTemplates?: {
    templatesEnabled: boolean;
    templateCount: number;
    templateUsageTotal: number;
    shareCount: number;
    message: string;
  };
  storyTemplates?: {
    templatesEnabled: boolean;
    templateCount: number;
    templateUsageTotal: number;
    shareCount: number;
    message: string;
  };
};

export type StatsTrendGranularity = 'day' | 'week' | 'month';

export type StatsMediaSyncItem = {
  id: string;
  source?: string;
  tableNumber?: string;
  status?: string;
  createdAt?: string;
  viewsCount?: number;
  likesCount?: number;
  shareCount?: number;
  qrInteractionCount?: number;
};

export type CafeSettingsPayload = {
  businessName?: string;
  cafeName?: string;
  sector?: string;
  description?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  primaryColor?: string;
  secondaryColor?: string;
  darkMode?: boolean;
  notifyNewQrStand?: boolean;
  notifyNewCustomer?: boolean;
  emailReports?: boolean;
  weeklySummary?: boolean;
  billingPlan?: string;
  packageKey?: string;
  invoiceEmail?: string | null;
  adminEmails?: string[];
  integrations?: Record<string, unknown>;
  domains?: Record<string, unknown>;
  security?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export type CafeSettingsResponse = {
  cafe: {
    id: string;
    name: string;
    ownerEmail?: string | null;
    ownerName?: string | null;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    counts?: {
      customers?: number;
      campaigns?: number;
      qrStands?: number;
      mediaStats?: number;
    };
  };
  settings: CafeSettingsPayload & {
    id?: string;
    cafeId?: string;
    businessName: string;
    createdAt?: string;
    updatedAt?: string;
  };
};

class EmailService {
  private buildCustomerSearchParams(limit: number, skip: number, params?: CustomerQueryParams) {
    const searchParams = new URLSearchParams({
      limit: String(limit),
      skip: String(skip),
    });

    if (params?.page) {
      searchParams.set('page', String(params.page));
      searchParams.delete('skip');
    }

    if (params?.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }

    if (params?.segment?.trim() && params.segment !== 'all') {
      searchParams.set('segment', params.segment.trim());
    }

    if (params?.tag?.trim() && params.tag !== 'all') {
      searchParams.set('tag', params.tag.trim());
    }

    if (params?.sort?.trim()) {
      searchParams.set('sort', params.sort.trim());
    }

    if (params?.order) {
      searchParams.set('order', params.order);
    }

    return searchParams;
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
    const headers = await getFirebaseApiHeaders(role);
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
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
      sourceCampaignId?: string | null;
      sourceCampaignTitle?: string | null;
      sourceCampaignUrl?: string | null;
      templateKey?: string | null;
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
      sourceCampaignId?: string | null;
      sourceCampaignTitle?: string | null;
      sourceCampaignUrl?: string | null;
      templateKey?: string | null;
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

  async listEmailTemplates(
    firebaseId: string,
    cafeId: string,
    params: {
      search?: string;
      category?: string;
      sort?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const searchParams = new URLSearchParams();

    if (params.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }
    if (params.category?.trim() && params.category !== 'Tümü') {
      searchParams.set('category', params.category.trim());
    }
    if (params.sort?.trim()) {
      searchParams.set('sort', params.sort.trim());
    }
    if (params.status?.trim()) {
      searchParams.set('status', params.status.trim());
    }
    if (params.page && params.page > 0) {
      searchParams.set('page', String(params.page));
    }
    if (params.limit && params.limit > 0) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();

    return this.request<{
      templates: EmailTemplate[];
      total: number;
      page: number;
      limit: number;
      pageCount: number;
      categories: Array<{ name: string; count: number }>;
    }>(`/cafes/${cafeId}/templates${query ? `?${query}` : ''}`, { firebaseId });
  }

  async createEmailTemplate(firebaseId: string, cafeId: string, template: EmailTemplatePayload) {
    return this.request<EmailTemplate>(`/cafes/${cafeId}/templates`, {
      firebaseId,
      method: 'POST',
      body: template,
    });
  }

  async updateEmailTemplate(
    firebaseId: string,
    cafeId: string,
    templateId: string,
    template: Partial<EmailTemplatePayload> & { status?: string }
  ) {
    return this.request<EmailTemplate>(`/cafes/${cafeId}/templates/${templateId}`, {
      firebaseId,
      method: 'PATCH',
      body: template,
    });
  }

  async archiveEmailTemplate(firebaseId: string, cafeId: string, templateId: string) {
    return this.request<EmailTemplate>(`/cafes/${cafeId}/templates/${templateId}`, {
      firebaseId,
      method: 'DELETE',
    });
  }

  async useEmailTemplate(firebaseId: string, cafeId: string, templateId: string) {
    return this.request<EmailTemplate>(`/cafes/${cafeId}/templates/${templateId}/use`, {
      firebaseId,
      method: 'POST',
    });
  }

  async createCustomer(
    firebaseId: string,
    cafeId: string,
    customer: Pick<EmailCustomer, 'email' | 'name'> & {
      phone?: string | null;
      segment?: string;
      tags?: string[];
      emailSubscribed?: boolean;
      lastInteractionAt?: string | null;
      lastInteractionType?: string;
      metadata?: EmailCustomer['metadata'];
    }
  ) {
    return this.request<EmailCustomer>(`/cafes/${cafeId}/customers`, {
      firebaseId,
      method: 'POST',
      body: customer,
    });
  }

  async updateCustomer(
    firebaseId: string,
    cafeId: string,
    customerId: string,
    customer: Partial<Pick<EmailCustomer, 'email' | 'name' | 'phone' | 'segment' | 'tags' | 'emailSubscribed' | 'lastInteractionAt' | 'lastInteractionType' | 'metadata'>>
  ) {
    return this.request<EmailCustomer>(`/cafes/${cafeId}/customers/${customerId}`, {
      firebaseId,
      method: 'PATCH',
      body: customer,
    });
  }

  async updateCustomerSubscriptions(
    firebaseId: string,
    cafeId: string,
    customerIds: string[],
    emailSubscribed: boolean
  ) {
    return this.request<{ updated: number; emailSubscribed: boolean }>(`/cafes/${cafeId}/customers/subscriptions`, {
      firebaseId,
      method: 'PATCH',
      body: { customerIds, emailSubscribed },
    });
  }

  async syncCurrentVisitorCustomer(firebaseId: string, cafeId: string, lastInteractionType = 'site_visit') {
    return this.request<EmailCustomer>(`/cafes/${cafeId}/customers/sync-self`, {
      firebaseId,
      role: 'guest',
      method: 'POST',
      body: { lastInteractionType },
    });
  }

  async listCustomers(
    firebaseId: string,
    cafeId: string,
    limit = 100,
    skip = 0,
    params?: CustomerQueryParams
  ) {
    const searchParams = this.buildCustomerSearchParams(limit, skip, params);

    return this.request<{ customers: EmailCustomer[]; total: number; page?: number; limit?: number; pageCount?: number }>(
      `/cafes/${cafeId}/customers?${searchParams.toString()}`,
      { firebaseId }
    );
  }

  async exportCustomers(firebaseId: string, cafeId: string, params?: CustomerQueryParams) {
    const searchParams = this.buildCustomerSearchParams(5000, 0, params);
    searchParams.delete('limit');
    searchParams.delete('skip');

    const response = await fetch(`${API_BASE}/cafes/${cafeId}/customers/export?${searchParams.toString()}`, {
      method: 'GET',
      headers: await getFirebaseApiHeaders(),
    });
    if (!response.ok) {
      const payload = await response.text();
      let message = payload || `Email API request failed (${response.status})`;
      try {
        const errorPayload = JSON.parse(payload);
        message = errorPayload?.error || errorPayload?.message || message;
      } catch {
        // Keep the plain text response as the error message.
      }
      throw new Error(message);
    }

    return response.blob();
  }

  async getCustomerOverview(firebaseId: string, cafeId: string) {
    return this.request<CustomerOverviewResponse>(`/cafes/${cafeId}/customers/overview`, { firebaseId });
  }

  async getCafeSettings(firebaseId: string, cafeId: string) {
    return this.request<CafeSettingsResponse>(`/cafes/${cafeId}/settings`, { firebaseId });
  }

  async updateCafeSettings(firebaseId: string, cafeId: string, settings: CafeSettingsPayload) {
    return this.request<CafeSettingsResponse>(`/cafes/${cafeId}/settings`, {
      firebaseId,
      method: 'PATCH',
      body: settings,
    });
  }

  async requestSettingsPasswordReset(firebaseId: string, cafeId: string) {
    return this.request<{ success: boolean; message: string }>(`/cafes/${cafeId}/settings/password-reset`, {
      firebaseId,
      method: 'POST',
    });
  }

  async exportCafeSettingsData(firebaseId: string, cafeId: string, format: 'json' | 'xlsx' = 'xlsx') {
    const searchParams = new URLSearchParams({ format });
    const response = await fetch(`${API_BASE}/cafes/${cafeId}/settings/export?${searchParams.toString()}`, {
      method: 'GET',
      headers: await getFirebaseApiHeaders(),
    });

    if (!response.ok) {
      const payload = await response.text();
      let message = payload || `Email API request failed (${response.status})`;
      try {
        const errorPayload = JSON.parse(payload);
        message = errorPayload?.error || errorPayload?.message || message;
      } catch {
        // Keep the plain text response as the error message.
      }
      throw new Error(message);
    }

    return response.blob();
  }

  async deleteCafeSettingsAccount(firebaseId: string, cafeId: string, confirmation: string) {
    return this.request<{ success: boolean; message: string }>(`/cafes/${cafeId}/settings/account`, {
      firebaseId,
      method: 'DELETE',
      body: { confirmation },
    });
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

  async syncStatsMedia(firebaseId: string, cafeId: string, media: StatsMediaSyncItem[]) {
    return this.request<{ syncedCount: number; skippedCount: number; updatedAt: string }>(
      `/cafes/${cafeId}/analytics/media/sync`,
      {
        firebaseId,
        method: 'POST',
        body: { media },
      }
    );
  }

  async getStatsDashboard(
    firebaseId: string,
    cafeId: string,
    startDate: string,
    endDate: string,
    groupBy: StatsTrendGranularity = 'day'
  ) {
    const search = new URLSearchParams({
      startDate,
      endDate,
      groupBy,
    });

    return this.request<StatsDashboardResponse>(
      `/cafes/${cafeId}/analytics/dashboard?${search.toString()}`,
      { firebaseId }
    );
  }
}

export const emailService = new EmailService();
