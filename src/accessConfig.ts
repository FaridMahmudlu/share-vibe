// Access control configuration
// TODO: Move to Firebase Firestore for dynamic management
const OWNER_ACCESS_EMAILS = [
  'owner@sharevibe.local', // Add your owner email here
];

const SUPER_ADMIN_EMAILS = [
  'admin@sharevibe.local', // Add admin emails here
];

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
