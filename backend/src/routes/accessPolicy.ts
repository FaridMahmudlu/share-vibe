import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import express, { Response } from "express";
import { firebaseAuth } from "../config/firebaseAdmin";
import {
  getResolvedAccessPolicy,
  hasSuperAdminAccess,
  normalizeAccessEmail,
  normalizeAccessSlug,
  type CafeAccessRole,
} from "../config/accessPolicy";
import { AuthRequest, authMiddleware } from "../middleware/auth";

type AccessPolicyInput = {
  superOwnerEmails?: string[];
  cafeAccess?: Array<{
    cafeSlug?: string;
    ownerEmails?: string[];
    managerEmails?: string[];
  }>;
};

type AccessAssignment = {
  email: string;
  role: CafeAccessRole;
  cafeIds: string[];
  ownerCafeIds: string[];
  managerCafeIds: string[];
};

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACCESS_MANAGEMENT_CAFE_SLUG = normalizeAccessSlug(process.env.SHAREVIBE_ACCESS_MANAGEMENT_CAFE_SLUG || "ava-coffee");

const createPolicyPathCandidates = () => [
  process.env.SHAREVIBE_ACCESS_POLICY_PATH || "",
  resolve(process.cwd(), "config", "access", "policy.json"),
  resolve(process.cwd(), "..", "config", "access", "policy.json"),
  resolve(__dirname, "..", "..", "..", "config", "access", "policy.json"),
];

const resolvePolicyPath = () => {
  for (const candidate of createPolicyPathCandidates()) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return resolve(process.cwd(), "config", "access", "policy.json");
};

const uniqueEmails = (emails: unknown) =>
  [...new Set((Array.isArray(emails) ? emails : []).map(normalizeAccessEmail).filter(Boolean))]
    .filter((email) => emailPattern.test(email));

const normalizePolicy = (policy: AccessPolicyInput) => ({
  superOwnerEmails: uniqueEmails(policy.superOwnerEmails),
  cafeAccess: (Array.isArray(policy.cafeAccess) ? policy.cafeAccess : [])
    .map((rule) => ({
      cafeSlug: normalizeAccessSlug(rule.cafeSlug),
      ownerEmails: uniqueEmails(rule.ownerEmails),
      managerEmails: uniqueEmails(rule.managerEmails),
    }))
    .filter((rule) => rule.cafeSlug),
});

const readManagedPolicy = () => {
  const policyPath = resolvePolicyPath();
  if (!existsSync(policyPath)) {
    return normalizePolicy({});
  }

  return normalizePolicy(JSON.parse(readFileSync(policyPath, "utf8")) as AccessPolicyInput);
};

const writeManagedPolicy = (policy: ReturnType<typeof normalizePolicy>) => {
  const policyPath = resolvePolicyPath();
  writeFileSync(policyPath, `${JSON.stringify(normalizePolicy(policy), null, 2)}\n`, "utf8");
  return policyPath;
};

const getAccessManagementWorkspace = (req: AuthRequest) =>
  normalizeAccessSlug(
    req.header("x-access-workspace") ||
      (typeof req.query.workspaceSlug === "string" ? req.query.workspaceSlug : "") ||
      (typeof req.body?.workspaceSlug === "string" ? req.body.workspaceSlug : "")
  );

const requireAccessManagementWorkspace = (req: AuthRequest, res: Response) => {
  const requestedWorkspace = getAccessManagementWorkspace(req);

  if (requestedWorkspace === ACCESS_MANAGEMENT_CAFE_SLUG) {
    return true;
  }

  res.status(403).json({
    error: "Yetki yönetimi yalnızca AVA Coffee panelinden yürütülebilir.",
  });
  return false;
};

const requireSuperOwner = (req: AuthRequest, res: Response) => {
  if (req.isSuperOwner || req.accessRole === "super_owner" || req.role === "super_admin" || hasSuperAdminAccess(req.userEmail)) {
    return true;
  }

  res.status(403).json({
    error: "Bu işlem için Super Owner yetkisi gereklidir.",
  });
  return false;
};

const resolveAssignments = (policy: ReturnType<typeof normalizePolicy>): AccessAssignment[] => {
  const assignments = new Map<string, AccessAssignment>();

  for (const email of policy.superOwnerEmails) {
    assignments.set(email, {
      email,
      role: "super_owner",
      cafeIds: [],
      ownerCafeIds: [],
      managerCafeIds: [],
    });
  }

  for (const rule of policy.cafeAccess) {
    for (const email of rule.ownerEmails) {
      if (assignments.get(email)?.role === "super_owner") {
        continue;
      }

      const current = assignments.get(email) || {
        email,
        role: "owner" as CafeAccessRole,
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      };
      current.role = "owner";
      current.ownerCafeIds = [...new Set([...current.ownerCafeIds, rule.cafeSlug])];
      current.cafeIds = [...new Set([...current.cafeIds, rule.cafeSlug])];
      assignments.set(email, current);
    }

    for (const email of rule.managerEmails) {
      const existing = assignments.get(email);
      if (existing?.role === "super_owner" || existing?.role === "owner") {
        if (existing.role === "owner") {
          existing.managerCafeIds = [...new Set([...existing.managerCafeIds, rule.cafeSlug])];
          existing.cafeIds = [...new Set([...existing.cafeIds, rule.cafeSlug])];
        }
        continue;
      }

      const current = existing || {
        email,
        role: "manager" as CafeAccessRole,
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      };
      current.role = "manager";
      current.managerCafeIds = [...new Set([...current.managerCafeIds, rule.cafeSlug])];
      current.cafeIds = [...new Set([...current.cafeIds, rule.cafeSlug])];
      assignments.set(email, current);
    }
  }

  return [...assignments.values()].sort((a, b) => a.email.localeCompare(b.email));
};

