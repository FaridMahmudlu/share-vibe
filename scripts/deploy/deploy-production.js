import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  copyToRemote,
  ensureSafeRemotePath,
  paths,
  runLocal,
  runRemote,
  shQuote,
  validateDeployEnv,
} from "./deploy-utils.js";
import { discoverProductionPath } from "./discover-production-path.js";
import { checkHealth } from "./health-check.js";

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const runVerification = () => {
  runLocal("generate central access policy adapters", "npm", ["run", "generate:access-policy"]);
  runLocal("dry-run Firebase custom claims sync", "npm", ["run", "access:sync-claims:dry"]);
  runLocal("generate Firestore rules", "npm", ["run", "generate:rules"]);
  runLocal("generate public sitemaps", "npm", ["run", "generate:sitemaps"]);
  runLocal("frontend lint/typecheck", "npm", ["run", "lint"]);
  runLocal("frontend tests", "npm", ["test", "--", "--run"]);
  runLocal("backend build", "npm", ["--prefix", "backend", "run", "build"]);
  runLocal("functions tests if present", "npm", ["--prefix", "functions", "test"]);
  runLocal("functions build if present", "npm", ["--prefix", "functions", "run", "build", "--if-present"]);
  runLocal("frontend production build", "npm", ["run", "build"]);
  runLocal("frontend high/critical dependency audit", "npm", ["audit", "--omit=dev", "--audit-level=high"]);
  runLocal("backend high/critical dependency audit", "npm", ["--prefix", "backend", "audit", "--omit=dev", "--audit-level=high"]);
};

const createArchive = () => {
  if (!existsSync(paths.dist)) {
    throw new Error("dist folder missing after build");
  }

  mkdirSync(paths.localDeployDir, { recursive: true });
  const archivePath = join(paths.localDeployDir, `sharevibe-dist-${timestamp}.tar.gz`);
  runLocal("create deployment archive", "tar", ["-czf", archivePath, "-C", paths.dist, "."], { shell: false });
  return archivePath;
};

const deployArchive = async (config, archivePath, deployPath) => {
  const safePath = ensureSafeRemotePath(deployPath);
  const remoteArchive = `/tmp/sharevibe-dist-${timestamp}.tar.gz`;
  const qTarget = shQuote(safePath);
  const qArchive = shQuote(remoteArchive);

  const prepareScript = `
set -eu
TARGET=${qTarget}
ARCHIVE=${qArchive}
BASE=$(dirname "$TARGET")
RELEASES="$BASE/releases"
BACKUPS="$BASE/backups"
RELEASE="$RELEASES/${timestamp}"
BACKUP="$BACKUPS/${timestamp}.tar.gz"
case "$TARGET" in ""|"/"|"/var"|"/var/www"|"/srv"|"/opt"|"/home"|"/usr"|"/etc") echo "Unsafe target path" >&2; exit 1 ;; esac
mkdir -p "$RELEASES" "$BACKUPS" "$RELEASE"
`;

  runRemote(config, prepareScript);
  copyToRemote(config, archivePath, remoteArchive);

  const activateScript = `
set -eu
TARGET=${qTarget}
ARCHIVE=${qArchive}
BASE=$(dirname "$TARGET")
RELEASES="$BASE/releases"
BACKUPS="$BASE/backups"
RELEASE="$RELEASES/${timestamp}"
BACKUP="$BACKUPS/${timestamp}.tar.gz"
PREVIOUS=""
tar -xzf "$ARCHIVE" -C "$RELEASE"
if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
  if [ -L "$TARGET" ]; then PREVIOUS=$(readlink "$TARGET" || true); fi
  if [ -d "$TARGET" ]; then tar -czf "$BACKUP" -C "$TARGET" . 2>/dev/null || true; fi
fi
if [ -L "$TARGET" ]; then
  ln -sfn "$RELEASE" "$TARGET"
else
  mkdir -p "$TARGET"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$RELEASE"/ "$TARGET"/
  else
    find "$TARGET" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
    cp -a "$RELEASE"/. "$TARGET"/
  fi
fi
rm -f "$ARCHIVE"
printf 'backup=%s\\nprevious=%s\\n' "$BACKUP" "$PREVIOUS"
`;

  const output = runRemote(config, activateScript, { capture: true });
  const backup = output.match(/^backup=(.*)$/m)?.[1]?.trim() || "";
  const previous = output.match(/^previous=(.*)$/m)?.[1]?.trim() || "";

  try {
    await checkHealth(config.healthUrl);
  } catch (error) {
    console.error(`Post-deploy health check failed: ${error.message}`);
    const rollbackScript = `
set -eu
TARGET=${qTarget}
BACKUP=${shQuote(backup)}
PREVIOUS=${shQuote(previous)}
if [ -n "$PREVIOUS" ] && [ -e "$PREVIOUS" ]; then
  ln -sfn "$PREVIOUS" "$TARGET"
elif [ -f "$BACKUP" ]; then
  mkdir -p "$TARGET"
  find "$TARGET" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  tar -xzf "$BACKUP" -C "$TARGET"
else
  echo "No rollback target available" >&2
  exit 1
fi
`;
    runRemote(config, rollbackScript);
    throw new Error("Deployment rolled back after failed health check");
  }
};

const main = async () => {
  const envCheck = validateDeployEnv();
  if (envCheck.missing.length > 0 || envCheck.errors.length > 0) {
    throw new Error(`Deployment blocked. Missing: ${envCheck.missing.join(", ") || "none"}. Errors: ${envCheck.errors.join("; ") || "none"}.`);
  }
  for (const warning of envCheck.warnings || []) {
    console.warn(`Deployment warning: ${warning}`);
  }

  runVerification();

  const discovered = envCheck.config.deployPath
    ? { path: envCheck.config.deployPath, confidence: "high" }
    : discoverProductionPath();

  if (!discovered.path || discovered.confidence !== "high") {
    throw new Error("Deployment blocked because production path is not confidently known.");
  }

  const archivePath = createArchive();
  await deployArchive(envCheck.config, archivePath, discovered.path);
  console.log("Production deployment completed.");
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
