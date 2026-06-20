import { prisma } from "../config/prisma";

type CampaignLike = {
  id: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  _count?: {
    recipients?: number;
  };
};

type RecipientStatusTotals = {
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  blockedCount: number;
};

type EngagementStatusTotals = {
  openCount: number;
  clickCount: number;
};

const terminalStatuses = new Set(["completed", "failed", "archived"]);
const editableStatuses = new Set(["draft", "scheduled"]);
const openEventStatuses = new Set(["opened", "uniqueOpened", "unique_opened"]);
const clickEventStatuses = new Set(["click", "clicked"]);

const getCountValue = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && "_all" in value) {
    const allValue = (value as { _all?: unknown })._all;
    return typeof allValue === "number" ? allValue : 0;
  }

  return 0;
};

const resolveStatus = (
  campaign: CampaignLike,
  totals: RecipientStatusTotals
) => {
  if (campaign.status === "archived") {
    return "archived";
  }

  if (editableStatuses.has(campaign.status) && totals.recipientCount === 0) {
    return campaign.status;
  }

  if (totals.recipientCount > 0) {
    const processedCount =
      totals.sentCount + totals.failedCount + totals.blockedCount;

    if (processedCount >= totals.recipientCount) {
      return totals.sentCount > 0 ? "completed" : "failed";
    }

    return "sending";
  }

  if (terminalStatuses.has(campaign.status)) {
    return campaign.status;
  }

  return "draft";
};

export const decorateCampaignsWithStats = async <T extends CampaignLike>(
  campaigns: T[],
  { persist = false }: { persist?: boolean } = {}
) => {
  if (campaigns.length === 0) {
    return [];
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const groupedRecipients = await prisma.emailRecipient.groupBy({
    by: ["campaignId", "status"],
    where: {
      campaignId: { in: campaignIds },
    },
    _count: true,
  });
  const engagementLogs = await prisma.emailLog.findMany({
    where: {
      campaignId: { in: campaignIds },
      status: { in: [...openEventStatuses, ...clickEventStatuses] },
    },
    select: {
      id: true,
      campaignId: true,
      email: true,
      status: true,
      brevoMessageId: true,
    },
  });

  const totalsByCampaign = new Map<string, RecipientStatusTotals>();
  const openKeysByCampaign = new Map<string, Set<string>>();
  const clickKeysByCampaign = new Map<string, Set<string>>();

  for (const campaign of campaigns) {
    totalsByCampaign.set(campaign.id, {
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      blockedCount: 0,
    });
    openKeysByCampaign.set(campaign.id, new Set());
    clickKeysByCampaign.set(campaign.id, new Set());
  }

  for (const row of groupedRecipients as Array<{
    campaignId: string;
    status: string;
    _count: unknown;
  }>) {
    const current =
      totalsByCampaign.get(row.campaignId) ??
      {
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        blockedCount: 0,
      };
    const count = getCountValue(row._count);

    current.recipientCount += count;

    if (row.status === "sent") {
      current.sentCount += count;
    } else if (row.status === "failed") {
      current.failedCount += count;
    } else if (row.status === "blocked") {
      current.blockedCount += count;
    }

    totalsByCampaign.set(row.campaignId, current);
  }

  for (const log of engagementLogs) {
    const key = log.email || log.brevoMessageId || log.id;

    if (openEventStatuses.has(log.status)) {
      openKeysByCampaign.get(log.campaignId)?.add(key);
    } else if (clickEventStatuses.has(log.status)) {
      clickKeysByCampaign.get(log.campaignId)?.add(key);
      openKeysByCampaign.get(log.campaignId)?.add(key);
    }
  }

  const engagementByCampaign = new Map<string, EngagementStatusTotals>();
  for (const campaignId of campaignIds) {
    engagementByCampaign.set(campaignId, {
      openCount: openKeysByCampaign.get(campaignId)?.size ?? 0,
      clickCount: clickKeysByCampaign.get(campaignId)?.size ?? 0,
    });
  }

  for (const campaign of campaigns) {
    const current = totalsByCampaign.get(campaign.id);

    if (current && current.recipientCount === 0) {
      current.recipientCount =
        campaign._count?.recipients ?? Math.max(0, campaign.recipientCount ?? 0);
      totalsByCampaign.set(campaign.id, current);
    }
  }

  const decoratedCampaigns = campaigns.map((campaign) => {
    const totals =
      totalsByCampaign.get(campaign.id) ??
      {
        recipientCount:
          campaign._count?.recipients ??
          Math.max(0, campaign.recipientCount ?? 0),
        sentCount: Math.max(0, campaign.sentCount ?? 0),
        failedCount: Math.max(0, campaign.failedCount ?? 0),
        blockedCount: 0,
      };
    const failedCount = totals.failedCount + totals.blockedCount;
    const status = resolveStatus(campaign, totals);
    const engagement = engagementByCampaign.get(campaign.id) ?? {
      openCount: 0,
      clickCount: 0,
    };

    return {
      ...campaign,
      status,
      recipientCount: totals.recipientCount,
      sentCount: totals.sentCount,
      failedCount,
      openCount: engagement.openCount,
      clickCount: engagement.clickCount,
    };
  });

  if (persist) {
    await Promise.allSettled(
      decoratedCampaigns
        .filter(
          (campaign, index) =>
            campaign.status !== campaigns[index].status ||
            campaign.recipientCount !== campaigns[index].recipientCount ||
            campaign.sentCount !== campaigns[index].sentCount ||
            campaign.failedCount !== campaigns[index].failedCount
        )
        .map((campaign) =>
          prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: campaign.status,
              recipientCount: campaign.recipientCount,
              sentCount: campaign.sentCount,
              failedCount: campaign.failedCount,
            },
          })
        )
    );
  }

  return decoratedCampaigns;
};
