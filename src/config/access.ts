import { GENERATED_ACCESS_POLICY } from './accessPolicy.generated';

export type CafeAccessRole = 'none' | 'manager' | 'owner' | 'super_owner';

export type CafeAccessRule = {
  cafeSlug: string;
  ownerEmails: string[];
  managerEmails?: string[];
};

const parseEmailList = (value: string | undefined) =>
  (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

const GENERATED_CAFE_ACCESS = GENERATED_ACCESS_POLICY.cafeAccess as readonly {
  cafeSlug: string;
  ownerEmails: readonly string[];
  managerEmails?: readonly string[];
}[];

/*
 * Central admin access policy.
 *
 * Production rule:
 * - Super Owners can access every cafe.
 * - Cafe owners/managers can access only the cafe slugs listed here.
 * - Normal customers are blocked from all admin panels.
 *
 * Add real production emails here. Do not add passwords, tokens, keys, or
 * private credentials. Emails are access identifiers, not secrets.
 */
export const SHAREVIBE_ACCESS_POLICY = {
  superOwnerEmails: [
    ...GENERATED_ACCESS_POLICY.superOwnerEmails,
    ...parseEmailList(import.meta.env.VITE_SUPER_ADMIN_EMAILS),
  ],
  cafeAccess: GENERATED_CAFE_ACCESS.map((rule) => ({
    cafeSlug: rule.cafeSlug,
    ownerEmails: [...rule.ownerEmails],
    managerEmails: [...(rule.managerEmails || [])],
  })) satisfies CafeAccessRule[],
};

const normalizeAccessEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeAccessSlug = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

const createEmailSet = (emails: string[]) =>
  new Set(emails.map((email) => normalizeAccessEmail(email)).filter(Boolean));

const SUPER_OWNER_EMAIL_SET = createEmailSet(SHAREVIBE_ACCESS_POLICY.superOwnerEmails);

const CAFE_ACCESS_RULES = SHAREVIBE_ACCESS_POLICY.cafeAccess
  .map((rule) => ({
    cafeSlug: normalizeAccessSlug(rule.cafeSlug),
    ownerEmails: createEmailSet(rule.ownerEmails),
    managerEmails: createEmailSet(rule.managerEmails || []),
  }))
  .filter((rule) => rule.cafeSlug);

export { normalizeAccessEmail, normalizeAccessSlug };

export const hasSuperAdminAccess = (email: unknown) =>
  SUPER_OWNER_EMAIL_SET.has(normalizeAccessEmail(email));

export const getCafeAccessRole = (email: unknown, cafeSlug: unknown): CafeAccessRole => {
  const normalizedEmail = normalizeAccessEmail(email);
  const normalizedSlug = normalizeAccessSlug(cafeSlug);

  if (!normalizedEmail) {
    return 'none';
  }

  if (hasSuperAdminAccess(normalizedEmail)) {
    return 'super_owner';
  }

  const cafeRule = CAFE_ACCESS_RULES.find((rule) => rule.cafeSlug === normalizedSlug);
  if (!cafeRule) {
    return 'none';
  }

  if (cafeRule.ownerEmails.has(normalizedEmail)) {
    return 'owner';
  }

  if (cafeRule.managerEmails.has(normalizedEmail)) {
    return 'manager';
  }

  return 'none';
};

export const canAccessCafeAdmin = (email: unknown, cafeSlug: unknown) =>
  getCafeAccessRole(email, cafeSlug) !== 'none';

export const getConfiguredAccessibleCafeSlugs = (email: unknown) => {
  const normalizedEmail = normalizeAccessEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  if (hasSuperAdminAccess(normalizedEmail)) {
    return CAFE_ACCESS_RULES.map((rule) => rule.cafeSlug);
  }

  return CAFE_ACCESS_RULES
    .filter((rule) => rule.ownerEmails.has(normalizedEmail) || rule.managerEmails.has(normalizedEmail))
    .map((rule) => rule.cafeSlug);
};

export const hasOwnerPortalAccess = (email: unknown) =>
  hasSuperAdminAccess(email) || getConfiguredAccessibleCafeSlugs(email).length > 0;
