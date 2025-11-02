#!/usr/bin/env node
// Export bookmarks from Firestore users/{uid}/bookmarks
// Usage:
//  node tools/export-bookmarks.mjs --uid <USER_ID> --format json|netscape --out <file> [--project <id>]
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const argv = yargs(hideBin(process.argv))
  .option('uid', { type: 'string', demandOption: true })
  .option('format', { type: 'string', choices: ['json', 'netscape'], demandOption: true })
  .option('out', { type: 'string', demandOption: true })
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

function toNetscape(itemsByCollection) {
  const lines = [];
  lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  lines.push('<TITLE>Bookmarks</TITLE>');
  lines.push('<H1>Bookmarks</H1>');
  lines.push('<DL><p>');

  for (const [collection, items] of Object.entries(itemsByCollection)) {
    lines.push(`  <DT><H3>${collection}</H3>`);
    lines.push('  <DL><p>');
    for (const it of items) {
      const url = it.url.replace(/"/g, '&quot;');
      const title = (it.title || it.url).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      lines.push(`    <DT><A HREF="${url}">${title}</A>`);
    }
    lines.push('  </DL><p>');
  }

  lines.push('</DL><p>');
  return lines.join('\n');
}

async function main() {
  const db = initAdmin();
  const uid = argv.uid;
  const snap = await db.collection('users').doc(uid).collection('bookmarks').get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (argv.format === 'json') {
    fs.writeFileSync(argv.out, JSON.stringify({ items }, null, 2));
    console.log(`Exportados ${items.length} marcadores a ${argv.out}`);
    return;
  }

  // netscape
  const byCollection = items.reduce((acc, it) => {
    const key = it.collectionId || 'inbox';
    acc[key] ||= [];
    acc[key].push(it);
    return acc;
  }, {});
  const html = toNetscape(byCollection);
  fs.writeFileSync(argv.out, html);
  console.log(`Exportados ${items.length} marcadores a ${argv.out} (Netscape)`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
