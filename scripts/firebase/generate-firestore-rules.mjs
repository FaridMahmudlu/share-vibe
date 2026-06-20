import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../..');
const templatePath = path.join(projectRoot, 'config', 'firebase', 'firestore.rules.template');
const outputPath = path.join(projectRoot, 'firestore.rules');
const policyPath = path.join(projectRoot, 'config', 'access', 'policy.json');

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const uniqueEmails = (emails) => [...new Set(emails.map(normalizeEmail).filter(Boolean))];

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const superOwnerEmails = uniqueEmails(policy.superOwnerEmails || []);
const cafeAccess = (Array.isArray(policy.cafeAccess) ? policy.cafeAccess : [])
  .map((rule) => ({
    cafeSlug: normalizeSlug(rule.cafeSlug),
    ownerEmails: uniqueEmails(rule.ownerEmails || []),
    managerEmails: uniqueEmails(rule.managerEmails || []),
  }))
  .filter((rule) => rule.cafeSlug);

const buildEmailCheck = (emails) => {
  const normalizedEmails = uniqueEmails(emails);

  if (normalizedEmails.length === 0) {
    return '          false';
  }

  return normalizedEmails
    .map((email, index) => {
      const suffix = index === normalizedEmails.length - 1 ? '' : ' ||';
      return `          normalizeEmail(request.auth.token.email) == "${email}"${suffix}`;
    })
    .join('\n');
};

const buildCafeAccessCheck = ({ ownersOnly = false } = {}) => {
  const expressions = cafeAccess.flatMap((rule) => {
    const emails = ownersOnly
      ? rule.ownerEmails
      : uniqueEmails([...rule.ownerEmails, ...rule.managerEmails]);

    if (emails.length === 0) {
      return [];
    }

    return [
      `(cafeId == "${rule.cafeSlug}" && (${emails
        .map((email) => `normalizeEmail(request.auth.token.email) == "${email}"`)
        .join(' || ')}))`,
    ];
  });

  if (expressions.length === 0) {
    return '          false';
  }

  return expressions
    .map((expression, index) => `          ${expression}${index === expressions.length - 1 ? '' : ' ||'}`)
    .join('\n');
};

const template = readFileSync(templatePath, 'utf8');
const rules = template
  .replace('__SUPER_ADMIN_EMAIL_CHECK__', buildEmailCheck(superOwnerEmails))
  .replace('__CAFE_ACCESS_EMAIL_CHECK__', buildCafeAccessCheck())
  .replace('__CAFE_OWNER_EMAIL_CHECK__', buildCafeAccessCheck({ ownersOnly: true }));

writeFileSync(outputPath, rules);
console.log(`Generated ${path.basename(outputPath)} from ${path.basename(templatePath)}`);
