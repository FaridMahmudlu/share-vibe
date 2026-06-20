import { getDeployConfig } from "./deploy-utils.js";
import { fileURLToPath } from "node:url";

export const checkHealth = async (healthUrl = getDeployConfig().healthUrl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "ShareVibe deployment health check",
      },
    });

    if (!response.ok) {
      throw new Error(`Health check returned HTTP ${response.status}`);
    }

    console.log(`Health check passed: ${healthUrl} (${response.status})`);
    return true;
  } finally {
    clearTimeout(timeout);
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  checkHealth().catch((error) => {
    console.error(`Health check failed: ${error.message}`);
    process.exit(1);
  });
}
