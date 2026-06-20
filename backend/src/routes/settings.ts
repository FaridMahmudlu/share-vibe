import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { AuthRequest, authMiddleware, cafeAuthMiddleware } from "../middleware/auth";
import { DEFAULT_BILLING_PLAN, normalizeBillingPlan } from "../utils/plans";
import { getPublicErrorMessage, logServerError } from "../utils/errors";
import { getCafeAccessRole } from "../config/accessPolicy";
import { prisma } from "../config/prisma";

const router = Router();

const DEFAULT_SETTINGS = {
  sector: "Yiyecek & İçecek",
  language: "tr",
  timezone: "Europe/Istanbul",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
  primaryColor: "#C98B5A",
  secondaryColor: "#3B2E24",
  darkMode: true,
  notifyNewQrStand: true,
  notifyNewCustomer: true,
  emailReports: true,
  weeklySummary: false,
  billingPlan: DEFAULT_BILLING_PLAN,
};

const normalizeString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() || fallback : fallback;

const normalizeOptionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeColor = (value: unknown, fallback: string) => {
  const normalized = normalizeString(value);
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback;
};

const normalizeEmailList = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().toLowerCase())
            .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
        )
      ).slice(0, 20)
    : [];

const normalizeJsonObject = (value: unknown): Prisma.InputJsonObject | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Prisma.InputJsonObject) : undefined;

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeEmail = (value: unknown) =>
  normalizeString(value).toLowerCase();

const sameEmailSet = (first: string[], second: string[]) => {
  const left = [...new Set(first.map(normalizeEmail).filter(Boolean))].sort();
  const right = [...new Set(second.map(normalizeEmail).filter(Boolean))].sort();

  return left.length === right.length && left.every((email, index) => email === right[index]);
};

const normalizeOptionalPatchString = (body: Record<string, unknown>, key: string, fallback: unknown) =>
  hasOwn(body, key) ? normalizeOptionalString(body[key]) : normalizeOptionalString(fallback);

const getCafeSettingsAccess = async (req: AuthRequest, cafeId: string) => {
  const user = req.userId ? await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } }) : null;
  const userEmail = normalizeEmail(req.userEmail || user?.email);
  const accessRole = getCafeAccessRole(userEmail, cafeId);
  const isSuperAdmin = accessRole === "super_owner";
  const isOwner = accessRole === "owner" || accessRole === "super_owner";
  const isManager = accessRole === "manager";

  return {
    isSuperAdmin,
    isOwner,
    isManager,
    canManageManagers: isSuperAdmin || isOwner,
  };
};

const toExcelValue = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value ?? "";
};

const addWorksheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Array<{ header: string; key: string; width?: number }>,
  rows: Array<Record<string, unknown>>
) => {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns.map((column) => ({ ...column, width: column.width ?? 22 }));
  worksheet.addRows(rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toExcelValue(value)]))
  ));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B2E24" },
  };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE6D6C7" } },
        left: { style: "thin", color: { argb: "FFE6D6C7" } },
        bottom: { style: "thin", color: { argb: "FFE6D6C7" } },
        right: { style: "thin", color: { argb: "FFE6D6C7" } },
      };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });

  return worksheet;
};

const toSettingsResponse = async (cafeId: string) => {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      owner: { select: { email: true, name: true } },
      settings: true,
      _count: { select: { customers: true, campaigns: true, qrStands: true, mediaStats: true } },
    },
  });

  if (!cafe) {
    const error = new Error("Cafe not found");
    (error as any).status = 404;
    throw error;
  }

  const settings =
    cafe.settings ??
    (await prisma.cafeSettings.create({
      data: {
        cafeId,
        businessName: cafe.name,
        invoiceEmail: cafe.supportEmail,
        billingPlan: DEFAULT_SETTINGS.billingPlan,
      },
    }));

  return {
    cafe: {
      id: cafe.id,
      name: cafe.name,
      ownerEmail: cafe.owner.email,
      ownerName: cafe.owner.name,
      isActive: cafe.isActive,
      createdAt: cafe.createdAt,
      updatedAt: cafe.updatedAt,
      counts: cafe._count,
    },
    settings,
  };
};

