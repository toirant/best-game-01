/**
 * main.ts — PRISM BREAK's entry program (Node 22, standard library only).
 *
 * It hands the game in: it copies game/ and screenshots/ from this repository
 * into the output directory and writes output/dossier.json with buildDossier
 * from vendor/makefun-game.ts, the kit's library, copied unchanged.
 *
 * The grader runs `node /bot/main.ts` with a read-only repository at /bot and
 * a writable /output; outside the grader, MAKEFUN_OUTPUT_DIR stands in for
 * /output. The program writes the same bytes on every run.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** The caps the bounty gives buildDossier (its gate.json, read from the kit). */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

/** Copy a directory tree, plain files and directories only, no symlinks. */
function copyTree(src: string, dest: string): number {
  let files = 0;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    const st = statSync(from);
    if (!st.isFile() && !st.isDirectory()) {
      throw new Error(`main.ts: ${from}: a symbolic link or special file, not a plain file`);
    }
    if (entry.isDirectory()) {
      files += copyTree(from, to);
    } else {
      cpSync(from, to);
      files += 1;
    }
  }
  return files;
}

function main(): void {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');

  if (!existsSync(gameDir)) throw new Error('main.ts: game/: no such directory');
  if (!existsSync(shotsDir)) throw new Error('main.ts: screenshots/: no such directory');
  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error('main.ts: game/index.html: no such file');
  }

  mkdirSync(outDir, { recursive: true });
  const gameFiles = copyTree(gameDir, join(outDir, 'game'));
  const shotFiles = copyTree(shotsDir, join(outDir, 'screenshots'));

  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  // The grader runs the program twice and both runs must write the same
  // bytes: rebuild the dossier in memory and refuse to finish if it differs
  // from what was just written, instead of handing in a drifting entry.
  const again = buildDossier(outDir, DOSSIER_CAPS);
  let same = dossier.length === again.length;
  for (let i = 0; same && i < dossier.length; i++) same = dossier[i] === again[i];
  if (!same) {
    throw new Error('main.ts: dossier.json is not deterministic across builds');
  }

  console.log(
    `prism-break: handed in ${gameFiles} game files and ${shotFiles} screenshots, ` +
      `dossier.json ${dossier.length} bytes -> ${outDir}`,
  );
}

main();
