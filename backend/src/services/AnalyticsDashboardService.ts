import { PrismaClient } from "@prisma/client";
import { decorateCampaignsWithStats } from "./CampaignStatsService";

export type TrendGranularity = "day" | "week" | "month";

type DashboardQuery = {
  startDate?: unknown;
  endDate?: unknown;
  groupBy?: unknown;
};

type MediaSyncItem = {
  id?: unknown;
  externalId?: unknown;
  source?: unknown;
  tableNumber?: unknown;
  status?: unknown;
  createdAt?: unknown;
  mediaCreatedAt?: unknown;
  viewsCount?: unknown;
  likesCount?: unknown;
  shareCount?: unknown;
  qrInteractionCount?: unknown;
};

const DAY_MS = 86_400_000;
const EMAIL_TEMPLATE_TYPES = ["email"];
const STORY_TEMPLATE_TYPES = ["story", "story_template"];
const TURKISH_MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const sentLikeStatuses = new Set(["sent", "delivered"]);
const openLikeStatuses = new Set(["opened", "uniqueOpened", "unique_opened"]);
const clickLikeStatuses = new Set(["click", "clicked"]);
const failedLikeStatuses = new Set(["failed", "bounced", "complained", "blocked"]);

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const truncate = (value: string | null, maxLength: number) =>
  value && value.length > maxLength ? value.slice(0, maxLength).trim() : value;

const parseNonNegativeInt = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const parseOptionalDate = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
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

const addMonths = (value: Date, months: number) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const getInclusiveDayCount = (startDate: Date, endDate: Date) =>
  Math.max(1, Math.round((toStartOfDay(endDate).getTime() - toStartOfDay(startDate).getTime()) / DAY_MS) + 1);

const percentChange = (current: number, previous: number) => {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const roundOne = (value: number) => Math.round(value * 10) / 10;

const formatTurkishDayMonth = (value: Date) => `${value.getDate()} ${TURKISH_MONTH_NAMES[value.getMonth()]}`;

const formatTurkishMonthYear = (value: Date) => `${TURKISH_MONTH_NAMES[value.getMonth()]} ${value.getFullYear()}`;

export const parseTrendGranularity = (value: unknown): TrendGranularity => {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized === "week" || normalized === "weekly") {
    return "week";
  }

  if (normalized === "month" || normalized === "monthly") {
    return "month";
  }

  return "day";
};

const normalizeMediaSource = (value: unknown, tableNumber: string | null) => {
  const normalized = normalizeString(value).toLowerCase();

  if (["story", "story_template", "template"].includes(normalized)) {
    return "story";
  }

  if (normalized === "email_template") {
    return "email_template";
  }

  if (["email", "campaign"].includes(normalized)) {
    return "email";
  }

  if (["qr", "gallery", "manual", "other"].includes(normalized)) {
    return normalized === "manual" ? "gallery" : normalized;
  }

  return tableNumber ? "qr" : "gallery";
};

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

const summarizeMediaStats = (
  mediaStats: Array<{
    source: string;
    viewsCount: number;
    likesCount: number;
    shareCount: number;
    qrInteractionCount: number;
  }>
) =>
  mediaStats.reduce(
    (acc, item) => {
      const shareCount = Math.max(0, item.shareCount ?? 0);
      const shareValue = 1 + shareCount;

      acc.photos += 1;
      acc.views += Math.max(0, item.viewsCount ?? 0);
      acc.likes += Math.max(0, item.likesCount ?? 0);
      acc.linkShares += shareCount;
      acc.qrInteractions += Math.max(0, item.qrInteractionCount ?? 0);

      if (item.source === "qr") {
        acc.qrPhotos += 1;
        acc.qrShares += shareValue;
      } else if (item.source === "gallery") {
        acc.galleryPhotos += 1;
        acc.galleryShares += shareValue;
      } else if (item.source === "story") {
        acc.storyTemplateShares += shareValue;
      } else if (item.source === "email_template") {
        acc.emailTemplateShares += shareValue;
      } else if (item.source === "email") {
        acc.emailShares += shareValue;
      } else {
        acc.otherPhotos += 1;
        acc.otherShares += shareValue;
      }

      return acc;
    },
    {
      photos: 0,
      qrPhotos: 0,
      qrShares: 0,
      galleryPhotos: 0,
      galleryShares: 0,
      otherPhotos: 0,
      otherShares: 0,
      views: 0,
      likes: 0,
      linkShares: 0,
      emailTemplateShares: 0,
      storyTemplateShares: 0,
      emailShares: 0,
      qrInteractions: 0,
    }
  );

