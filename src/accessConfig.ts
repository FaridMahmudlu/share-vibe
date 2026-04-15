import { OWNER_ACCESS_EMAILS, SUPER_ADMIN_EMAILS } from '../access-emails.mjs';

const normalizeAccessEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const createEmailSet = (emails: string[]) =>
  new Set(emails.map((email) => normalizeAccessEmail(email)).filter(Boolean));

const OWNER_ACCESS_EMAIL_SET = createEmailSet(OWNER_ACCESS_EMAILS);
const SUPER_ADMIN_EMAIL_SET = createEmailSet(SUPER_ADMIN_EMAILS);

export { normalizeAccessEmail };

export const hasOwnerPortalAccess = (email: unknown) =>
  OWNER_ACCESS_EMAIL_SET.has(normalizeAccessEmail(email));

export const hasSuperAdminAccess = (email: unknown) =>
  SUPER_ADMIN_EMAIL_SET.has(normalizeAccessEmail(email));
