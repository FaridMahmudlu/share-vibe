import admin from "firebase-admin";

type ServiceAccountInput = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

const parseServiceAccount = (): ServiceAccountInput | null => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
  };
};

const getFirebaseApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = parseServiceAccount();

  if (serviceAccount?.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }

  return admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
};

export const firebaseAdmin = getFirebaseApp();
export const firebaseAuth = firebaseAdmin.auth();
