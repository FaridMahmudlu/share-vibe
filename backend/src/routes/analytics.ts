import { Router, Response } from "express";
import {
  AuthRequest,
  authMiddleware,
  cafeAuthMiddleware,
} from "../middleware/auth";
import {
  buildAnalyticsDashboard,
  syncMediaSnapshots,
} from "../services/AnalyticsDashboardService";
import { decorateCampaignsWithStats } from "../services/CampaignStatsService";
import { getPublicErrorMessage, logServerError } from "../utils/errors";
import { prisma } from "../config/prisma";

const router = Router();

const parseOptionalDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toStartOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toEndExclusive = (value: Date) => {
  const next = toStartOfDay(value);
  next.setDate(next.getDate() + 1);
  return next;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const getInclusiveDayCount = (startDate: Date, endDate: Date) =>
  Math.max(1, Math.round((toStartOfDay(endDate).getTime() - toStartOfDay(startDate).getTime()) / 86_400_000) + 1);

const getTrendBuckets = (startDate: Date, dayCount: number) =>
  Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      date,
      key: toDateKey(date),
      label: date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      value: 0,
    };
  });

const percentChange = (current: number, previous: number) => {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const roundOne = (value: number) => Math.round(value * 10) / 10;

const sentLikeStatuses = new Set(["sent", "delivered"]);
const openLikeStatuses = new Set(["opened", "uniqueOpened", "unique_opened"]);
const clickLikeStatuses = new Set(["click", "clicked"]);
const failedLikeStatuses = new Set(["failed", "bounced", "complained", "blocked"]);

const summarizeLogs = (logs: Array<{ status: string }>) =>
  logs.reduce(
    (acc, log) => {
      if (sentLikeStatuses.has(log.status)) acc.sent += 1;
      if (openLikeStatuses.has(log.status)) acc.opened += 1;
      if (clickLikeStatuses.has(log.status)) {
        acc.clicked += 1;
        acc.opened += 1;
      }
      if (failedLikeStatuses.has(log.status)) acc.failed += 1;
      return acc;
    },
    { sent: 0, opened: 0, clicked: 0, failed: 0 }
  );

// Get campaign analytics
router.get(
  "/campaigns/:campaignId/analytics",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Verify access
      if (req.role !== "super_admin") {
        const cafe = await prisma.cafe.findUnique({
          where: { id: campaign.cafeId },
        });
        if (!cafe || cafe.ownerId !== req.userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const recipients = await prisma.emailRecipient.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: true,
      });

      const statusMap = recipients.reduce(
        (acc: any, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {}
      );

      const failedReasons = await prisma.emailRecipient.groupBy({
        by: ["failureReason"],
        where: { campaignId, status: "failed" },
        _count: true,
      });
      const [decoratedCampaign] = await decorateCampaignsWithStats([
        campaign as any,
      ]);

      return res.json({
        campaignId,
        subject: campaign.subject,
        status: decoratedCampaign?.status ?? campaign.status,
        sentAt: campaign.sentAt,
        stats: {
          total: decoratedCampaign?.recipientCount ?? campaign.recipientCount,
          sent: statusMap.sent || 0,
          failed: statusMap.failed || 0,
          pending: statusMap.pending || 0,
          blocked: statusMap.blocked || 0,
          opened: decoratedCampaign?.openCount ?? 0,
          clicked: decoratedCampaign?.clickCount ?? 0,
        },
        failureReasons: failedReasons.map((r) => ({
          reason: r.failureReason,
          count: r._count,
        })),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch analytics", error) });
    }
  }
);

// Get cafe dashboard
router.get(
  "/cafes/:cafeId/dashboard",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId;

      const cafe = await prisma.cafe.findUnique({
        where: { id: cafeId },
        include: {
          _count: {
            select: {
              customers: true,
              campaigns: true,
            },
          },
        },
      });

      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }

      const rawAllCampaigns = await prisma.campaign.findMany({
        where: { cafeId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { recipients: true } },
        },
      });
      const allCampaigns = await decorateCampaignsWithStats(rawAllCampaigns, {
        persist: true,
      });
      const recentCampaigns = allCampaigns.slice(0, 5);

      // Get today's sent count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyLimit = await prisma.dailyLimit.findFirst({
        where: {
          cafeId,
          date: today,
        },
      });

      const sentToday = dailyLimit?.sentCount || 0;
      const dailyLimitMax = parseInt(process.env.PER_CAFE_DAILY_LIMIT || "50");
      const registeredEmails = await prisma.customer.count({
        where: {
          cafeId,
          emailSubscribed: true,
        },
      });

      return res.json({
        cafe: {
          id: cafe.id,
          name: cafe.name,
          isActive: cafe.isActive,
        },
        stats: {
          totalCustomers: cafe._count.customers,
          registeredEmails,
          totalCampaigns: allCampaigns.filter(
            (campaign) => !["archived", "failed"].includes(campaign.status)
          ).length,
          sentToday,
          dailyLimitRemaining: dailyLimitMax - sentToday,
        },
        recentCampaigns,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch dashboard", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/analytics/media/sync",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const result = await syncMediaSnapshots(prisma, cafeId, req.body?.media);

      return res.json(result);
    } catch (error: any) {
      logServerError("Error syncing analytics media snapshots:", error);
      return res
        .status(error.status || 500)
        .json({ error: getPublicErrorMessage("Failed to sync analytics media", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/analytics/dashboard",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const dashboard = await buildAnalyticsDashboard(prisma, cafeId, req.query);
      return res.json(dashboard);
    } catch (error: any) {
      logServerError("Error fetching analytics dashboard:", error);
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch analytics dashboard", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/analytics/summary",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const requestedEnd = parseOptionalDate(req.query.endDate);
      const requestedStart = parseOptionalDate(req.query.startDate);

      const endDate = requestedEnd ? toStartOfDay(requestedEnd) : toStartOfDay(new Date());
      const startDate = requestedStart
        ? toStartOfDay(requestedStart)
        : (() => {
            const fallback = new Date(endDate);
            fallback.setDate(fallback.getDate() - 6);
            return fallback;
          })();

      if (startDate > endDate) {
        return res.status(400).json({ error: "startDate cannot be after endDate" });
      }

      const endExclusive = toEndExclusive(endDate);
      const rangeFilter = {
        gte: startDate,
        lt: endExclusive,
      };

      const [totalCustomers, registeredEmails, customersCreated, campaignsCreated, campaignsSent, campaignActivity] =
        await Promise.all([
          prisma.customer.count({
            where: { cafeId },
          }),
          prisma.customer.count({
            where: {
              cafeId,
              emailSubscribed: true,
            },
          }),
          prisma.customer.count({
            where: {
              cafeId,
              createdAt: rangeFilter,
            },
          }),
          prisma.campaign.count({
            where: {
              cafeId,
              createdAt: rangeFilter,
            },
          }),
          prisma.campaign.count({
            where: {
              cafeId,
              sentAt: rangeFilter,
            },
          }),
          prisma.campaign.findMany({
            where: {
              cafeId,
              OR: [
                { createdAt: rangeFilter },
                { sentAt: rangeFilter },
              ],
            },
            include: {
              _count: { select: { recipients: true } },
            },
          }),
        ]);

      const decoratedCampaignActivity = await decorateCampaignsWithStats(
        campaignActivity,
        { persist: true }
      );

      const summary = decoratedCampaignActivity.reduce(
        (acc, campaign) => {
          acc.recipientCount += campaign.recipientCount ?? 0;
          acc.sentCount += campaign.sentCount ?? 0;
          acc.failedCount += campaign.failedCount ?? 0;
          acc.openCount += campaign.openCount ?? 0;
          acc.clickCount += campaign.clickCount ?? 0;
          return acc;
        },
        {
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
          openCount: 0,
          clickCount: 0,
        }
      );

      const latestCampaign =
        [...decoratedCampaignActivity].sort((left, right) => {
          const leftTime = new Date(left.sentAt ?? left.createdAt).getTime();
          const rightTime = new Date(right.sentAt ?? right.createdAt).getTime();
          return rightTime - leftTime;
        })[0] ?? null;

      return res.json({
        range: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        stats: {
          totalCustomers,
          registeredEmails,
          customersCreated,
          campaignsCreated,
          campaignsSent,
          recipientCount: summary.recipientCount,
          sentCount: summary.sentCount,
          failedCount: summary.failedCount,
          openCount: summary.openCount,
          clickCount: summary.clickCount,
          deliveryRate:
            summary.recipientCount > 0
              ? Math.round((summary.sentCount / summary.recipientCount) * 100)
              : 0,
          failureRate:
            summary.recipientCount > 0
              ? Math.round((summary.failedCount / summary.recipientCount) * 100)
              : 0,
          openRate:
            summary.sentCount > 0
              ? Math.round((summary.openCount / summary.sentCount) * 1000) / 10
              : 0,
          clickRate:
            summary.sentCount > 0
              ? Math.round((summary.clickCount / summary.sentCount) * 1000) / 10
              : 0,
        },
        latestCampaign,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch analytics summary", error) });
    }
  }
);

export default router;

