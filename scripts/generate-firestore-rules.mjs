import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { OWNER_ACCESS_EMAILS, SUPER_ADMIN_EMAILS } from '../access-emails.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const templatePath = path.join(projectRoot, 'firestore.rules.template');
const outputPath = path.join(projectRoot, 'firestore.rules');

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const uniqueEmails = (emails) => [...new Set(emails.map(normalizeEmail).filter(Boolean))];

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

const template = readFileSync(templatePath, 'utf8');
const rules = template
  .replace('__OWNER_PORTAL_EMAIL_CHECK__', buildEmailCheck(OWNER_ACCESS_EMAILS))
  .replace('__SUPER_ADMIN_EMAIL_CHECK__', buildEmailCheck(SUPER_ADMIN_EMAILS));

writeFileSync(outputPath, rules);
console.log(`Generated ${path.basename(outputPath)} from ${path.basename(templatePath)}`);
