#!/usr/bin/env node
// Import bookmarks into Firestore users/{uid}/bookmarks
// Usage:
//  node tools/import-bookmarks.mjs --uid <USER_ID> --file <path> --format netscape|json [--project <id>]
// Auth:
//  - Prefer GOOGLE_APPLICATION_CREDENTIALS pointing to a Service Account JSON
//  - Or set FIREBASE_SERVICE_ACCOUNT_JSON env var with the JSON content
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const argv = yargs(hideBin(process.argv))
  .option('uid', { type: 'string', demandOption: true })
  .option('file', { type: 'string', demandOption: true })
  .option('format', { type: 'string', choices: ['netscape', 'json'], demandOption: true })
  .option('project', { type: 'string' })
  .strict()
  .argv;

function initAdmin() {
  const projectId = argv.project || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (sa) {
    initializeApp({ credential: cert(JSON.parse(sa)), projectId });
  } else {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  return getFirestore();
}

function parseNetscape(html) {
  // Very simple line-based parser tracking folders via <H3> and </DL>
  const lines = html.split(/\r?\n/);
  const stack = [];
  const items = [];
  const H3_RE = /<\s*H3[^>]*>(.*?)<\s*\/\s*H3\s*>/i;
  const A_RE = /<\s*A[^>]*HREF\s*=\s*"([^"]+)"[^>]*>(.*?)<\s*\/\s*A\s*>/i;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h3 = line.match(H3_RE);
    if (h3) {
      const name = h3[1].replace(/<[^>]+>/g, '').trim();
      stack.push(name);
      continue;
    }
    if (/^<\s*\/\s*DL\s*>/i.test(line)) {
      stack.pop();
      continue;
    }
    const a = line.match(A_RE);
    if (a) {
      const url = a[1];
      const title = a[2].replace(/<[^>]+>/g, '').trim() || url;
      const collectionId = (stack[stack.length - 1] || 'inbox').toLowerCase().replace(/\s+/g, '-').slice(0, 40);
      items.push({ url, title, collectionId });
    }
  }
  return items;
}

async function main() {
  const db = initAdmin();
  const uid = argv.uid;
  const text = fs.readFileSync(argv.file, 'utf-8');
  let entries = [];
  if (argv.format === 'netscape') {
    entries = parseNetscape(text);
  } else {
    const json = JSON.parse(text);
    entries = Array.isArray(json) ? json : json.items || [];
  }
  if (!entries.length) {
    console.error('No se encontraron entradas para importar');
    process.exit(1);
  }
  console.log(`Importando ${entries.length} marcadores para uid=${uid}...`);
  const writer = db.bulkWriter();
  let count = 0;
  for (const it of entries) {
    const data = {
      url: it.url,
      title: it.title || it.url,
      description: it.description || '',
      faviconUrl: it.faviconUrl || '',
      screenshotPath: it.screenshotPath || '',
      tags: it.tags || [],
      collectionId: it.collectionId || 'inbox',
      pinned: !!it.pinned,
      lang: it.lang || 'es',
      owner: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    const ref = db.collection('users').doc(uid).collection('bookmarks').doc();
    writer.set(ref, data);
    count++;
  }
  await writer.close();
  console.log(`Importación completa: ${count} items.`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