const buildSettingsPayload = (body: Record<string, unknown>, fallback?: any): Prisma.CafeSettingsUncheckedUpdateInput => {
  const current = fallback ?? {};

  return {
    businessName: normalizeString(body.businessName ?? body.cafeName, current.businessName ?? "ShareVibe Cafe").slice(0, 140),
    sector: normalizeString(body.sector, current.sector ?? DEFAULT_SETTINGS.sector).slice(0, 80),
    description: normalizeOptionalPatchString(body, "description", current.description)?.slice(0, 600) ?? null,
    logoUrl: normalizeOptionalPatchString(body, "logoUrl", current.logoUrl),
    email: normalizeOptionalPatchString(body, "email", current.email),
    phone: normalizeOptionalPatchString(body, "phone", current.phone),
    address: normalizeOptionalPatchString(body, "address", current.address)?.slice(0, 240) ?? null,
    website: normalizeOptionalPatchString(body, "website", current.website),
    language: normalizeString(body.language, current.language ?? DEFAULT_SETTINGS.language).slice(0, 20),
    timezone: normalizeString(body.timezone, current.timezone ?? DEFAULT_SETTINGS.timezone).slice(0, 80),
    dateFormat: normalizeString(body.dateFormat, current.dateFormat ?? DEFAULT_SETTINGS.dateFormat).slice(0, 32),
    timeFormat: normalizeString(body.timeFormat, current.timeFormat ?? DEFAULT_SETTINGS.timeFormat).slice(0, 20),
    primaryColor: normalizeColor(body.primaryColor, current.primaryColor ?? DEFAULT_SETTINGS.primaryColor),
    secondaryColor: normalizeColor(body.secondaryColor, current.secondaryColor ?? DEFAULT_SETTINGS.secondaryColor),
    darkMode: normalizeBoolean(body.darkMode, current.darkMode ?? DEFAULT_SETTINGS.darkMode),
    notifyNewQrStand: normalizeBoolean(body.notifyNewQrStand, current.notifyNewQrStand ?? DEFAULT_SETTINGS.notifyNewQrStand),
    notifyNewCustomer: normalizeBoolean(body.notifyNewCustomer, current.notifyNewCustomer ?? DEFAULT_SETTINGS.notifyNewCustomer),
    emailReports: normalizeBoolean(body.emailReports, current.emailReports ?? DEFAULT_SETTINGS.emailReports),
    weeklySummary: normalizeBoolean(body.weeklySummary, current.weeklySummary ?? DEFAULT_SETTINGS.weeklySummary),
    billingPlan: normalizeBillingPlan(body.billingPlan ?? body.packageKey ?? current.billingPlan ?? DEFAULT_SETTINGS.billingPlan),
    invoiceEmail: hasOwn(body, "invoiceEmail") || hasOwn(body, "email")
      ? normalizeOptionalString(body.invoiceEmail ?? body.email)
      : normalizeOptionalString(current.invoiceEmail),
    adminEmails: hasOwn(body, "adminEmails") ? normalizeEmailList(body.adminEmails) : current.adminEmails ?? [],
    ...(normalizeJsonObject(body.integrations)
      ? { integrations: normalizeJsonObject(body.integrations) }
      : normalizeJsonObject(current.integrations)
        ? { integrations: normalizeJsonObject(current.integrations) }
        : {}),
    ...(normalizeJsonObject(body.domains)
      ? { domains: normalizeJsonObject(body.domains) }
      : normalizeJsonObject(current.domains)
        ? { domains: normalizeJsonObject(current.domains) }
        : {}),
    ...(normalizeJsonObject(body.security)
      ? { security: normalizeJsonObject(body.security) }
      : normalizeJsonObject(current.security)
        ? { security: normalizeJsonObject(current.security) }
        : {}),
    ...(normalizeJsonObject(body.extra)
      ? { extra: normalizeJsonObject(body.extra) }
      : normalizeJsonObject(current.extra)
        ? { extra: normalizeJsonObject(current.extra) }
        : {}),
  };
};

