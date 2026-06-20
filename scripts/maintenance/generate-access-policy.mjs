import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const policyPath = join(repoRoot, 'config', 'access', 'policy.json');

const normalizeEmail = (value) =>
  String(value || '').trim().toLowerCase();

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueEmails = (values) =>
  [...new Set((Array.isArray(values) ? values : []).map(normalizeEmail).filter(Boolean))];

const readPolicy = () => {
  const raw = JSON.parse(readFileSync(policyPath, 'utf8'));

  return {
    superOwnerEmails: uniqueEmails(raw.superOwnerEmails),
    cafeAccess: (Array.isArray(raw.cafeAccess) ? raw.cafeAccess : [])
      .map((rule) => ({
        cafeSlug: normalizeSlug(rule.cafeSlug),
        ownerEmails: uniqueEmails(rule.ownerEmails),
        managerEmails: uniqueEmails(rule.managerEmails),
      }))
      .filter((rule) => rule.cafeSlug),
  };
};

const policy = readPolicy();
const ts = `export const GENERATED_ACCESS_POLICY = ${JSON.stringify(policy, null, 2)} as const;\n`;
const cjs = `exports.GENERATED_ACCESS_POLICY = ${JSON.stringify(policy, null, 2)};\n`;

writeFileSync(join(repoRoot, 'src', 'config', 'accessPolicy.generated.ts'), ts, 'utf8');
writeFileSync(join(repoRoot, 'backend', 'src', 'config', 'accessPolicy.generated.ts'), ts, 'utf8');
writeFileSync(join(repoRoot, 'functions', 'accessPolicy.generated.js'), cjs, 'utf8');

console.log('Generated frontend, backend, and functions access policy adapters.');
