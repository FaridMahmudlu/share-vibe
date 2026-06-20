import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { GENERATED_ACCESS_POLICY } from "./accessPolicy.generated";

export type CafeAccessRole = "none" | "manager" | "owner" | "super_owner";

type CafeAccessRule = {
  cafeSlug: string;
  ownerEmails: string[];
  managerEmails?: string[];
};

type ResolvedCafeAccessRule = {
  cafeSlug: string;
  ownerEmails: Set<string>;
  managerEmails: Set<string>;
};

type ResolvedAccessPolicy = {
  superOwnerEmails: string[];
  cafeAccess: CafeAccessRule[];
};

const parseEmailList = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((email) => normalizeAccessEmail(email))
    .filter(Boolean);

const parseCafeAccessJson = (value: string | undefined): CafeAccessRule[] => {
  if (!value?.trim()) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((rule) => {
      const input = rule as Partial<CafeAccessRule>;
      return {
        cafeSlug: normalizeAccessSlug(input.cafeSlug),
        ownerEmails: Array.isArray(input.ownerEmails) ? input.ownerEmails : [],
        managerEmails: Array.isArray(input.managerEmails) ? input.managerEmails : [],
      };
    })
    .filter((rule) => rule.cafeSlug);
};

export const normalizeAccessEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizeAccessSlug = (value: unknown) =>
  typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";

const createEmailSet = (emails: readonly string[]) =>
  new Set(emails.map((email) => normalizeAccessEmail(email)).filter(Boolean));

const uniqueEmails = (emails: readonly string[]) =>
  [...createEmailSet(emails)];

const accessPolicyCandidates = () => [
  process.env.SHAREVIBE_ACCESS_POLICY_PATH || "",
  resolve(process.cwd(), "config", "access", "policy.json"),
  resolve(process.cwd(), "..", "config", "access", "policy.json"),
  resolve(__dirname, "..", "..", "..", "config", "access", "policy.json"),
];

let runtimePolicyCache: {
  path: string;
  mtimeMs: number;
  policy: ResolvedAccessPolicy;
} | null = null;

const normalizePolicy = (policy: Partial<ResolvedAccessPolicy>): ResolvedAccessPolicy => ({
  superOwnerEmails: uniqueEmails(policy.superOwnerEmails || []),
  cafeAccess: (Array.isArray(policy.cafeAccess) ? policy.cafeAccess : [])
    .map((rule) => ({
      cafeSlug: normalizeAccessSlug(rule.cafeSlug),
      ownerEmails: uniqueEmails(rule.ownerEmails || []),
      managerEmails: uniqueEmails(rule.managerEmails || []),
    }))
    .filter((rule) => rule.cafeSlug),
});

const readRuntimeAccessPolicy = (): ResolvedAccessPolicy => {
  for (const candidate of accessPolicyCandidates()) {
    if (!candidate || !existsSync(candidate)) {
      continue;
    }

    try {
      const stats = statSync(candidate);
      if (runtimePolicyCache?.path === candidate && runtimePolicyCache.mtimeMs === stats.mtimeMs) {
        return runtimePolicyCache.policy;
      }

      const policy = normalizePolicy(JSON.parse(readFileSync(candidate, "utf8")) as ResolvedAccessPolicy);
      runtimePolicyCache = {
        path: candidate,
        mtimeMs: stats.mtimeMs,
        policy,
      };
      return policy;
    } catch (error) {
      console.warn("[access-policy] Runtime access policy could not be read; generated policy fallback is used.");
    }
  }

  return normalizePolicy({
    superOwnerEmails: [...GENERATED_ACCESS_POLICY.superOwnerEmails],
    cafeAccess: [...GENERATED_ACCESS_POLICY.cafeAccess],
  });
};

export const getResolvedAccessPolicy = (): ResolvedAccessPolicy => {
  const runtimePolicy = readRuntimeAccessPolicy();
  const envCafeAccess = parseCafeAccessJson(process.env.SHAREVIBE_CAFE_ACCESS_JSON || process.env.BACKEND_CAFE_ACCESS_JSON);

  return normalizePolicy({
    superOwnerEmails: [
      ...GENERATED_ACCESS_POLICY.superOwnerEmails,
      ...runtimePolicy.superOwnerEmails,
      ...parseEmailList(process.env.SHAREVIBE_SUPER_OWNER_EMAILS),
      ...parseEmailList(process.env.BACKEND_SUPER_ADMIN_EMAILS),
    ],
    cafeAccess: [
      ...GENERATED_ACCESS_POLICY.cafeAccess,
      ...runtimePolicy.cafeAccess,
      ...envCafeAccess,
    ],
  });
};

const getResolvedSets = () => {
  const policy = getResolvedAccessPolicy();

  return {
    superOwnerEmailSet: createEmailSet(policy.superOwnerEmails),
    cafeAccessRules: policy.cafeAccess
      .map<ResolvedCafeAccessRule>((rule) => ({
        cafeSlug: normalizeAccessSlug(rule.cafeSlug),
        ownerEmails: createEmailSet(rule.ownerEmails),
        managerEmails: createEmailSet(rule.managerEmails || []),
      }))
      .filter((rule) => rule.cafeSlug),
  };
};

export const hasSuperAdminAccess = (email: unknown) =>
  getResolvedSets().superOwnerEmailSet.has(normalizeAccessEmail(email));

export const getCafeAccessRole = (email: unknown, cafeSlug: unknown): CafeAccessRole => {
  const normalizedEmail = normalizeAccessEmail(email);
  const normalizedSlug = normalizeAccessSlug(cafeSlug);

  if (!normalizedEmail) {
    return "none";
  }

  if (hasSuperAdminAccess(normalizedEmail)) {
    return "super_owner";
  }

  const cafeRule = getResolvedSets().cafeAccessRules.find((rule) => rule.cafeSlug === normalizedSlug);
  if (!cafeRule) {
    return "none";
  }

  if (cafeRule.ownerEmails.has(normalizedEmail)) {
    return "owner";
  }

  if (cafeRule.managerEmails.has(normalizedEmail)) {
    return "manager";
  }

  return "none";
};

export const canAccessCafeAdmin = (email: unknown, cafeSlug: unknown) =>
  getCafeAccessRole(email, cafeSlug) !== "none";

export const canOwnCafeAdmin = (email: unknown, cafeSlug: unknown) => {
  const role = getCafeAccessRole(email, cafeSlug);
  return role === "owner" || role === "super_owner";
};
