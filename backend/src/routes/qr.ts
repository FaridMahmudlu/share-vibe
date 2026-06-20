import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { AuthRequest, authMiddleware, cafeAuthMiddleware } from "../middleware/auth";
import { getPublicErrorMessage, logServerError } from "../utils/errors";
import { prisma } from "../config/prisma";

const router = Router();

type StandStatus = "active" | "inactive" | "pending";
type RequestStatus = "pending" | "contacted" | "scheduled" | "completed" | "cancelled";

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeOptionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
};

const truncate = (value: string | null, maxLength: number) =>
  value && value.length > maxLength ? value.slice(0, maxLength).trim() : value;

const parsePositiveInt = (value: unknown, fallback = 1) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

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

const parseStandStatus = (value: unknown): StandStatus | "all" => {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized === "active" || normalized === "inactive" || normalized === "pending") {
    return normalized;
  }

  return "all";
};

const parseRequestStatus = (value: unknown): RequestStatus | "all" => {
  const normalized = normalizeString(value).toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "contacted" ||
    normalized === "scheduled" ||
    normalized === "completed" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "all";
};

const toIso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);

const buildStandPayload = (body: any, fallbackName = "QR Stand") => {
  const name = normalizeString(body?.name || body?.table || body?.label) || fallbackName;
  const location = normalizeString(body?.location || body?.area || body?.table || body?.name) || name;
  const notesFromBody = normalizeOptionalString(body?.notes);
  const photoCount = parseNonNegativeInt(body?.photoCount ?? body?.shareCount, 0);
  const generatedNotes =
    photoCount > 0 ? `${photoCount} website fotoğrafı bu QR masasına bağlı.` : notesFromBody;
  const status = parseStandStatus(body?.status);
  const publicUrl = normalizeOptionalString(body?.publicUrl || body?.url || body?.qrTargetUrl);

  return {
    name: truncate(name, 120)!,
    location: truncate(location, 160)!,
    tableCount: Math.min(parsePositiveInt(body?.tableCount, 1), 500),
    status: status === "all" ? "active" : status,
    notes: truncate(generatedNotes, 280),
    photoCount,
    publicUrl: truncate(publicUrl, 500),
    lastActivityAt: parseOptionalDate(body?.lastActivityAt),
  };
};

const buildRequestPayload = (req: AuthRequest) => {
  const body = req.body ?? {};
  const contactName = normalizeString(body.contactName || body.name || body.requestedByName);
  const contactEmail = normalizeString(body.contactEmail || body.email || req.headers["x-firebase-email"]);
  const contactPhone = normalizeOptionalString(body.contactPhone || body.phone);
  const standName = normalizeOptionalString(body.standName || body.tableLabel || body.name);
  const location = normalizeOptionalString(body.location || body.address);
  const placement = normalizeOptionalString(body.placement || body.placementNotes || body.mountingPlace);
  const notes = normalizeOptionalString(body.notes);
  const tableCount = Math.min(parsePositiveInt(body.tableCount ?? body.standCount, 1), 500);
  const preferredDate = parseOptionalDate(body.preferredDate);

  return {
    contactName: truncate(contactName, 120)!,
    contactEmail: truncate(contactEmail.toLowerCase(), 180)!,
    contactPhone: truncate(contactPhone, 60),
    standName: truncate(standName, 120),
    location: truncate(location, 180),
    placement: truncate(placement, 180),
    tableCount,
    preferredDate,
    notes: truncate(notes, 600),
  };
};

const getStandForCafe = async (standId: string, cafeId: string) => {
  const stand = await prisma.qrStand.findUnique({ where: { id: standId } });

  if (!stand || stand.cafeId !== cafeId) {
    return null;
  }

  return stand;
};

const buildStandResponse = (stand: any) => ({
  id: stand.id,
  name: stand.name,
  location: stand.location,
  tableCount: stand.tableCount,
  status: stand.status,
  notes: stand.notes,
  photoCount: stand.photoCount ?? 0,
  publicUrl: stand.publicUrl ?? null,
  lastActivityAt: toIso(stand.lastActivityAt),
  createdAt: toIso(stand.createdAt),
  updatedAt: toIso(stand.updatedAt),
  requestCount: stand._count?.requests ?? 0,
});

const buildRequestResponse = (request: any) => ({
  id: request.id,
  contactName: request.contactName,
  contactEmail: request.contactEmail,
  contactPhone: request.contactPhone,
  standName: request.standName,
  location: request.location,
  placement: request.placement,
  tableCount: request.tableCount,
  preferredDate: toIso(request.preferredDate),
  notes: request.notes,
  status: request.status,
  createdAt: toIso(request.createdAt),
  updatedAt: toIso(request.updatedAt),
});