router.get(
  "/cafes/:cafeId/settings",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      return res.json(await toSettingsResponse(req.cafeId!));
    } catch (error: any) {
      logServerError("Failed to load cafe settings:", error);
      return res.status(error.status || 500).json({ error: getPublicErrorMessage("Failed to load settings", error) });
    }
  }
);

router.patch(
  "/cafes/:cafeId/settings",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const existing = await prisma.cafeSettings.findUnique({ where: { cafeId } });
      const data = buildSettingsPayload(req.body ?? {}, existing);
      const access = await getCafeSettingsAccess(req, cafeId);
      const currentAdminEmails = normalizeEmailList(existing?.adminEmails ?? []);
      const nextAdminEmails = normalizeEmailList(data.adminEmails ?? []);

      if (!access.canManageManagers && !sameEmailSet(currentAdminEmails, nextAdminEmails)) {
        return res.status(403).json({ error: "Only the cafe owner can manage administrators" });
      }

      if (!access.canManageManagers) {
        data.adminEmails = currentAdminEmails;
      }

      await prisma.$transaction([
        prisma.cafeSettings.upsert({
          where: { cafeId },
          create: {
            cafeId,
            businessName: String(data.businessName ?? "ShareVibe Cafe"),
            sector: String(data.sector ?? DEFAULT_SETTINGS.sector),
            description: data.description as string | null,
            logoUrl: data.logoUrl as string | null,
            email: data.email as string | null,
            phone: data.phone as string | null,
            address: data.address as string | null,
            website: data.website as string | null,
            language: String(data.language ?? DEFAULT_SETTINGS.language),
            timezone: String(data.timezone ?? DEFAULT_SETTINGS.timezone),
            dateFormat: String(data.dateFormat ?? DEFAULT_SETTINGS.dateFormat),
            timeFormat: String(data.timeFormat ?? DEFAULT_SETTINGS.timeFormat),
            primaryColor: String(data.primaryColor ?? DEFAULT_SETTINGS.primaryColor),
            secondaryColor: String(data.secondaryColor ?? DEFAULT_SETTINGS.secondaryColor),
            darkMode: Boolean(data.darkMode ?? DEFAULT_SETTINGS.darkMode),
            notifyNewQrStand: Boolean(data.notifyNewQrStand ?? DEFAULT_SETTINGS.notifyNewQrStand),
            notifyNewCustomer: Boolean(data.notifyNewCustomer ?? DEFAULT_SETTINGS.notifyNewCustomer),
            emailReports: Boolean(data.emailReports ?? DEFAULT_SETTINGS.emailReports),
            weeklySummary: Boolean(data.weeklySummary ?? DEFAULT_SETTINGS.weeklySummary),
            billingPlan: String(data.billingPlan ?? DEFAULT_SETTINGS.billingPlan),
            invoiceEmail: data.invoiceEmail as string | null,
            adminEmails: Array.isArray(data.adminEmails) ? (data.adminEmails as string[]) : [],
            integrations: data.integrations as Prisma.InputJsonObject | undefined,
            domains: data.domains as Prisma.InputJsonObject | undefined,
            security: data.security as Prisma.InputJsonObject | undefined,
            extra: data.extra as Prisma.InputJsonObject | undefined,
          },
          update: data,
        }),
        prisma.cafe.update({
          where: { id: cafeId },
          data: {
            name: String(data.businessName ?? "ShareVibe Cafe"),
            supportEmail: (data.email as string | null) ?? (data.invoiceEmail as string | null) ?? undefined,
          },
        }),
      ]);

      return res.json(await toSettingsResponse(cafeId));
    } catch (error: any) {
      logServerError("Failed to save cafe settings:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to save settings", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/settings/password-reset",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    return res.json({
      success: true,
      message:
        "Şifre işlemleri Google/Firebase hesabınız üzerinden yönetilir. Oturum e-postanızla Google hesap güvenliği sayfasından şifre güncelleyebilirsiniz.",
    });
  }
);

