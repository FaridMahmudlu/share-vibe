import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import {
  formatPolicySummary,
  maskEmail,
  readAccessPolicy,
  resolveRoleAssignments,
} from './access-policy-utils.mjs';

const requireFromBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run') || process.env.SHAREVIBE_ACCESS_SYNC_DRY_RUN === '1';

const hasFirebaseRuntimeCredentials = () =>
  Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() &&
        existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS.trim()))
  );

const loadFirebaseAdmin = () => {
  if (!hasFirebaseRuntimeCredentials()) {
    throw new Error(
      'Firebase Admin credential bulunamadı. FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS veya FIREBASE_PROJECT_ID runtime ortamında tanımlanmalıdır.'
    );
  }

  const admin = requireFromBackend('firebase-admin');

  if (admin.apps.length > 0) {
    return admin;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    const raw = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey: raw.private_key?.replace(/\\n/g, '\n'),
      }),
      projectId: raw.project_id,
    });
    return admin;
  }

  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  return admin;
};

const buildAccessClaims = (assignment) => {
  if (assignment.role === 'super_owner') {
    return {
      admin: true,
      role: 'super_owner',
      cafeIds: [],
      sharevibeSuperOwner: true,
      sharevibeOwnerCafes: [],
      sharevibeManagerCafes: [],
    };
  }

  if (assignment.role === 'owner') {
    return {
      role: 'owner',
      cafeIds: assignment.cafeIds,
      sharevibeSuperOwner: false,
      sharevibeOwnerCafes: assignment.ownerCafeIds,
      sharevibeManagerCafes: assignment.managerCafeIds,
    };
  }

  if (assignment.role === 'manager') {
    return {
      role: 'manager',
      cafeIds: assignment.cafeIds,
      sharevibeSuperOwner: false,
      sharevibeOwnerCafes: [],
      sharevibeManagerCafes: assignment.managerCafeIds,
    };
  }

  return {
    role: 'none',
    cafeIds: [],
    sharevibeSuperOwner: false,
    sharevibeOwnerCafes: [],
    sharevibeManagerCafes: [],
  };
};

const mergeClaims = (existingClaims, accessClaims) => {
  const nextClaims = { ...(existingClaims || {}) };

  delete nextClaims.admin;
  delete nextClaims.role;
  delete nextClaims.cafeIds;
  delete nextClaims.sharevibeSuperOwner;
  delete nextClaims.sharevibeOwnerCafes;
  delete nextClaims.sharevibeManagerCafes;

  Object.assign(nextClaims, accessClaims);

  if (accessClaims.role !== 'super_owner') {
    delete nextClaims.admin;
  }

  return nextClaims;
};

const main = async () => {
  const policy = readAccessPolicy();
  const assignments = resolveRoleAssignments(policy);

  console.log('Yetki politikası özeti:');
  console.log(formatPolicySummary(policy));

  if (assignments.length === 0) {
    console.log('Senkronize edilecek yetkili kullanıcı yok.');
    return;
  }

  if (isDryRun) {
    console.log('\nDry-run modu aktif. Firebase üzerinde değişiklik yapılmadı.');
    for (const assignment of assignments) {
      const cafeText = assignment.role === 'super_owner' ? 'tüm kafeler' : assignment.cafeIds.join(', ');
      console.log(`- ${maskEmail(assignment.email)} için ${assignment.role} claims hazırlanacak (${cafeText || 'kafe yok'}).`);
    }
    return;
  }

  const admin = loadFirebaseAdmin();
  const auth = admin.auth();
  const result = {
    synced: 0,
    missingUsers: 0,
    failed: 0,
  };

  for (const assignment of assignments) {
    try {
      const user = await auth.getUserByEmail(assignment.email);
      const nextClaims = mergeClaims(user.customClaims, buildAccessClaims(assignment));
      await auth.setCustomUserClaims(user.uid, nextClaims);
      result.synced += 1;
      console.log(`${maskEmail(assignment.email)} için custom claims güncellendi.`);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
      if (code === 'auth/user-not-found') {
        result.missingUsers += 1;
        console.warn(`${maskEmail(assignment.email)} için Firebase Auth kullanıcısı bulunamadı. Kullanıcı giriş yaptıktan sonra komutu tekrar çalıştırın.`);
      } else {
        result.failed += 1;
        console.error(`${maskEmail(assignment.email)} için claims güncellenemedi. Hata kodu: ${code || 'bilinmiyor'}`);
      }
    }
  }

  if (result.failed > 0) {
    throw new Error(`Custom claims senkronizasyonunda ${result.failed} kullanıcı için hata oluştu.`);
  }

  console.log(`\nSenkronizasyon tamamlandı. Güncellenen: ${result.synced}, Firebase Auth kullanıcısı bulunmayan: ${result.missingUsers}.`);
};

main().catch((error) => {
  console.error(`Firebase custom claims senkronizasyonu tamamlanamadı: ${error.message}`);
  process.exit(1);
});