router.post(
  "/cafes/:cafeId/qr-stands/sync",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const incomingStands = Array.isArray(req.body?.stands) ? req.body.stands : [];
      const deduped = new Map<string, ReturnType<typeof buildStandPayload>>();

      for (const item of incomingStands.slice(0, 100)) {
        const payload = buildStandPayload(item);
        const key = payload.name.toLocaleLowerCase("tr");
        deduped.set(key, payload);
      }

      const synced = [];

      for (const payload of deduped.values()) {
        const existing = await prisma.qrStand.findFirst({
          where: {
            cafeId,
            name: {
              equals: payload.name,
              mode: "insensitive",
            },
          },
        });

        const stand = existing
          ? await prisma.qrStand.update({
              where: { id: existing.id },
              data: payload,
              include: { _count: { select: { requests: true } } },
            })
          : await prisma.qrStand.create({
              data: {
                ...payload,
                cafeId,
              },
              include: { _count: { select: { requests: true } } },
            });

        synced.push(buildStandResponse(stand));
      }

      const incomingStandNames = new Set(
        Array.from(deduped.values()).map((payload) => payload.name.toLocaleLowerCase("tr"))
      );
      const existingStands = await prisma.qrStand.findMany({
        where: { cafeId },
        include: { _count: { select: { requests: true } } },
      });
      const staleGeneratedStands = existingStands.filter((stand) => {
        const normalizedName = stand.name.toLocaleLowerCase("tr");
        const normalizedNotes = (stand.notes ?? "").toLocaleLowerCase("tr");
        const hasGeneratedPlaceholderNote =
          normalizedNotes.includes("website qr") || normalizedNotes.includes("qr masası hazır");

        return (
          !incomingStandNames.has(normalizedName) &&
          (stand.photoCount ?? 0) === 0 &&
          stand._count.requests === 0 &&
          hasGeneratedPlaceholderNote
        );
      });

      for (const stand of staleGeneratedStands) {
        await prisma.qrStand.delete({ where: { id: stand.id } });
      }

      return res.json({
        syncedCount: synced.length,
        deletedStaleCount: staleGeneratedStands.length,
        stands: synced,
      });
    } catch (error: any) {
      logServerError("Failed to sync QR stands:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to sync QR stands", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/qr-stands",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const search = normalizeString(req.query.search);
      const status = parseStandStatus(req.query.status);
      const sort = normalizeString(req.query.sort) || "createdAt";
      const order = normalizeString(req.query.order).toLowerCase() === "asc" ? "asc" : "desc";

      const baseWhere = { cafeId };
      const filteredWhere = {
        cafeId,
        ...(status !== "all" ? { status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { location: { contains: search, mode: "insensitive" as const } },
                { notes: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const orderBy: Prisma.QrStandOrderByWithRelationInput =
        sort === "name"
          ? { name: order as Prisma.SortOrder }
          : sort === "location"
            ? { location: order as Prisma.SortOrder }
          : sort === "tableCount"
            ? { tableCount: order as Prisma.SortOrder }
            : sort === "photoCount"
              ? { photoCount: order as Prisma.SortOrder }
              : sort === "lastActivityAt"
                ? { lastActivityAt: { sort: order as Prisma.SortOrder, nulls: "last" } }
              : sort === "status"
                ? { status: order as Prisma.SortOrder }
                : { createdAt: order as Prisma.SortOrder };

      const [allStands, stands, pendingRequests, latestRequests] = await Promise.all([
        prisma.qrStand.findMany({
          where: baseWhere,
          include: { _count: { select: { requests: true } } },
        }),
        prisma.qrStand.findMany({
          where: filteredWhere,
          orderBy,
          include: { _count: { select: { requests: true } } },
        }),
        prisma.qrStandRequest.count({
          where: { cafeId, status: "pending" },
        }),
        prisma.qrStandRequest.findMany({
          where: { cafeId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      const totalStands = allStands.length;
      const activeStands = allStands.filter((stand) => stand.status === "active").length;
      const pendingStands = allStands.filter((stand) => stand.status === "pending").length;
      const inactiveStands = allStands.filter((stand) => stand.status === "inactive").length;
      const totalQrPhotos = allStands.reduce((sum, stand) => sum + (stand.photoCount ?? 0), 0);
      const photoActiveStands = allStands.filter((stand) => (stand.photoCount ?? 0) > 0).length;
      const averagePhotosPerStand = totalStands > 0 ? Number((totalQrPhotos / totalStands).toFixed(1)) : 0;
      const activityRate = totalStands > 0 ? Math.round((photoActiveStands / totalStands) * 100) : 0;
      const topStand =
        [...allStands].sort((left, right) => {
          const photoDiff = (right.photoCount ?? 0) - (left.photoCount ?? 0);
          if (photoDiff !== 0) {
            return photoDiff;
          }

          return new Date(right.lastActivityAt ?? right.updatedAt).getTime() - new Date(left.lastActivityAt ?? left.updatedAt).getTime();
        })[0] ?? null;
      const latestActivity = [...allStands]
        .map((stand) => stand.lastActivityAt)
        .filter(Boolean)
        .sort((left, right) => new Date(right!).getTime() - new Date(left!).getTime())[0] ?? null;

      return res.json({
        summary: {
          totalStands,
          totalTables: totalStands,
          activeStands,
          pendingStands,
          inactiveStands,
          pendingRequests,
          totalQrPhotos,
          photoActiveStands,
          averagePhotosPerStand,
          averageTablesPerStand: 1,
          activityRate,
          topStand: topStand
            ? {
                id: topStand.id,
                name: topStand.name,
                photoCount: topStand.photoCount ?? 0,
                lastActivityAt: toIso(topStand.lastActivityAt),
              }
            : null,
          largestStand: topStand
            ? {
                id: topStand.id,
                name: topStand.name,
                tableCount: topStand.tableCount,
              }
            : null,
          latestActivityAt: toIso(latestActivity),
          latestRequestAt: latestRequests[0]?.createdAt ? toIso(latestRequests[0].createdAt) : null,
        },
        stands: stands.map(buildStandResponse),
        recentRequests: latestRequests.map(buildRequestResponse),
      });
    } catch (error: any) {
      return res.status(500).json({ error: getPublicErrorMessage("Failed to fetch QR dashboard", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/qr-stands",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const payload = buildStandPayload(req.body);

      if (!payload.name) {
        return res.status(400).json({ error: "Stand name is required" });
      }

      const existing = await prisma.qrStand.findFirst({
        where: {
          cafeId,
          name: {
            equals: payload.name,
            mode: "insensitive",
          },
        },
      });

      const stand = existing
        ? await prisma.qrStand.update({
            where: { id: existing.id },
            data: payload,
            include: { _count: { select: { requests: true } } },
          })
        : await prisma.qrStand.create({
            data: {
              ...payload,
              cafeId,
            },
            include: { _count: { select: { requests: true } } },
          });

      return res.status(existing ? 200 : 201).json({ stand: buildStandResponse(stand) });
    } catch (error: any) {
      logServerError("Failed to save QR stand:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to save QR stand", error) });
    }
  }
);

router.patch(
  "/cafes/:cafeId/qr-stands/:standId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const standId = req.params.standId;
      const existing = await getStandForCafe(standId, cafeId);

      if (!existing) {
        return res.status(404).json({ error: "QR stand not found" });
      }

      const payload = buildStandPayload(
        {
          ...existing,
          ...req.body,
        },
        existing.name
      );

      const stand = await prisma.qrStand.update({
        where: { id: standId },
        data: payload,
        include: { _count: { select: { requests: true } } },
      });

      return res.json({ stand: buildStandResponse(stand) });
    } catch (error: any) {
      logServerError("Failed to update QR stand:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to update QR stand", error) });
    }
  }
);

router.delete(
  "/cafes/:cafeId/qr-stands/:standId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const standId = req.params.standId;
      const existing = await getStandForCafe(standId, cafeId);

      if (!existing) {
        return res.status(404).json({ error: "QR stand not found" });
      }

      await prisma.qrStand.delete({ where: { id: standId } });

      return res.json({ message: "QR stand deleted" });
    } catch (error: any) {
      logServerError("Failed to delete QR stand:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to delete QR stand", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/qr-stand-requests",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const status = parseRequestStatus(req.query.status);

      const requests = await prisma.qrStandRequest.findMany({
        where: {
          cafeId,
          ...(status !== "all" ? { status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ requests: requests.map(buildRequestResponse) });
    } catch (error: any) {
      return res.status(500).json({ error: getPublicErrorMessage("Failed to fetch QR requests", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/qr-stand-requests",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const payload = buildRequestPayload(req);

      if (!payload.contactName) {
        return res.status(400).json({ error: "Contact name is required" });
      }

      if (!payload.contactEmail) {
        return res.status(400).json({ error: "Contact email is required" });
      }

      const request = await prisma.qrStandRequest.create({
        data: {
          cafeId,
          requestedById: req.userId ?? null,
          contactName: payload.contactName,
          contactEmail: payload.contactEmail,
          contactPhone: payload.contactPhone,
          standName: payload.standName,
          location: payload.location,
          placement: payload.placement,
          tableCount: payload.tableCount,
          preferredDate: payload.preferredDate,
          notes: payload.notes,
          status: "pending",
        },
      });

      return res.status(201).json({
        request: buildRequestResponse(request),
        message: "QR stand request created successfully",
      });
    } catch (error: any) {
      return res.status(500).json({ error: getPublicErrorMessage("Failed to create QR stand request", error) });
    }
  }
);

export default router;