router.get(
  "/cafes/:cafeId/settings/export",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const [settingsResponse, customers, campaigns, qrStands, mediaStats] = await Promise.all([
        toSettingsResponse(cafeId),
        prisma.customer.findMany({ where: { cafeId }, take: 5000, orderBy: { createdAt: "desc" } }),
        prisma.campaign.findMany({ where: { cafeId }, take: 1000, orderBy: { createdAt: "desc" } }),
        prisma.qrStand.findMany({ where: { cafeId }, orderBy: { createdAt: "desc" } }),
        prisma.mediaStat.findMany({ where: { cafeId }, take: 5000, orderBy: { mediaCreatedAt: "desc" } }),
      ]);
      const format = normalizeString(req.query.format, "json").toLowerCase();

      if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "ShareVibe";
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.properties.date1904 = false;

        addWorksheet(
          workbook,
          "Kafe",
          [
            { header: "Alan", key: "field", width: 28 },
            { header: "Deger", key: "value", width: 56 },
          ],
          [
            { field: "Kafe ID", value: settingsResponse.cafe.id },
            { field: "Kafe Adi", value: settingsResponse.cafe.name },
            { field: "Owner E-posta", value: settingsResponse.cafe.ownerEmail },
            { field: "Aktif", value: settingsResponse.cafe.isActive ? "Evet" : "Hayir" },
            { field: "Isletme Adi", value: settingsResponse.settings.businessName },
            { field: "Kisa Tanim", value: settingsResponse.settings.description },
            { field: "Plan", value: settingsResponse.settings.billingPlan },
            { field: "Ana Renk", value: settingsResponse.settings.primaryColor },
            { field: "Ikinci Renk", value: settingsResponse.settings.secondaryColor },
            { field: "Yonetici E-postalari", value: settingsResponse.settings.adminEmails },
            { field: "Export Tarihi", value: new Date() },
          ]
        );

        addWorksheet(
          workbook,
          "Musteriler",
          [
            { header: "E-posta", key: "email", width: 34 },
            { header: "Ad", key: "name", width: 24 },
            { header: "Telefon", key: "phone", width: 20 },
            { header: "Segment", key: "segment", width: 20 },
            { header: "Etiketler", key: "tags", width: 34 },
            { header: "E-posta Izni", key: "emailSubscribed", width: 16 },
            { header: "Son Hareket", key: "lastInteractionType", width: 22 },
            { header: "Son Hareket Tarihi", key: "lastInteractionAt", width: 24 },
            { header: "Olusturma", key: "createdAt", width: 24 },
          ],
          customers.map((customer) => ({
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            segment: customer.segment,
            tags: customer.tags,
            emailSubscribed: customer.emailSubscribed ? "Evet" : "Hayir",
            lastInteractionType: customer.lastInteractionType,
            lastInteractionAt: customer.lastInteractionAt,
            createdAt: customer.createdAt,
          }))
        );

        addWorksheet(
          workbook,
          "Kampanyalar",
          [
            { header: "Konu", key: "subject", width: 36 },
            { header: "Aciklama", key: "description", width: 42 },
            { header: "Durum", key: "status", width: 16 },
            { header: "Alici", key: "recipientCount", width: 12 },
            { header: "Gonderilen", key: "sentCount", width: 14 },
            { header: "Basarisiz", key: "failedCount", width: 14 },
            { header: "Planlanan", key: "scheduledAt", width: 24 },
            { header: "Gonderim", key: "sentAt", width: 24 },
            { header: "Olusturma", key: "createdAt", width: 24 },
          ],
          campaigns.map((campaign) => ({
            subject: campaign.subject,
            description: campaign.description,
            status: campaign.status,
            recipientCount: campaign.recipientCount,
            sentCount: campaign.sentCount,
            failedCount: campaign.failedCount,
            scheduledAt: campaign.scheduledAt,
            sentAt: campaign.sentAt,
            createdAt: campaign.createdAt,
          }))
        );

        addWorksheet(
          workbook,
          "QR Standlar",
          [
            { header: "Stand", key: "name", width: 28 },
            { header: "Konum", key: "location", width: 28 },
            { header: "Masa Sayisi", key: "tableCount", width: 14 },
            { header: "Durum", key: "status", width: 14 },
            { header: "Foto Sayisi", key: "photoCount", width: 14 },
            { header: "Public URL", key: "publicUrl", width: 46 },
            { header: "Son Aktivite", key: "lastActivityAt", width: 24 },
            { header: "Not", key: "notes", width: 42 },
          ],
          qrStands.map((stand) => ({
            name: stand.name,
            location: stand.location,
            tableCount: stand.tableCount,
            status: stand.status,
            photoCount: stand.photoCount,
            publicUrl: stand.publicUrl,
            lastActivityAt: stand.lastActivityAt,
            notes: stand.notes,
          }))
        );

        addWorksheet(
          workbook,
          "Galeri",
          [
            { header: "Kaynak", key: "source", width: 18 },
            { header: "Masa", key: "tableNumber", width: 14 },
            { header: "Durum", key: "status", width: 14 },
            { header: "Goruntulenme", key: "viewsCount", width: 16 },
            { header: "Begeni", key: "likesCount", width: 12 },
            { header: "Paylasim", key: "shareCount", width: 12 },
            { header: "QR Etkilesim", key: "qrInteractionCount", width: 16 },
            { header: "Medya Tarihi", key: "mediaCreatedAt", width: 24 },
          ],
          mediaStats.map((media) => ({
            source: media.source,
            tableNumber: media.tableNumber,
            status: media.status,
            viewsCount: media.viewsCount,
            likesCount: media.likesCount,
            shareCount: media.shareCount,
            qrInteractionCount: media.qrInteractionCount,
            mediaCreatedAt: media.mediaCreatedAt,
          }))
        );

        addWorksheet(
          workbook,
          "Istatistik Ozeti",
          [
            { header: "Metrik", key: "metric", width: 30 },
            { header: "Deger", key: "value", width: 20 },
          ],
          [
            { metric: "Toplam Musteri", value: customers.length },
            { metric: "E-posta Izinli Musteri", value: customers.filter((customer) => customer.emailSubscribed).length },
            { metric: "Toplam Kampanya", value: campaigns.length },
            { metric: "Gonderilen Kampanya", value: campaigns.filter((campaign) => campaign.sentAt).length },
            { metric: "QR Stand", value: qrStands.length },
            { metric: "Galeri Kaydi", value: mediaStats.length },
            { metric: "Toplam Goruntulenme", value: mediaStats.reduce((sum, media) => sum + media.viewsCount, 0) },
            { metric: "Toplam Begeni", value: mediaStats.reduce((sum, media) => sum + media.likesCount, 0) },
            { metric: "Toplam Paylasim", value: mediaStats.reduce((sum, media) => sum + media.shareCount, 0) },
            { metric: "Toplam QR Etkilesim", value: mediaStats.reduce((sum, media) => sum + media.qrInteractionCount, 0) },
          ]
        );

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${cafeId}-sharevibe-veriler.xlsx"`);
        res.setHeader("Cache-Control", "no-store");
        await workbook.xlsx.write(res);
        return res.end();
      }

      return res.json({
        exportedAt: new Date().toISOString(),
        ...settingsResponse,
        data: {
          customers,
          campaigns,
          qrStands,
          mediaStats,
        },
      });
    } catch (error: any) {
      logServerError("Failed to export cafe settings data:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to export data", error) });
    }
  }
);

router.delete(
  "/cafes/:cafeId/settings/account",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const access = await getCafeSettingsAccess(req, cafeId);

      if (!access.canManageManagers) {
        return res.status(403).json({ error: "Only the cafe owner can delete this account" });
      }

      const confirmation = normalizeString(req.body?.confirmation);
      if (confirmation !== cafeId) {
        return res.status(400).json({ error: "Confirmation does not match cafe id" });
      }

      await prisma.cafe.delete({ where: { id: cafeId } });
      return res.json({ success: true, message: "Cafe account deleted" });
    } catch (error: any) {
      logServerError("Failed to delete cafe account:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to delete account", error) });
    }
  }
);

export default router;
