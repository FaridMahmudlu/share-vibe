import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localKeyPath = path.join(__dirname, '..', 'scratch', 'firebase-service-account.json');

let credential;
if (fs.existsSync(localKeyPath)) {
  const raw = fs.readFileSync(localKeyPath, 'utf8');
  credential = admin.credential.cert(JSON.parse(raw));
}

import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK using the project ID
if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    projectId: 'gen-lang-client-0200945474'
  });
}

const db = getFirestore('ai-studio-0179b1de-f24b-4cc2-aaaa-4e4738a7589a');

async function main() {
  console.log('--- FETCHING CLIENT ERROR LOGS ---');
  const clientLogs = await db.collection('client_error_logs').orderBy('timestamp', 'desc').limit(10).get();
  if (clientLogs.empty) {
    console.log('No client error logs found.');
  } else {
    clientLogs.forEach(doc => {
      console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2));
    });
  }

  console.log('\n--- FETCHING SERVER ERROR LOGS ---');
  const serverLogs = await db.collection('error_logs').orderBy('timestamp', 'desc').limit(10).get();
  if (serverLogs.empty) {
    console.log('No server error logs found.');
  } else {
    serverLogs.forEach(doc => {
      console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2));
    });
  }
}

main().catch(err => {
  console.error('Failed to query database:', err);
});
