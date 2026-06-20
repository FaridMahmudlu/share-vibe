const parseEmailList = (value) =>
  String(value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const OWNER_ACCESS_EMAILS = parseEmailList(process.env.FIREBASE_OWNER_ACCESS_EMAILS);
export const SUPER_ADMIN_EMAILS = parseEmailList(process.env.FIREBASE_SUPER_ADMIN_EMAILS);
