import { Request, Response, NextFunction } from "express";
import { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "../config/firebaseAdmin";
import { isExplicitDevAuthFallbackEnabled } from "../config/env";
import { prisma } from "../config/prisma";
import {
  type CafeAccessRole,
  getCafeAccessRole,
  hasSuperAdminAccess,
  normalizeAccessSlug,
} from "../config/accessPolicy";

export interface AuthRequest extends Request {
  userId?: string;
  firebaseUid?: string;
  cafeId?: string;
  role?: string;
  userEmail?: string;
  userName?: string | null;
  authProvider?: string;
  emailVerified?: boolean;
  accessRole?: CafeAccessRole;
  accessCafeIds?: string[];
  ownerCafeIds?: string[];
  managerCafeIds?: string[];
  isSuperOwner?: boolean;
}

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value: unknown) =>
  normalizeString(value).toLowerCase();

type VerifiedAccessClaims = {
  role: CafeAccessRole;
  cafeIds: string[];
  ownerCafeIds: string[];
  managerCafeIds: string[];
  isSuperOwner: boolean;
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((entry) => normalizeAccessSlug(entry))
        .filter(Boolean)
    : [];

const parseVerifiedAccessClaims = (decoded: DecodedIdToken | null): VerifiedAccessClaims => {
  if (!decoded) {
    return {
      role: "none",
      cafeIds: [],
      ownerCafeIds: [],
      managerCafeIds: [],
      isSuperOwner: false,
    };
  }

  const role = decoded.role === "super_owner" || decoded.role === "owner" || decoded.role === "manager"
    ? decoded.role
    : "none";
  const ownerCafeIds = toStringArray(decoded.sharevibeOwnerCafes);
  const managerCafeIds = toStringArray(decoded.sharevibeManagerCafes);
  const cafeIds = toStringArray(decoded.cafeIds);
  const isSuperOwner = decoded.sharevibeSuperOwner === true || role === "super_owner";

  if (isSuperOwner) {
    return {
      role: "super_owner",
      cafeIds: [],
      ownerCafeIds: [],
      managerCafeIds: [],
      isSuperOwner: true,
    };
  }

  const resolvedCafeIds = [...new Set([...cafeIds, ...ownerCafeIds, ...managerCafeIds])];

  return {
    role,
    cafeIds: resolvedCafeIds,
    ownerCafeIds,
    managerCafeIds,
    isSuperOwner: false,
  };
};

const getClaimCafeAccessRole = (claims: VerifiedAccessClaims | undefined, cafeId: string): CafeAccessRole => {
  if (!claims) {
    return "none";
  }

  if (claims.isSuperOwner) {
    return "super_owner";
  }

  if (claims.ownerCafeIds.includes(cafeId)) {
    return "owner";
  }

  if (claims.managerCafeIds.includes(cafeId) || claims.cafeIds.includes(cafeId)) {
    return "manager";
  }

  return "none";
};

const getEffectiveCafeAccessRole = (email: unknown, cafeId: string, claims: VerifiedAccessClaims | undefined): CafeAccessRole => {
  const claimRole = getClaimCafeAccessRole(claims, cafeId);
  if (claimRole !== "none") {
    return claimRole;
  }

  return getCafeAccessRole(email, cafeId);
};

const resolveEffectiveRole = (
  requestedRole: string,
  email: string,
  storedRole?: string | null,
  accessRole: CafeAccessRole = "none"
) => {
  if (hasSuperAdminAccess(email) || accessRole === "super_owner") {
    return "super_admin";
  }

  if (storedRole && storedRole !== "user" && storedRole !== "super_admin" && storedRole !== "admin") {
    return storedRole;
  }

  return requestedRole === "cafe_admin" ? "cafe_admin" : "user";
};

const toCafeDisplayName = (value: string) => {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "ShareVibe Cafe";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getBearerToken = (req: Request) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
};

const getTokenAuthContext = async (req: Request) => {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  const decoded = await firebaseAuth.verifyIdToken(token, true);
  const provider = typeof decoded.firebase?.sign_in_provider === "string"
    ? decoded.firebase.sign_in_provider
    : "";
  const accessClaims = parseVerifiedAccessClaims(decoded);

  return {
    firebaseId: decoded.uid,
    email: normalizeEmail(decoded.email),
    name: normalizeString(decoded.name),
    requestedRole: "",
    provider,
    emailVerified: decoded.email_verified === true,
    decoded,
    accessClaims,
  };
};

const getDevelopmentHeaderAuthContext = (req: Request) => {
  if (!isExplicitDevAuthFallbackEnabled()) {
    return null;
  }

  const firebaseId = normalizeString(req.headers["x-firebase-id"]);

  if (!firebaseId) {
    return null;
  }

  return {
    firebaseId,
    email: normalizeEmail(req.headers["x-firebase-email"]),
    name: normalizeString(req.headers["x-firebase-name"]),
    requestedRole: normalizeString(req.headers["x-user-role"]),
    provider: normalizeString(req.headers["x-auth-provider"]),
    emailVerified: normalizeString(req.headers["x-firebase-verified"]).toLowerCase() === "true",
    decoded: null as DecodedIdToken | null,
    accessClaims: parseVerifiedAccessClaims(null),
  };
};

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  let authContext: Awaited<ReturnType<typeof getTokenAuthContext>> | ReturnType<typeof getDevelopmentHeaderAuthContext>;

  try {
    authContext = await getTokenAuthContext(req);
  } catch {
    return res.status(401).json({ error: "Invalid authentication" });
  }

  authContext = authContext ?? getDevelopmentHeaderAuthContext(req);

  if (!authContext?.firebaseId) {
    return res.status(401).json({ error: "Missing authentication" });
  }

  const { firebaseId, email: normalizedEmail, name: firebaseName, requestedRole, accessClaims } = authContext;
  let user = await prisma.user.findUnique({ where: { firebaseId } });

  if (!user && normalizedEmail) {
    const userByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (userByEmail) {
      const effectiveRole = resolveEffectiveRole(requestedRole, normalizedEmail, userByEmail.role, accessClaims.role);
      user = await prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          firebaseId,
          ...(firebaseName
            ? { name: firebaseName }
            : {}),
          role: effectiveRole,
        },
      });
    }
  }

  if (!user && normalizedEmail) {
    try {
      const effectiveRole = resolveEffectiveRole(requestedRole, normalizedEmail, undefined, accessClaims.role);
      user = await prisma.user.create({
        data: {
          firebaseId,
          email: normalizedEmail,
          name: firebaseName || null,
          role: effectiveRole,
        },
      });
    } catch (error: any) {
      // Handle race condition: if unique constraint on firebaseId failed, user was just created
      if (error.code === "P2002") {
        user = await prisma.user.findUnique({ where: { firebaseId } });
      } else {
        throw error;
      }
    }
  }

  if (!user) {
    return res.status(401).json({ error: "User not found or could not be created" });
  }

  req.userId = user.id;
  req.firebaseUid = firebaseId;
  req.userEmail = normalizeEmail(user.email || normalizedEmail);
  req.userName = user.name || firebaseName || null;
  req.authProvider = authContext.provider;
  req.emailVerified = authContext.emailVerified;
  req.accessRole = accessClaims.role;
  req.accessCafeIds = accessClaims.cafeIds;
  req.ownerCafeIds = accessClaims.ownerCafeIds;
  req.managerCafeIds = accessClaims.managerCafeIds;
  req.isSuperOwner = accessClaims.isSuperOwner;
  req.role = resolveEffectiveRole(requestedRole, req.userEmail, user.role, accessClaims.role);

  next();
}