const buildAccessClaims = (assignment: AccessAssignment) => {
  if (assignment.role === "super_owner") {
    return {
      admin: true,
      role: "super_owner",
      cafeIds: [],
      sharevibeSuperOwner: true,
      sharevibeOwnerCafes: [],
      sharevibeManagerCafes: [],
    };
  }

  if (assignment.role === "owner") {
    return {
      role: "owner",
      cafeIds: assignment.cafeIds,
      sharevibeSuperOwner: false,
      sharevibeOwnerCafes: assignment.ownerCafeIds,
      sharevibeManagerCafes: assignment.managerCafeIds,
    };
  }

  return {
    role: "manager",
    cafeIds: assignment.cafeIds,
    sharevibeSuperOwner: false,
    sharevibeOwnerCafes: [],
    sharevibeManagerCafes: assignment.managerCafeIds,
  };
};

const mergeClaims = (currentClaims: Record<string, unknown> | undefined, accessClaims: Record<string, unknown>) => {
  const nextClaims = { ...(currentClaims || {}) };

  delete nextClaims.admin;
  delete nextClaims.role;
  delete nextClaims.cafeIds;
  delete nextClaims.sharevibeSuperOwner;
  delete nextClaims.sharevibeOwnerCafes;
  delete nextClaims.sharevibeManagerCafes;
  Object.assign(nextClaims, accessClaims);

  if (accessClaims.role !== "super_owner") {
    delete nextClaims.admin;
  }

  return nextClaims;
};

const syncAssignments = async (assignments: AccessAssignment[], targetEmail?: string) => {
  const selectedAssignments = targetEmail
    ? assignments.filter((assignment) => normalizeAccessEmail(assignment.email) === normalizeAccessEmail(targetEmail))
    : assignments;
  const result = {
    synced: 0,
    missingUsers: [] as string[],
    failed: [] as Array<{ email: string; code: string }>,
  };

  for (const assignment of selectedAssignments) {
    try {
      const user = await firebaseAuth.getUserByEmail(assignment.email);
      await firebaseAuth.setCustomUserClaims(user.uid, mergeClaims(user.customClaims, buildAccessClaims(assignment)));
      result.synced += 1;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
      if (code === "auth/user-not-found") {
        result.missingUsers.push(assignment.email);
      } else {
        result.failed.push({ email: assignment.email, code });
      }
    }
  }

  return result;
};

router.get("/access-policy", authMiddleware, async (req: AuthRequest, res) => {
  if (!requireAccessManagementWorkspace(req, res)) {
    return;
  }

  if (!requireSuperOwner(req, res)) {
    return;
  }

  const managedPolicy = readManagedPolicy();
  res.json({
    policy: managedPolicy,
    effectivePolicy: getResolvedAccessPolicy(),
    assignments: resolveAssignments(managedPolicy),
  });
});

router.put("/access-policy", authMiddleware, async (req: AuthRequest, res) => {
  if (!requireAccessManagementWorkspace(req, res)) {
    return;
  }

  if (!requireSuperOwner(req, res)) {
    return;
  }

  const policy = normalizePolicy(req.body?.policy || req.body || {});
  writeManagedPolicy(policy);

  res.json({
    success: true,
    policy,
    assignments: resolveAssignments(policy),
    message: "Yetki politikası güncellendi. Custom claims senkronizasyonu önerilir.",
  });
});

router.post("/access-policy/sync-claims", authMiddleware, async (req: AuthRequest, res) => {
  if (!requireAccessManagementWorkspace(req, res)) {
    return;
  }

  if (!requireSuperOwner(req, res)) {
    return;
  }

  const policy = readManagedPolicy();
  const result = await syncAssignments(resolveAssignments(policy), normalizeAccessEmail(req.body?.email));

  if (result.failed.length > 0) {
    return res.status(500).json({
      error: "Bazı kullanıcıların custom claims senkronizasyonu tamamlanamadı.",
      result,
    });
  }

  res.json({
    success: true,
    result,
    message: "Firebase custom claims senkronizasyonu tamamlandı.",
  });
});

export default router;
