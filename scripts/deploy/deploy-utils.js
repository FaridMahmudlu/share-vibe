import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const paths = {
  repoRoot,
  deployEnv: join(repoRoot, ".deploy.env"),
  dist: join(repoRoot, "dist"),
  localDeployDir: join(repoRoot, "ops", "_local", "deploy"),
  autodiscoveryReport: join(repoRoot, "docs", "deployment", "DEPLOYMENT_AUTODISCOVERY_REPORT.md"),
};

export const loadDeployEnv = () => {
  if (!existsSync(paths.deployEnv)) {
    return;
  }

  const content = readFileSync(paths.deployEnv, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const [key, ...rest] = line.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  }
};

export const getDeployConfig = () => {
  loadDeployEnv();

  return {
    host: process.env.SHAREVIBE_DEPLOY_HOST?.trim() || "",
    port: process.env.SHAREVIBE_DEPLOY_PORT?.trim() || "22",
    user: process.env.SHAREVIBE_DEPLOY_USER?.trim() || "",
    password: process.env.SHAREVIBE_DEPLOY_PASSWORD || "",
    sshKeyPath: process.env.SHAREVIBE_DEPLOY_SSH_KEY_PATH?.trim() || "",
    deployPath: process.env.SHAREVIBE_DEPLOY_PATH?.trim() || "",
    healthUrl: process.env.SHAREVIBE_DEPLOY_HEALTH_URL?.trim() || "https://sharevibe.co",
  };
};

export const validateDeployEnv = ({ requirePath = false } = {}) => {
  const config = getDeployConfig();
  const missing = [];
  const warnings = [];

  if (!config.host) missing.push("SHAREVIBE_DEPLOY_HOST");
  if (!config.user) missing.push("SHAREVIBE_DEPLOY_USER");
  if (!config.port) missing.push("SHAREVIBE_DEPLOY_PORT");
  if (!config.sshKeyPath && !config.password) {
    missing.push("SHAREVIBE_DEPLOY_SSH_KEY_PATH or SHAREVIBE_DEPLOY_PASSWORD");
  }
  if (requirePath && !config.deployPath) {
    missing.push("SHAREVIBE_DEPLOY_PATH");
  }

  const errors = [];
  if (config.user === "root" && process.env.SHAREVIBE_ALLOW_ROOT_BOOTSTRAP !== "1") {
    errors.push("SHAREVIBE_DEPLOY_USER must not be root unless SHAREVIBE_ALLOW_ROOT_BOOTSTRAP=1 is explicitly set for a one-time bootstrap");
  }
  if (config.user === "root" && process.env.SHAREVIBE_ALLOW_ROOT_BOOTSTRAP === "1") {
    warnings.push("Root deployment is enabled only for one-time bootstrap. Create a non-root SSH-key deploy user immediately after deployment.");
  }
  if (config.sshKeyPath && !existsSync(config.sshKeyPath)) {
    errors.push("SHAREVIBE_DEPLOY_SSH_KEY_PATH does not point to an existing file");
  }
  if (!config.sshKeyPath && config.password && process.platform === "win32") {
    errors.push("Password fallback requires sshpass and is not supported by this Windows script path; use an SSH key");
  }

  return { config, missing, errors, warnings };
};

export const commandExists = (command) => {
  const probe = process.platform === "win32"
    ? spawnSync("where", [command], { encoding: "utf8" })
    : spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });

  return probe.status === 0;
};

const buildSshTool = (config, tool) => {
  const isScp = tool === "scp";
  const args = [
    isScp ? "-P" : "-p",
    config.port,
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3",
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
  ];

  if (config.sshKeyPath) {
    args.push("-i", config.sshKeyPath, "-o", "IdentitiesOnly=yes", "-o", "PasswordAuthentication=no");
    return { command: tool, args, env: process.env };
  }

  if (!commandExists("sshpass")) {
    throw new Error("Password deployment fallback requires sshpass. Configure SHAREVIBE_DEPLOY_SSH_KEY_PATH instead.");
  }

  return {
    command: "sshpass",
    args: ["-e", tool, ...args],
    env: { ...process.env, SSHPASS: config.password },
  };
};

export const shQuote = (value) => `'${String(value).replace(/'/g, "'\"'\"'")}'`;

export const ensureSafeRemotePath = (remotePath) => {
  const normalized = remotePath.replace(/\/+$/, "");
  const blocked = new Set(["", "/", "/var", "/var/www", "/srv", "/opt", "/home", "/usr", "/etc"]);

  if (!normalized.startsWith("/") || normalized.includes("..") || blocked.has(normalized)) {
    throw new Error("Unsafe SHAREVIBE_DEPLOY_PATH. Provide the exact application web root.");
  }

  return normalized;
};

export const runLocal = (label, command, args, options = {}) => {
  console.log(`[check] ${label}`);
  const result = spawnSync(command, args, {
    cwd: paths.repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
};

export const runRemote = (config, script, { capture = false } = {}) => {
  const target = `${config.user}@${config.host}`;
  const tool = buildSshTool(config, "ssh");
  const result = spawnSync(tool.command, [...tool.args, target, script], {
    cwd: paths.repoRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    env: tool.env,
  });

  if (result.status !== 0) {
    throw new Error(capture ? (result.stderr || "Remote command failed").trim() : "Remote command failed");
  }

  return result.stdout || "";
};

export const copyToRemote = (config, localPath, remotePath) => {
  const target = `${config.user}@${config.host}:${remotePath}`;
  const tool = buildSshTool(config, "scp");
  const result = spawnSync(tool.command, [...tool.args, localPath, target], {
    cwd: paths.repoRoot,
    stdio: "inherit",
    env: tool.env,
  });

  if (result.status !== 0) {
    throw new Error("Upload failed");
  }
};

export const writeMarkdown = (filePath, content) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${content.trim()}\n`, "utf8");
};
