// Headless tuning harness — quantifies grain convergence without a screen.
// Run: npx tsx tools/convergence.ts
//
// "Converged" = grains sit on nodal lines, i.e. the mean |Ψ| sampled at grain
// positions has fallen close to zero. We report the time to reach it and check
// that a frequency sweep produces many visually-distinct figures.

import { buildModes } from '../src/physics/modes';
import { Field } from '../src/physics/field';
import { Grains, DEFAULT_CONFIG } from '../src/grains/grains';

const modes = buildModes();
const field = new Field(modes);

function meanMagAtGrains(g: Grains): number {
  let sum = 0;
  for (let i = 0; i < g.count; i++) {
    sum += field.sampleMag(g.pos[i * 2], g.pos[i * 2 + 1]);
  }
  return sum / g.count;
}

// Fraction of grains within `eps` of a nodal line (|Ψ| < eps).
function settledFraction(g: Grains, eps = 0.08): number {
  let n = 0;
  for (let i = 0; i < g.count; i++) {
    if (field.sampleMag(g.pos[i * 2], g.pos[i * 2 + 1]) < eps) n++;
  }
  return n / g.count;
}

function convergenceRun(freq: number, frames = 240): void {
  const g = new Grains(30000, DEFAULT_CONFIG, 12345);
  field.setFrequency(freq);
  const dom = field.dominant!;
  console.log(`\n── f = ${freq.toFixed(0)} Hz → dominant mode (${dom.n},${dom.m}), weight ${dom.weight.toFixed(2)}`);
  console.log(`   t(s)   meanMag   settled%`);
  for (let f = 0; f <= frames; f++) {
    if (f % 30 === 0) {
      const t = (f / 60).toFixed(2);
      console.log(`   ${t.padStart(5)}   ${meanMagAtGrains(g).toFixed(4)}    ${(settledFraction(g) * 100).toFixed(1)}`);
    }
    g.update(field, 1);
  }
}

// 1. Convergence at a strong resonance.
const mid = modes[Math.floor(modes.length / 2)];
convergenceRun(mid.fnm);

// 2. Convergence at a low resonance (broad, simple figure).
convergenceRun(modes[1].fnm);

// 3. Sweep: how many distinct dominant modes appear across 50→2000 Hz?
const seen = new Set<string>();
for (let f = 50; f <= 2000; f += 5) {
  field.setFrequency(f);
  const d = field.dominant!;
  seen.add(`${d.n},${d.m}`);
}
console.log(`\n── Sweep 50→2000 Hz surfaces ${seen.size} distinct dominant figures.`);
console.log(`   ${[...seen].join('  ')}`);

// 4. Recombine timing budget (must be < 2 ms).
const t0 = performance.now();
let recombines = 0;
for (let f = 50; f <= 2000; f += 1) {
  if (field.setFrequency(f)) recombines++;
}
const elapsed = performance.now() - t0;
console.log(`\n── ${recombines} recombines over a 1-Hz sweep; ${(elapsed / recombines).toFixed(3)} ms each (budget < 2 ms).`);
