import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getDeployConfig,
  paths,
  runRemote,
  validateDeployEnv,
  writeMarkdown,
} from "./deploy-utils.js";

const now = new Date().toISOString();

const parseNginxMatches = (content) => {
  const blocks = content.match(/server\s*\{[\s\S]*?\n\}/g) || [];
  return blocks
    .filter((block) => /server_name\s+[^;]*(^|\s)(www\.)?sharevibe\.co(\s|;)/m.test(block))
    .map((block) => ({
      root: block.match(/\n\s*root\s+([^;]+);/)?.[1]?.trim() || "",
      alias: block.match(/\n\s*alias\s+([^;]+);/)?.[1]?.trim() || "",
      proxyPass: block.match(/\n\s*proxy_pass\s+([^;]+);/)?.[1]?.trim() || "",
    }));
};

const parseLocalNginxCandidate = () => {
  const localConfigPath = join(paths.repoRoot, "ops", "nginx", "sharevibe.conf");
  if (!existsSync(localConfigPath)) {
    return null;
  }

  const matches = parseNginxMatches(readFileSync(localConfigPath, "utf8"));
  const roots = [...new Set(matches.map((match) => match.root).filter(Boolean))];
  return roots.length === 1 ? roots[0] : null;
};

const buildReport = ({ status, discoveredPath, confidence, notes, localCandidate, remoteEvidence }) => `# Deployment Autodiscovery Report

Generated: ${now}

## Result

- Status: ${status}
- Discovered path: ${discoveredPath || "not confirmed"}
- Confidence: ${confidence}

## Evidence

- Local ops/nginx candidate: ${localCandidate || "none"}
- Remote Nginx matching root count: ${remoteEvidence.roots.length}
- Remote Nginx matching alias count: ${remoteEvidence.aliases.length}
- Remote Nginx matching proxy_pass count: ${remoteEvidence.proxyPasses.length}

## Notes

${notes.map((note) => `- ${note}`).join("\n")}

No credentials, private keys, tokens, or raw server config contents are stored in this report.
`;

export const discoverProductionPath = () => {
  const config = getDeployConfig();
  const localCandidate = parseLocalNginxCandidate();
  const remoteEvidence = { roots: [], aliases: [], proxyPasses: [] };
  const notes = [];

  if (config.deployPath) {
    const report = buildReport({
      status: "provided",
      discoveredPath: config.deployPath,
      confidence: "high",
      notes: ["SHAREVIBE_DEPLOY_PATH was provided by the runtime environment."],
      localCandidate,
      remoteEvidence,
    });
    writeMarkdown(paths.autodiscoveryReport, report);
    console.log("Production path provided by SHAREVIBE_DEPLOY_PATH.");
    return { path: config.deployPath, confidence: "high", reportPath: paths.autodiscoveryReport };
  }

  const envCheck = validateDeployEnv();
  if (envCheck.missing.length > 0 || envCheck.errors.length > 0) {
    notes.push("Remote discovery was not attempted because required deployment connection variables are missing or invalid.");
    notes.push("Set deployment credentials and rerun npm run deploy:discover, or provide SHAREVIBE_DEPLOY_PATH explicitly.");
    if (localCandidate) {
      notes.push("The repository Nginx sample contains a local candidate, but local config alone is not reliable enough to deploy.");
    }

    writeMarkdown(paths.autodiscoveryReport, buildReport({
      status: "blocked",
      discoveredPath: "",
      confidence: "none",
      notes,
      localCandidate,
      remoteEvidence,
    }));
    console.error(`Cannot run remote discovery. Missing: ${envCheck.missing.join(", ") || "none"}. Errors: ${envCheck.errors.join("; ") || "none"}.`);
    process.exitCode = 1;
    return { path: "", confidence: "none", reportPath: paths.autodiscoveryReport };
  }

  const discoveryScript = `
set -u
if command -v nginx >/dev/null 2>&1; then nginx -T 2>/dev/null || true; fi
for f in /etc/nginx/nginx.conf /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* /etc/apache2/sites-enabled/*; do
  [ -r "$f" ] && { printf '\\n# source:%s\\n' "$f"; sed -n '1,260p' "$f"; }
done
printf '\\n# directory candidates\\n'
find /var/www /srv /opt -maxdepth 4 -type d \\( -iname '*share*vibe*' -o -iname '*sharevibe*' -o -iname 'html' -o -iname 'current' -o -iname 'releases' \\) 2>/dev/null | head -100
`;

  const output = runRemote(config, discoveryScript, { capture: true });
  const matches = parseNginxMatches(output);
  remoteEvidence.roots = [...new Set(matches.map((match) => match.root).filter(Boolean))];
  remoteEvidence.aliases = [...new Set(matches.map((match) => match.alias).filter(Boolean))];
  remoteEvidence.proxyPasses = [...new Set(matches.map((match) => match.proxyPass).filter(Boolean))];

  if (remoteEvidence.roots.length === 1) {
    const path = remoteEvidence.roots[0];
    notes.push("Exactly one matching Nginx root directive was found for sharevibe.co/www.sharevibe.co.");
    if (localCandidate && localCandidate !== path) {
      notes.push("Local ops/nginx candidate differs from the remote root; remote config takes precedence.");
    }

    writeMarkdown(paths.autodiscoveryReport, buildReport({
      status: "discovered",
      discoveredPath: path,
      confidence: "high",
      notes,
      localCandidate,
      remoteEvidence,
    }));
    console.log(`Discovered production path: ${path}`);
    return { path, confidence: "high", reportPath: paths.autodiscoveryReport };
  }

  if (remoteEvidence.proxyPasses.length > 0) {
    notes.push("The matching Nginx server block includes proxy_pass; this may require backend/service deployment inspection before choosing a path.");
  }
  if (remoteEvidence.roots.length > 1) {
    notes.push("More than one matching root was found. Deployment is blocked until SHAREVIBE_DEPLOY_PATH is provided.");
  }
  if (remoteEvidence.roots.length === 0) {
    notes.push("No reliable matching remote static root was found.");
  }

  writeMarkdown(paths.autodiscoveryReport, buildReport({
    status: "blocked",
    discoveredPath: "",
    confidence: "low",
    notes,
    localCandidate,
    remoteEvidence,
  }));
  console.error("Production path could not be confidently discovered. Set SHAREVIBE_DEPLOY_PATH.");
  process.exitCode = 1;
  return { path: "", confidence: "low", reportPath: paths.autodiscoveryReport };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  discoverProductionPath();
}
