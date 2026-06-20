import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(scriptDir, '../..');
export const accessPolicyPath = join(repoRoot, 'config', 'access', 'policy.json');

export const ACCESS_ROLES = ['super_owner', 'owner', 'manager', 'none'];

export const normalizeEmail = (value) =>
  String(value || '').trim().toLowerCase();

export const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const isValidEmail = (value) => {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

export const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const uniqueNormalizedEmails = (values) =>
  [...new Set((Array.isArray(values) ? values : []).map(normalizeEmail).filter(Boolean))];

export const uniqueNormalizedSlugs = (values) =>
  [...new Set((Array.isArray(values) ? values : []).map(normalizeSlug).filter(Boolean))];

export const validateEmailList = (values) => {
  const emails = uniqueNormalizedEmails(values);
  const invalidEmails = emails.filter((email) => !isValidEmail(email));

  return {
    emails: emails.filter(isValidEmail),
    invalidEmails,
  };
};

export const normalizePolicy = (input = {}) => {
  const { emails: superOwnerEmails } = validateEmailList(input.superOwnerEmails || []);

  const cafeRulesBySlug = new Map();
  for (const rawRule of Array.isArray(input.cafeAccess) ? input.cafeAccess : []) {
    const cafeSlug = normalizeSlug(rawRule?.cafeSlug);
    if (!cafeSlug) {
      continue;
    }

    const current = cafeRulesBySlug.get(cafeSlug) || {
      cafeSlug,
      ownerEmails: [],
      managerEmails: [],
    };

    current.ownerEmails = uniqueNormalizedEmails([
      ...current.ownerEmails,
      ...(rawRule?.ownerEmails || []),
    ]).filter(isValidEmail);
    current.managerEmails = uniqueNormalizedEmails([
      ...current.managerEmails,
      ...(rawRule?.managerEmails || []),
    ]).filter(isValidEmail);
    cafeRulesBySlug.set(cafeSlug, current);
  }

  return {
    superOwnerEmails,
    cafeAccess: [...cafeRulesBySlug.values()].sort((a, b) => a.cafeSlug.localeCompare(b.cafeSlug)),
  };
};

export const readAccessPolicy = (policyPath = accessPolicyPath) => {
  if (!existsSync(policyPath)) {
    return { superOwnerEmails: [], cafeAccess: [] };
  }

  return normalizePolicy(JSON.parse(readFileSync(policyPath, 'utf8')));
};

export const writeAccessPolicy = (policy, policyPath = accessPolicyPath) => {
  const normalized = normalizePolicy(policy);
  writeFileSync(policyPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
};

export const addRoleAssignments = (policy, { role, emails, cafeSlugs }) => {
  const normalizedPolicy = normalizePolicy(policy);
  const { emails: validEmails, invalidEmails } = validateEmailList(emails);
  const slugs = uniqueNormalizedSlugs(cafeSlugs);

  if (role === 'super_owner') {
    normalizedPolicy.superOwnerEmails = uniqueNormalizedEmails([
      ...normalizedPolicy.superOwnerEmails,
      ...validEmails,
    ]);
    return { policy: normalizedPolicy, invalidEmails };
  }

  if ((role === 'owner' || role === 'manager') && slugs.length > 0) {
    const bySlug = new Map(normalizedPolicy.cafeAccess.map((rule) => [rule.cafeSlug, rule]));
    for (const cafeSlug of slugs) {
      const current = bySlug.get(cafeSlug) || { cafeSlug, ownerEmails: [], managerEmails: [] };
      if (role === 'owner') {
        current.ownerEmails = uniqueNormalizedEmails([...current.ownerEmails, ...validEmails]);
      }
      if (role === 'manager') {
        current.managerEmails = uniqueNormalizedEmails([...current.managerEmails || [], ...validEmails]);
      }
      bySlug.set(cafeSlug, current);
    }
    normalizedPolicy.cafeAccess = [...bySlug.values()].sort((a, b) => a.cafeSlug.localeCompare(b.cafeSlug));
  }

  return { policy: normalizedPolicy, invalidEmails };
};

export const removeEmailFromPolicy = (policy, email) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPolicy = normalizePolicy(policy);

  normalizedPolicy.superOwnerEmails = normalizedPolicy.superOwnerEmails.filter((entry) => entry !== normalizedEmail);
  normalizedPolicy.cafeAccess = normalizedPolicy.cafeAccess
    .map((rule) => ({
      cafeSlug: rule.cafeSlug,
      ownerEmails: rule.ownerEmails.filter((entry) => entry !== normalizedEmail),
      managerEmails: (rule.managerEmails || []).filter((entry) => entry !== normalizedEmail),
    }))
    .filter((rule) => rule.ownerEmails.length > 0 || rule.managerEmails.length > 0);

  return normalizedPolicy;
};

export const resolveRoleAssignments = (policy) => {
  const normalizedPolicy = normalizePolicy(policy);
  const assignments = new Map();

  for (const email of normalizedPolicy.superOwnerEmails) {
    assignments.set(email, {
      email,
      role: 'super_owner',
      cafeIds: [],
      ownerCafeIds: [],
      managerCafeIds: [],
    });
  }

  for (const rule of normalizedPolicy.cafeAccess) {
    for (const email of rule.ownerEmails) {
      if (assignments.get(email)?.role === 'super_owner') {
        continue;
      }

      const current = assignments.get(email) || {
        email,
        role: 'owner',
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      };
      current.role = 'owner';
      current.ownerCafeIds = uniqueNormalizedSlugs([...current.ownerCafeIds, rule.cafeSlug]);
      current.cafeIds = uniqueNormalizedSlugs([...current.cafeIds, rule.cafeSlug]);
      assignments.set(email, current);
    }

    for (const email of rule.managerEmails || []) {
      const existing = assignments.get(email);
      if (existing?.role === 'super_owner' || existing?.role === 'owner') {
        if (existing.role === 'owner') {
          existing.managerCafeIds = uniqueNormalizedSlugs([...existing.managerCafeIds, rule.cafeSlug]);
          existing.cafeIds = uniqueNormalizedSlugs([...existing.cafeIds, rule.cafeSlug]);
        }
        continue;
      }

      const current = existing || {
        email,
        role: 'manager',
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      };
      current.role = 'manager';
      current.managerCafeIds = uniqueNormalizedSlugs([...current.managerCafeIds, rule.cafeSlug]);
      current.cafeIds = uniqueNormalizedSlugs([...current.cafeIds, rule.cafeSlug]);
      assignments.set(email, current);
    }
  }

  return [...assignments.values()].sort((a, b) => a.email.localeCompare(b.email));
};

export const maskEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const [name, domain] = normalizedEmail.split('@');
  if (!name || !domain) {
    return 'gecersiz-email';
  }

  const visibleName = name.length <= 2 ? `${name[0] || '*'}*` : `${name.slice(0, 2)}***`;
  return `${visibleName}@${domain}`;
};

export const formatPolicySummary = (policy) => {
  const normalizedPolicy = normalizePolicy(policy);
  const assignments = resolveRoleAssignments(normalizedPolicy);

  return [
    `Super Owner sayısı: ${normalizedPolicy.superOwnerEmails.length}`,
    `Kafe yetki kuralı sayısı: ${normalizedPolicy.cafeAccess.length}`,
    `Toplam yetkili kullanıcı sayısı: ${assignments.length}`,
    ...assignments.map((assignment) => {
      const cafeText = assignment.role === 'super_owner'
        ? 'tüm kafeler'
        : assignment.cafeIds.length > 0
          ? assignment.cafeIds.join(', ')
          : 'kafe atanmamış';
      return `- ${maskEmail(assignment.email)}: ${assignment.role} (${cafeText})`;
    }),
  ].join('\n');
};
