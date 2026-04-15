const normalizeAccessEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

// Yeni kafe sahibi hesaplarını bu listeye ekleyin.
const OWNER_ACCESS_EMAILS = [
  'fariddmahmudlu2008@gmail.com',
  'aslankerem182@gmail.com',
];

const SUPER_ADMIN_EMAILS = [
  'fariddmahmudlu2008@gmail.com',
  'aslankerem182@gmail.com',
];

const createEmailSet = (emails: string[]) =>
  new Set(emails.map((email) => normalizeAccessEmail(email)).filter(Boolean));

const OWNER_ACCESS_EMAIL_SET = createEmailSet(OWNER_ACCESS_EMAILS);
const SUPER_ADMIN_EMAIL_SET = createEmailSet(SUPER_ADMIN_EMAILS);

export { normalizeAccessEmail };

export const hasOwnerPortalAccess = (email: unknown) =>
  OWNER_ACCESS_EMAIL_SET.has(normalizeAccessEmail(email));

export const hasSuperAdminAccess = (email: unknown) =>
  SUPER_ADMIN_EMAIL_SET.has(normalizeAccessEmail(email));
