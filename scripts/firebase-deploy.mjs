import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const firebaseConfigPath = path.join(projectRoot, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf8'));

const { projectId, firestoreDatabaseId } = firebaseConfig;
const mode = process.argv[2] ?? 'rules';

if (!projectId) {
  console.error('Missing projectId in firebase-applet-config.json');
  process.exit(1);
}

if (!firestoreDatabaseId) {
  console.error('Missing firestoreDatabaseId in firebase-applet-config.json');
  process.exit(1);
}

const targetByMode = {
  hosting: 'hosting',
  rules: `firestore:${firestoreDatabaseId}`,
  prod: `hosting,firestore:${firestoreDatabaseId}`,
};

const target = targetByMode[mode];

if (!target) {
  console.error(`Unsupported deploy mode: ${mode}`);
  process.exit(1);
}

if (mode !== 'hosting') {
  const syncResult = spawnSync('node', [path.join('scripts', 'generate-firestore-rules.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (syncResult.error || syncResult.status !== 0) {
    console.error(syncResult.error?.message ?? 'Failed to generate firestore.rules');
    process.exit(syncResult.status ?? 1);
  }
}

const extraArgs = process.argv.slice(3);
const result = spawnSync('firebase', ['deploy', '--only', target, '--project', projectId, ...extraArgs], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
