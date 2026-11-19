// Entry point for the GTA VI trophy guide (gta6-trophy-guide-01, Node 22, stdlib only).
//
// The guide itself is a folder of plain static files: app/index.html opens in any
// browser, app/app.js renders the checklist from app/data/trophies.json, and nothing
// is fetched from the network at run time. This script is only the hand-in step: it
// gathers app/ and screenshots/ from next to this file, drops them into the output
// directory, and writes the dossier.json the judge reads, using the vendored
// make.fun library. vendor/makefun-frontend.ts must stay untouched — the scorer
// rebuilds the dossier with its own copy and compares the two byte for byte.
//
// Run it locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and the output goes to /output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so a stale file from an earlier run can never
// leak into a later one. Only the directory's CONTENTS are cleared, never the
// directory itself: in the grader /output is a mount point whose parent (/) is
// read-only, so removing /output itself fails with EROFS and exits 1.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
const shotSource = join(repoRoot, 'screenshots');
if (existsSync(shotSource)) {
  cpSync(shotSource, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the sealed gate: at most 4 screenshots of 256 KiB, at most 993
// files and 48 MiB under app/, and the judge's text view capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
