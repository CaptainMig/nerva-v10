// Extracts the per-tick inputs (v, c) of replay.html's deterministic replay
// into tools/replay-frames.json, so the v11.1 verdict diff can run over them
// without a browser. Run from the repo root with Playwright available:
//   node tools/extract-replay-frames.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + path.join(ROOT, 'replay.html') + '?autoplay=0&t=0', { waitUntil: 'load' });
await p.waitForTimeout(800);
const data = await p.evaluate(() => ({
  seed: __nerva.seed, duration: __nerva.DURATION,
  receipt_hashes: __nerva.receipts.map(r => r.hash),
  frames: __nerva.frames.map(f => ({ i: f.i, s: f.s, v: f.v, c: f.c })),
}));
await b.close();
const out = path.join(ROOT, 'tools', 'replay-frames.json');
fs.writeFileSync(out, JSON.stringify(data));
console.log(`wrote ${out}: ${data.frames.length} frames, seed ${data.seed}, hashes ${data.receipt_hashes.join(',')}`);
