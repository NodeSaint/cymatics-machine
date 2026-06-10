// Verifies the circular Bessel plate: grains converge to nodal lines, stay
// inside the disk, and a sweep surfaces many distinct figures.
// Run: npx tsx tools/circle.ts

import { buildCircleModes } from '../src/physics/circleModes';
import { Field } from '../src/physics/field';
import { Grains, DEFAULT_CONFIG } from '../src/grains/grains';

const modes = buildCircleModes();
const field = new Field(modes);

console.log(`Built ${modes.length} circular modes, f ∈ [${Math.round(modes[0].fnm)}, ${Math.round(modes[modes.length - 1].fnm)}] Hz`);

// Convergence + disk containment at a mid resonance.
const mid = modes[Math.floor(modes.length / 2)];
const g = new Grains(30000, DEFAULT_CONFIG, 12345);
field.setFrequency(mid.fnm);
const dom = field.dominant!;
console.log(`\nf = ${mid.fnm.toFixed(0)} Hz → mode (${dom.n},${dom.m})  [n diameters, m circles]`);
console.log('  t(s)   meanMag   outsideDisk%');
for (let f = 0; f <= 180; f++) {
  if (f % 30 === 0) {
    let sum = 0;
    let outside = 0;
    for (let i = 0; i < g.count; i++) {
      const x = g.pos[i * 2];
      const y = g.pos[i * 2 + 1];
      sum += field.sampleMag(x, y);
      if (Math.hypot(x - 0.5, y - 0.5) > 0.5 + 1e-6) outside++;
    }
    console.log(`  ${(f / 60).toFixed(2).padStart(5)}   ${(sum / g.count).toFixed(4)}    ${((outside / g.count) * 100).toFixed(2)}`);
  }
  g.update(field, 1, 1, 'circle');
}

// Distinct figures across the sweep.
const seen = new Set<string>();
for (let fr = 50; fr <= 2000; fr += 5) {
  field.setFrequency(fr);
  const d = field.dominant!;
  seen.add(`${d.n},${d.m}`);
}
console.log(`\nSweep surfaces ${seen.size} distinct dominant figures: ${[...seen].join('  ')}`);