// Tenant scoping middleware - ensures cafe_admin can only access their cafe
export async function cafeAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const cafeId = normalizeAccessSlug(req.params.cafeId || req.body.cafeId || req.query.cafeId);

  if (!cafeId) {
    return res.status(400).json({ error: "Cafe ID is required" });
  }

  const currentUserEmail =
    req.userEmail ||
    normalizeEmail((await prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true } }))?.email);
  const accessRole = getEffectiveCafeAccessRole(currentUserEmail, cafeId, {
    role: req.accessRole || "none",
    cafeIds: req.accessCafeIds || [],
    ownerCafeIds: req.ownerCafeIds || [],
    managerCafeIds: req.managerCafeIds || [],
    isSuperOwner: req.isSuperOwner === true,
  });
  const canManageCafe = accessRole !== "none";
  const canCreateCafe = accessRole === "owner" || accessRole === "super_owner";

  let cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
  });

  if (!cafe && req.userId) {
    if (!canCreateCafe) {
      return res.status(403).json({ error: "Access denied" });
    }

    const requestedName = normalizeString(req.headers["x-cafe-name"] || req.body?.cafeName || req.query.cafeName);

    try {
      cafe = await prisma.cafe.create({
        data: {
          id: cafeId,
          name: requestedName || toCafeDisplayName(cafeId),
          ownerId: req.userId,
        },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        cafe = await prisma.cafe.findUnique({
          where: { id: cafeId },
        });
      } else {
        throw error;
      }
    }
  }

  if (!cafe) {
    return res.status(404).json({ error: "Cafe not found" });
  }

  if (!canManageCafe) {
    return res.status(403).json({ error: "Access denied" });
  }

  req.cafeId = cafeId;

  next();
}

// Check campaign ownership
export async function campaignOwnershipMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const campaignId = req.params.campaignId || req.body.campaignId;

  if (!campaignId) {
    return res.status(400).json({ error: "Campaign ID is required" });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId as string },
  });

  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  const accessRole = getEffectiveCafeAccessRole(req.userEmail, campaign.cafeId, {
    role: req.accessRole || "none",
    cafeIds: req.accessCafeIds || [],
    ownerCafeIds: req.ownerCafeIds || [],
    managerCafeIds: req.managerCafeIds || [],
    isSuperOwner: req.isSuperOwner === true,
  });

  if (accessRole === "none") {
    return res.status(403).json({ error: "Access denied" });
  }

  req.cafeId = campaign.cafeId;

  next();
}
