// Costa Palma — the gta6-01 submit program (Node 22, standard library only).
// It hands the game in: copies this directory's game/ and screenshots/ to
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// starter's program does. The game itself is plain static files under game/ —
// a three.js open world that plays offline in desktop Chrome. Costa Palma is
// an original city: eight story missions, a 5-star wanted system with a
// helicopter and roadblocks, traffic, pedestrians, combat, a garage, ranks
// and a save — all written from scratch for this entry.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files in all; a path under game/ over 1000 bytes. game/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