const nextBucketStart = (value: Date, granularity: TrendGranularity) => {
  if (granularity === "week") {
    return addDays(value, 7);
  }

  if (granularity === "month") {
    return addMonths(value, 1);
  }

  return addDays(value, 1);
};

const formatTrendLabel = (start: Date, endExclusive: Date, granularity: TrendGranularity) => {
  if (granularity === "day") {
    return formatTurkishDayMonth(start);
  }

  if (granularity === "month") {
    return formatTurkishMonthYear(start);
  }

  const end = addDays(endExclusive, -1);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}-${end.getDate()} ${TURKISH_MONTH_NAMES[start.getMonth()]}`;
  }

  return `${formatTurkishDayMonth(start)} - ${formatTurkishDayMonth(end)}`;
};

const buildTrendBuckets = (startDate: Date, endDate: Date, granularity: TrendGranularity) => {
  const endExclusive = toEndExclusive(endDate);
  const buckets = [];
  let cursor = toStartOfDay(startDate);

  while (cursor < endExclusive) {
    const rawNext = nextBucketStart(cursor, granularity);
    const bucketEndExclusive = rawNext < endExclusive ? rawNext : endExclusive;

    buckets.push({
      date: new Date(cursor),
      endExclusive: new Date(bucketEndExclusive),
      key: toDateKey(cursor),
      label: formatTrendLabel(cursor, bucketEndExclusive, granularity),
      value: 0,
      photos: 0,
      qrShares: 0,
      galleryShares: 0,
      storyShares: 0,
      linkShares: 0,
      emailShares: 0,
      customerAdds: 0,
      emailTemplateUses: 0,
      storyTemplateUses: 0,
      otherShares: 0,
    });

    cursor = bucketEndExclusive;
  }

  return buckets;
};

const findBucket = <T extends { date: Date; endExclusive: Date }>(buckets: T[], value: Date) =>
  buckets.find((bucket) => value >= bucket.date && value < bucket.endExclusive) ?? null;

export const syncMediaSnapshots = async (prisma: PrismaClient, cafeId: string, items: unknown) => {
  const mediaItems = Array.isArray(items) ? (items as MediaSyncItem[]).slice(0, 1000) : [];
  const now = new Date();
  let skippedCount = 0;

  const operations = mediaItems.flatMap((item) => {
    const externalId = truncate(normalizeString(item.externalId ?? item.id), 160);
    if (!externalId) {
      skippedCount += 1;
      return [];
    }

    const tableNumber = truncate(normalizeString(item.tableNumber), 80);
    const mediaCreatedAt = parseOptionalDate(item.mediaCreatedAt ?? item.createdAt) ?? now;
    const source = normalizeMediaSource(item.source, tableNumber);

    return [
      prisma.mediaStat.upsert({
        where: {
          cafeId_externalId: {
            cafeId,
            externalId,
          },
        },
        create: {
          cafeId,
          externalId,
          source,
          tableNumber,
          status: truncate(normalizeString(item.status) || "published", 40) ?? "published",
          mediaCreatedAt,
          viewsCount: parseNonNegativeInt(item.viewsCount),
          likesCount: parseNonNegativeInt(item.likesCount),
          shareCount: parseNonNegativeInt(item.shareCount),
          qrInteractionCount: parseNonNegativeInt(item.qrInteractionCount),
          syncedAt: now,
        },
        update: {
          source,
          tableNumber,
          status: truncate(normalizeString(item.status) || "published", 40) ?? "published",
          mediaCreatedAt,
          viewsCount: parseNonNegativeInt(item.viewsCount),
          likesCount: parseNonNegativeInt(item.likesCount),
          shareCount: parseNonNegativeInt(item.shareCount),
          qrInteractionCount: parseNonNegativeInt(item.qrInteractionCount),
          syncedAt: now,
        },
      }),
    ];
  });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return {
    syncedCount: operations.length,
    skippedCount,
    updatedAt: now.toISOString(),
  };
};

export const buildAnalyticsDashboard = async (prisma: PrismaClient, cafeId: string, query: DashboardQuery) => {
  const requestedEnd = parseOptionalDate(query.endDate);
  const requestedStart = parseOptionalDate(query.startDate);
  const granularity = parseTrendGranularity(query.groupBy);

  const endDate = requestedEnd ? toStartOfDay(requestedEnd) : toStartOfDay(new Date());
  const startDate = requestedStart
    ? toStartOfDay(requestedStart)
    : (() => {
        const fallback = new Date(endDate);
        fallback.setDate(fallback.getDate() - 30);
        return fallback;
      })();

  if (startDate > endDate) {
    const error = new Error("startDate cannot be after endDate");
    (error as any).status = 400;
    throw error;
  }

  const dayCount = getInclusiveDayCount(startDate, endDate);
  const endExclusive = toEndExclusive(endDate);
  const previousEndDate = addDays(startDate, -1);
  const previousStartDate = addDays(previousEndDate, -(dayCount - 1));
  const previousEndExclusive = toEndExclusive(previousEndDate);

  const currentRange = { gte: startDate, lt: endExclusive };
  const previousRange = { gte: previousStartDate, lt: previousEndExclusive };

  const [
    cafe,
    currentLogs,
    previousLogs,
    currentCustomers,
    previousCustomers,
    totalCustomers,
    activeCustomers,
    loyalCustomers,
    currentCampaigns,
    previousCampaigns,
    qrStands,
    emailTemplates,
    storyTemplates,
    currentMediaStats,
    previousMediaStats,
  ] = await Promise.all([
    prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { id: true, name: true },
    }),
    prisma.emailLog.findMany({
      where: { cafeId, createdAt: currentRange },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailLog.findMany({
      where: { cafeId, createdAt: previousRange },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customer.findMany({
      where: { cafeId, createdAt: currentRange },
      select: { id: true, createdAt: true },
    }),
    prisma.customer.findMany({
      where: { cafeId, createdAt: previousRange },
      select: { id: true, createdAt: true },
    }),
    prisma.customer.count({ where: { cafeId } }),
    prisma.customer.count({
      where: {
        cafeId,
        emailSubscribed: true,
        lastInteractionAt: { gte: addDays(endDate, -30), lt: endExclusive },
      },
    }),
    prisma.customer.count({
      where: {
        cafeId,
        OR: [
          { segment: { contains: "Sadık", mode: "insensitive" } },
          { segment: { contains: "Sadik", mode: "insensitive" } },
          { segment: { contains: "Loyal", mode: "insensitive" } },
        ],
      },
    }),
    prisma.campaign.findMany({
      where: {
        cafeId,
        OR: [{ createdAt: currentRange }, { sentAt: currentRange }],
      },
      include: { _count: { select: { recipients: true } } },
    }),
    prisma.campaign.findMany({
      where: {
        cafeId,
        OR: [{ createdAt: previousRange }, { sentAt: previousRange }],
      },
      include: { _count: { select: { recipients: true } } },
    }),
    prisma.qrStand.findMany({
      where: { cafeId },
      select: {
        id: true,
        name: true,
        status: true,
        photoCount: true,
        lastActivityAt: true,
        updatedAt: true,
      },
      orderBy: [{ photoCount: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.emailTemplate.findMany({
      where: { cafeId, type: { in: EMAIL_TEMPLATE_TYPES }, status: "active" },
      select: {
        id: true,
        title: true,
        category: true,
        usageCount: true,
        lastUsedAt: true,
      },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    prisma.emailTemplate.findMany({
      where: { cafeId, type: { in: STORY_TEMPLATE_TYPES }, status: "active" },
      select: {
        id: true,
        title: true,
        category: true,
        usageCount: true,
        lastUsedAt: true,
      },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    prisma.mediaStat.findMany({
      where: { cafeId, mediaCreatedAt: currentRange },
      select: {
        source: true,
        viewsCount: true,
        likesCount: true,
        shareCount: true,
        qrInteractionCount: true,
        mediaCreatedAt: true,
      },
      orderBy: { mediaCreatedAt: "asc" },
    }),
    prisma.mediaStat.findMany({
      where: { cafeId, mediaCreatedAt: previousRange },
      select: {
        source: true,
        viewsCount: true,
        likesCount: true,
        shareCount: true,
        qrInteractionCount: true,
        mediaCreatedAt: true,
      },
    }),
  ]);

  if (!cafe) {
    const error = new Error("Cafe not found");
    (error as any).status = 404;
    throw error;
  }

  const currentLogSummary = summarizeLogs(currentLogs);
  const previousLogSummary = summarizeLogs(previousLogs);
  const decoratedCurrentCampaigns = await decorateCampaignsWithStats(currentCampaigns, { persist: true });
  const decoratedPreviousCampaigns = await decorateCampaignsWithStats(previousCampaigns, { persist: true });

  const currentCampaignTotals = decoratedCurrentCampaigns.reduce(
    (acc, campaign) => {
      acc.recipients += campaign.recipientCount ?? 0;
      acc.sent += campaign.sentCount ?? 0;
      acc.failed += campaign.failedCount ?? 0;
      acc.opened += campaign.openCount ?? 0;
      acc.clicked += campaign.clickCount ?? 0;
      return acc;
    },
    { recipients: 0, sent: 0, failed: 0, opened: 0, clicked: 0 }
  );

  const previousCampaignTotals = decoratedPreviousCampaigns.reduce(
    (acc, campaign) => {
      acc.recipients += campaign.recipientCount ?? 0;
      acc.sent += campaign.sentCount ?? 0;
      acc.failed += campaign.failedCount ?? 0;
      acc.opened += campaign.openCount ?? 0;
      acc.clicked += campaign.clickCount ?? 0;
      return acc;
    },
    { recipients: 0, sent: 0, failed: 0, opened: 0, clicked: 0 }
  );

  const currentMedia = summarizeMediaStats(currentMediaStats);
  const previousMedia = summarizeMediaStats(previousMediaStats);
  const qrCurrentFallback = qrStands
    .filter((stand) => stand.lastActivityAt && stand.lastActivityAt >= startDate && stand.lastActivityAt < endExclusive)
    .reduce((sum, stand) => sum + Math.max(0, stand.photoCount ?? 0), 0);
  const qrPreviousFallback = qrStands
    .filter((stand) => stand.lastActivityAt && stand.lastActivityAt >= previousStartDate && stand.lastActivityAt < previousEndExclusive)
    .reduce((sum, stand) => sum + Math.max(0, stand.photoCount ?? 0), 0);
  const qrPhotoTotal = qrStands.reduce((sum, stand) => sum + Math.max(0, stand.photoCount ?? 0), 0);
  const qrCurrentTotal = currentMedia.qrShares > 0 ? currentMedia.qrShares : qrCurrentFallback;
  const qrPreviousTotal = previousMedia.qrShares > 0 ? previousMedia.qrShares : qrPreviousFallback;
  const galleryCurrentTotal = currentMedia.galleryShares;
  const galleryPreviousTotal = previousMedia.galleryShares;
  const emailTemplateCurrentTotal = emailTemplates
    .filter((template) => template.lastUsedAt && template.lastUsedAt >= startDate && template.lastUsedAt < endExclusive)
    .reduce((sum, template) => sum + Math.max(0, template.usageCount ?? 0), 0);
  const emailTemplateTotal = emailTemplates.reduce((sum, template) => sum + Math.max(0, template.usageCount ?? 0), 0);
  const storyTemplateCurrentTotal = storyTemplates
    .filter((template) => template.lastUsedAt && template.lastUsedAt >= startDate && template.lastUsedAt < endExclusive)
    .reduce((sum, template) => sum + Math.max(0, template.usageCount ?? 0), 0);
  const storyTemplatePreviousTotal = storyTemplates
    .filter((template) => template.lastUsedAt && template.lastUsedAt >= previousStartDate && template.lastUsedAt < previousEndExclusive)
    .reduce((sum, template) => sum + Math.max(0, template.usageCount ?? 0), 0);
  const storyTemplateTotal = storyTemplates.reduce((sum, template) => sum + Math.max(0, template.usageCount ?? 0), 0);
  const storyShareCurrentTotal = currentMedia.storyTemplateShares + storyTemplateCurrentTotal;
  const storySharePreviousTotal = previousMedia.storyTemplateShares + storyTemplatePreviousTotal;
  const emailShareTotal = Math.max(currentLogSummary.sent, currentCampaignTotals.sent);
  const previousEmailShareTotal = Math.max(previousLogSummary.sent, previousCampaignTotals.sent);
  const otherShareCurrentTotal = currentMedia.otherShares;
  const otherSharePreviousTotal = previousMedia.otherShares;
  const liveGalleryCurrentTotal = qrCurrentTotal + galleryCurrentTotal;
  const currentTotalShares =
    qrCurrentTotal + galleryCurrentTotal + storyShareCurrentTotal + emailShareTotal + otherShareCurrentTotal;
  const previousTotalShares =
    qrPreviousTotal + galleryPreviousTotal + storySharePreviousTotal + previousEmailShareTotal + otherSharePreviousTotal;
  const currentViews = currentMedia.views + currentLogSummary.opened + currentCampaignTotals.opened;
  const previousViews = previousMedia.views + previousLogSummary.opened + previousCampaignTotals.opened;

  const trendBuckets = buildTrendBuckets(startDate, endDate, granularity);

  for (const item of currentMediaStats) {
    const bucket = findBucket(trendBuckets, item.mediaCreatedAt);
    if (!bucket) continue;

    const mediaShareValue = 1 + Math.max(0, item.shareCount ?? 0);
    bucket.photos += 1;
    bucket.linkShares += Math.max(0, item.shareCount ?? 0);
    if (item.source === "qr") {
      bucket.qrShares += mediaShareValue;
    } else if (item.source === "gallery") {
      bucket.galleryShares += mediaShareValue;
    } else if (item.source === "story") {
      bucket.storyShares += mediaShareValue;
    } else if (item.source === "email_template") {
      bucket.emailTemplateUses += mediaShareValue;
    } else if (item.source === "email") {
      bucket.emailShares += mediaShareValue;
    } else {
      bucket.otherShares += mediaShareValue;
    }
  }

  const useCampaignTrendFallback = currentLogSummary.sent < currentCampaignTotals.sent;
  if (useCampaignTrendFallback) {
    for (const campaign of decoratedCurrentCampaigns) {
      const campaignDate = campaign.sentAt ?? campaign.createdAt;
      if (!campaignDate) continue;
      const bucket = findBucket(trendBuckets, new Date(campaignDate));
      if (bucket) bucket.emailShares += campaign.sentCount ?? campaign.recipientCount ?? 0;
    }
  } else {
    for (const log of currentLogs) {
      const bucket = findBucket(trendBuckets, log.createdAt);
      if (!bucket) continue;
      if (sentLikeStatuses.has(log.status)) {
        bucket.emailShares += 1;
      }
    }
  }

  for (const customer of currentCustomers) {
    const bucket = findBucket(trendBuckets, customer.createdAt);
    if (bucket) bucket.customerAdds += 1;
  }

  for (const template of storyTemplates) {
    if (!template.lastUsedAt || template.lastUsedAt < startDate || template.lastUsedAt >= endExclusive) {
      continue;
    }

    const bucket = findBucket(trendBuckets, template.lastUsedAt);
    if (bucket) bucket.storyTemplateUses += Math.max(0, template.usageCount ?? 0);
  }

  const sourceSeed = [
    { key: "gallery", label: "Canlı Galeri Paylaşımları", value: liveGalleryCurrentTotal, color: "#dc8a3c" },
    { key: "email", label: "E-posta Kampanyaları", value: emailShareTotal, color: "#d76884" },
    { key: "story", label: "Story Şablonları", value: storyShareCurrentTotal, color: "#8056d6" },
    ...(otherShareCurrentTotal > 0
      ? [{ key: "other", label: "Diğer", value: otherShareCurrentTotal, color: "#6b7280" }]
      : []),
  ];
  const sourceTotal = Math.max(1, sourceSeed.reduce((sum, item) => sum + item.value, 0));
  const topTemplateMax = Math.max(1, ...emailTemplates.map((template) => template.usageCount ?? 0));
  const topStoryTemplateMax = Math.max(1, ...storyTemplates.map((template) => template.usageCount ?? 0));

  return {
    range: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      previousStartDate: previousStartDate.toISOString(),
      previousEndDate: previousEndDate.toISOString(),
      updatedAt: new Date().toISOString(),
      groupBy: granularity,
    },
    cafe: {
      id: cafe.id,
      name: cafe.name,
    },
    metrics: {
      totalShares: {
        value: currentTotalShares,
        previousValue: previousTotalShares,
        change: percentChange(currentTotalShares, previousTotalShares),
      },
      totalViews: {
        value: currentViews,
        previousValue: previousViews,
        change: percentChange(currentViews, previousViews),
      },
      totalLikes: {
        value: currentMedia.likes,
        previousValue: previousMedia.likes,
        change: percentChange(currentMedia.likes, previousMedia.likes),
      },
      storyTemplateShares: {
        value: storyShareCurrentTotal,
        previousValue: storySharePreviousTotal,
        change: percentChange(storyShareCurrentTotal, storySharePreviousTotal),
      },
      templateShares: {
        value: storyShareCurrentTotal,
        previousValue: storySharePreviousTotal,
        change: percentChange(storyShareCurrentTotal, storySharePreviousTotal),
      },
      newCustomers: {
        value: currentCustomers.length,
        previousValue: previousCustomers.length,
        change: percentChange(currentCustomers.length, previousCustomers.length),
      },
    },
    trend: trendBuckets.map((bucket) => {
      const storyShares = bucket.storyShares + bucket.storyTemplateUses;
      const value = bucket.qrShares + bucket.galleryShares + storyShares + bucket.emailShares + bucket.otherShares;
      return {
        date: bucket.key,
        startDate: bucket.date.toISOString(),
        endDate: addDays(bucket.endExclusive, -1).toISOString(),
        label: bucket.label,
        value,
        photos: bucket.photos,
        qrShares: bucket.qrShares,
        galleryShares: bucket.galleryShares,
        storyShares,
        templateShares: storyShares,
        emailShares: bucket.emailShares,
        otherShares: bucket.otherShares,
        customerAdds: bucket.customerAdds,
      };
    }),
    sources: sourceSeed.map((item) => ({
      ...item,
      percent: Math.round((item.value / sourceTotal) * 1000) / 10,
    })),
    topEmailTemplates: emailTemplates.slice(0, 5).map((template, index) => ({
      id: template.id,
      rank: index + 1,
      name: template.title,
      category: template.category,
      count: template.usageCount ?? 0,
      percent: Math.round(((template.usageCount ?? 0) / topTemplateMax) * 100),
    })),
    topStoryTemplates: storyTemplates.slice(0, 5).map((template, index) => ({
      id: template.id,
      rank: index + 1,
      name: template.title,
      category: template.category,
      count: template.usageCount ?? 0,
      percent: Math.round(((template.usageCount ?? 0) / topStoryTemplateMax) * 100),
    })),
    impact: {
      reachIncrease: roundOne(percentChange(currentViews + emailShareTotal, previousViews + previousEmailShareTotal)),
      engagementIncrease: roundOne(
        percentChange(
          currentMedia.likes + currentLogSummary.opened + currentLogSummary.clicked,
          previousMedia.likes + previousLogSummary.opened + previousLogSummary.clicked
        )
      ),
      loyalCustomerIncrease: roundOne(totalCustomers > 0 ? (loyalCustomers / totalCustomers) * 100 : 0),
      activeCustomers,
      loyalCustomers,
      totalCustomers,
    },
    email: {
      recipients: currentCampaignTotals.recipients,
      sent: emailShareTotal,
      failed: currentLogSummary.failed + currentCampaignTotals.failed,
      opened: currentLogSummary.opened + currentCampaignTotals.opened,
      clicked: currentLogSummary.clicked + currentCampaignTotals.clicked,
    },
    qr: {
      totalPhotos: Math.max(qrPhotoTotal, currentMedia.photos),
      activeStands: qrStands.filter((stand) => stand.status === "active").length,
      topStand: qrStands[0] ?? null,
    },
    emailTemplates: {
      templatesEnabled: emailTemplates.length > 0,
      templateCount: emailTemplates.length,
      templateUsageTotal: emailTemplateTotal,
      shareCount: emailTemplateCurrentTotal,
      message:
        emailTemplates.length > 0
          ? "E-posta şablon verileri aktif şablon kullanımından hesaplanır."
          : "E-posta şablonu henüz kullanılmadı; şablon seçildikçe bu alan otomatik dolacak.",
    },
    storyTemplates: {
      templatesEnabled: storyTemplates.length > 0,
      templateCount: storyTemplates.length,
      templateUsageTotal: storyTemplateTotal,
      shareCount: storyShareCurrentTotal,
      message:
        storyTemplates.length > 0
          ? "Story şablon verileri aktif şablon kullanımından hesaplanır."
          : "Story şablonları henüz aktif değil; özellik açıldığında bu alan otomatik dolacak.",
    },
  };
};
