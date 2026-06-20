const isProduction = process.env.NODE_ENV === "production";

const requiredProductionEnv = [
  "DATABASE_URL",
  "REDIS_URL",
  "BREVO_API_KEY",
  "BREVO_WEBHOOK_TOKEN",
];

const firebaseCredentialEnv = [
  "FIREBASE_PROJECT_ID",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
];

export const validateBackendEnv = () => {
  const missing = requiredProductionEnv.filter((key) => !process.env[key]?.trim());
  const hasFirebaseCredentials = firebaseCredentialEnv.some((key) => process.env[key]?.trim());

  if (hasFirebaseCredentials === false) {
    missing.push("FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  if (missing.length === 0) {
    return;
  }

  const message = `Missing required production environment variables: ${missing.join(", ")}`;

  if (isProduction) {
    throw new Error(message);
  }

  console.warn(`[env] ${message}`);
};

export const isProductionRuntime = () => isProduction;

export const isExplicitDevAuthFallbackEnabled = () =>
  !isProduction && process.env.ALLOW_UNVERIFIED_DEV_AUTH === "true";
