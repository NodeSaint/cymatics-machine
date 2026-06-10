// Verifies the Sonic Signature is a pure, seeded path: the same word produces
// byte-identical grain positions (so the PNG is reproducible), while different
// words diverge. Also spot-checks the letter→frequency mapping. Headless, no DOM.
//
// Run: npx tsx tools/signature.ts

import { buildModes } from '../src/physics/modes';
import { simulateSignature } from '../src/export';
import { signatureFrequencies, sanitiseWord } from '../src/signature';

const modes = buildModes();
let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '  ok' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

function fingerprint(word: string): string {
  const g = simulateSignature(word, modes);
  // Hash the full position buffer (FNV-1a over the bytes).
  const bytes = new Uint8Array(g.pos.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

console.log('Frequency mapping is deterministic + sane:');
{
  const a = signatureFrequencies('EMMA');
  const b = signatureFrequencies('EMMA');
  ok(JSON.stringify(a) === JSON.stringify(b), `signatureFrequencies("EMMA") stable: [${a.map((f) => Math.round(f)).join(', ')}]`);
  ok(a.length === 4 && a.every((f) => f >= 50 && f <= 2000), `4 freqs, all in plate range`);
  ok(sanitiseWord('  Ñ-Emma 2!! ') === 'EMMA 2', `sanitise strips junk → "${sanitiseWord('  Ñ-Emma 2!! ')}"`);
  ok(signatureFrequencies('').length === 0, `empty word → no freqs`);
}

console.log('\nFigure is reproducible (same word ⇒ identical positions):');
for (const w of ['EMMA', 'OWEN', 'ADA LOVELACE', 'x']) {
  const f1 = fingerprint(w);
  const f2 = fingerprint(w);
  ok(f1 === f2, `"${sanitiseWord(w)}" → ${f1} == ${f2}`);
}

console.log('\nDifferent words give different figures:');
{
  const words = ['EMMA', 'OWEN', 'ADA', 'ABBA', 'BABA'];
  const fps = words.map(fingerprint);
  const unique = new Set(fps).size;
  ok(unique === words.length, `${unique}/${words.length} distinct fingerprints: ${fps.join(' ')}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
