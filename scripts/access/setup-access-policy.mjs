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

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run') || process.env.SHAREVIBE_ACCESS_SETUP_DRY_RUN === '1';
const isNonInteractive = args.has('--non-interactive') || process.env.CI === 'true';

const runLocal = (label, command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`${label} başarısız oldu.`);
  }
};

const ask = async (rl, question, fallback = '') => {
  const answer = await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `);
  return answer.trim() || fallback;
};

const collectInteractiveInput = async () => {
  const rl = readline.createInterface({ input, output });

  try {
    const superOwners = await ask(rl, 'Super Owner email adreslerini virgülle girin');
    const ownerEmails = await ask(rl, 'Admin / Owner email adreslerini virgülle girin');
    const ownerCafes = ownerEmails
      ? await ask(rl, 'Admin / Owner kullanıcılarının yönetebileceği cafe kodlarını virgülle girin')
      : '';
    const managerEmails = await ask(rl, 'Manager email adreslerini virgülle girin');
    const managerCafes = managerEmails
      ? await ask(rl, 'Manager kullanıcılarının yönetebileceği cafe kodlarını virgülle girin')
      : '';

    return { superOwners, ownerEmails, ownerCafes, managerEmails, managerCafes };
  } finally {
    rl.close();
  }
};

const collectEnvInput = () => ({
  superOwners: process.env.SHAREVIBE_ACCESS_SETUP_SUPER_OWNERS || '',
  ownerEmails: process.env.SHAREVIBE_ACCESS_SETUP_OWNER_EMAILS || '',
  ownerCafes: process.env.SHAREVIBE_ACCESS_SETUP_OWNER_CAFES || process.env.SHAREVIBE_ACCESS_SETUP_CAFES || '',
  managerEmails: process.env.SHAREVIBE_ACCESS_SETUP_MANAGER_EMAILS || '',
  managerCafes: process.env.SHAREVIBE_ACCESS_SETUP_MANAGER_CAFES || process.env.SHAREVIBE_ACCESS_SETUP_CAFES || '',
});

const applyInput = (currentPolicy, form) => {
  let nextPolicy = currentPolicy;
  const invalidEmails = [];

  const superOwnerResult = addRoleAssignments(nextPolicy, {
    role: 'super_owner',
    emails: splitList(form.superOwners),
    cafeSlugs: [],
  });
  nextPolicy = superOwnerResult.policy;
  invalidEmails.push(...superOwnerResult.invalidEmails);

  const ownerResult = addRoleAssignments(nextPolicy, {
    role: 'owner',
    emails: splitList(form.ownerEmails),
    cafeSlugs: splitList(form.ownerCafes),
  });
  nextPolicy = ownerResult.policy;
  invalidEmails.push(...ownerResult.invalidEmails);

  const managerResult = addRoleAssignments(nextPolicy, {
    role: 'manager',
    emails: splitList(form.managerEmails),
    cafeSlugs: splitList(form.managerCafes),
  });
  nextPolicy = managerResult.policy;
  invalidEmails.push(...managerResult.invalidEmails);

  return { policy: nextPolicy, invalidEmails: [...new Set(invalidEmails)] };
};

const main = async () => {
  const currentPolicy = readAccessPolicy();
  const form = isNonInteractive ? collectEnvInput() : await collectInteractiveInput();
  const { policy, invalidEmails } = applyInput(currentPolicy, form);

  console.log('\nYetki politikası özeti:');
  console.log(formatPolicySummary(policy));

  if (invalidEmails.length > 0) {
    console.warn(`\nGeçersiz e-postalar atlandı: ${invalidEmails.join(', ')}`);
  }

  if (isDryRun) {
    console.log('\nDry-run modu aktif. config/access/policy.json güncellenmedi.');
    return;
  }

  writeAccessPolicy(policy);
  runLocal('Erişim politikası adapter üretimi', 'npm', ['run', 'generate:access-policy']);
  runLocal('Firebase rules üretimi', 'npm', ['run', 'generate:rules']);

  console.log('\nYetki politikası güncellendi. Firebase custom claims için şimdi şu komutu çalıştırın:');
  console.log('npm run access:sync-claims');
};

main().catch((error) => {
  console.error(`Yetki kurulumu tamamlanamadı: ${error.message}`);
  process.exit(1);
});
