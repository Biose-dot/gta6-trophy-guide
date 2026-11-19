// Leonida Trophy Guide — the hand-in program for gta6-trophy-guide-01.
//
// The guide itself is the app/ folder next to this file: plain static files
// (index.html, style.css, app.js and the two data files) that a browser opens
// offline. This program's only job is to hand that guide in the way the
// competition asks: copy app/ and screenshots/ into the output directory and
// write dossier.json there with buildDossier from the vendored library.
//
// vendor/makefun-frontend.ts stays exactly as the kit shipped it — the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Where the output goes: the grader gives us /output; anywhere else the
// MAKEFUN_OUTPUT_DIR environment variable stands in for it, so a local run
// is:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory, so a re-run never leaves stale files
// behind for the dossier to sweep up. Only the CONTENTS are cleared, never
// the directory itself: in the grader the output directory sits directly
// under a read-only filesystem root, so removing the directory would fail —
// clearing its children is always safe, and mkdirSync with recursive: true
// is a no-op when the directory already exists.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}

// Copy the two handed-in folders across: the guide (app/) and its
// screenshots (screenshots/). The screenshots folder is copied only when it
// exists, so a local experiment without screenshots still produces a dossier.
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Build the dossier with the caps the sealed gate uses: the judge's text
// view at 160 KiB, at most 4 screenshots of 256 KiB each, and app/ within
// its 993-file, 48 MiB allowance.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
