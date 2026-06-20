import { validateDeployEnv } from "./deploy-utils.js";

const envCheck = validateDeployEnv();
const { missing, errors, config } = envCheck;
const warnings = envCheck.warnings || [];

if (missing.length > 0) {
  console.error(`Missing deployment environment variables: ${missing.join(", ")}`);
}

if (errors.length > 0) {
  console.error(`Deployment environment errors: ${errors.join("; ")}`);
}

if (warnings.length > 0) {
  console.warn(`Deployment environment warnings: ${warnings.join("; ")}`);
}

if (config.deployPath) {
  console.log("SHAREVIBE_DEPLOY_PATH is set.");
} else {
  console.log("SHAREVIBE_DEPLOY_PATH is not set; deploy:discover is required before deployment.");
}

if (missing.length > 0 || errors.length > 0) {
  process.exit(1);
}

console.log("Deployment environment check passed.");
