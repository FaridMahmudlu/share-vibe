import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  addRoleAssignments,
  formatPolicySummary,
  readAccessPolicy,
  splitList,
  writeAccessPolicy,
} from './access-policy-utils.mjs';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const getArgValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || '' : '';
};

const runLocal = (label, command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`${label} başarısız oldu.`);
  }
};

const resolveEmails = async () => {
  const fromArgs = getArgValue('--emails');
  const fromEnv = process.env.SHAREVIBE_BOOTSTRAP_SUPER_OWNER_EMAILS || '';
  if (fromArgs || fromEnv) {
    return fromArgs || fromEnv;
  }

  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question('İlk Super Owner email adreslerini virgülle girin: ')).trim();
  } finally {
    rl.close();
  }
};

const main = async () => {
  const emailInput = await resolveEmails();
  const currentPolicy = readAccessPolicy();
  const { policy, invalidEmails } = addRoleAssignments(currentPolicy, {
    role: 'super_owner',
    emails: splitList(emailInput),
    cafeSlugs: [],
  });

  if (invalidEmails.length > 0) {
    console.warn(`Geçersiz e-postalar atlandı: ${invalidEmails.join(', ')}`);
  }

  if (policy.superOwnerEmails.length === 0) {
    throw new Error('En az bir geçerli Super Owner e-postası gereklidir.');
  }

  console.log('\nBootstrap özeti:');
  console.log(formatPolicySummary(policy));

  if (isDryRun) {
    console.log('\nDry-run modu aktif. config/access/policy.json güncellenmedi.');
    return;
  }

  writeAccessPolicy(policy);
  runLocal('Erişim politikası adapter üretimi', 'npm', ['run', 'generate:access-policy']);
  runLocal('Firebase rules üretimi', 'npm', ['run', 'generate:rules']);

  console.log('\nİlk Super Owner kaydı tamamlandı. Firebase custom claims için şu komutu çalıştırın:');
  console.log('npm run access:sync-claims');
};

main().catch((error) => {
  console.error(`Super Owner bootstrap tamamlanamadı: ${error.message}`);
  process.exit(1);
});
