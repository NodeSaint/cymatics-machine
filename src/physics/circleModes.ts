// Circular free-plate modes (modal approximation), built as the same Mode shape
// the square plate uses — so the Field, grain, and render machinery is reused
// unchanged; only the basis and the grain containment differ.
//
//   u_nm(r,θ) = J_n(j_nm · r) · cos(n·θ)      r ∈ [0,1], rim at r = 1
//
// j_nm is the m-th positive zero of J_n, so J_n(j_nm) = 0 puts a nodal circle on
// the rim (clamped edge). n = number of nodal diameters, m = number of circles.

import { GRID, F_MIN, F_MAX, type Mode } from './modes';
import { besselJ, besselZeros } from './bessel';

const N_MAX = 5; // nodal diameters
const M_MAX = 4; // nodal circles

/** Build the circular modal basis: (n,m) for n=0..N_MAX, m=1..M_MAX, by frequency. */
export function buildCircleModes(): Mode[] {
  // Collect eigenvalues j_nm and map their range into 50–2000 Hz.
  const specs: Array<{ n: number; m: number; j: number }> = [];
  let jMin = Infinity;
  let jMax = -Infinity;
  for (let n = 0; n <= N_MAX; n++) {
    const zeros = besselZeros(n, M_MAX);
    for (let m = 1; m <= M_MAX; m++) {
      const j = zeros[m - 1];
      specs.push({ n, m, j });
      if (j < jMin) jMin = j;
      if (j > jMax) jMax = j;
    }
  }

  const modes: Mode[] = specs.map(({ n, m, j }) => {
    const fnm = F_MIN + ((j - jMin) / (jMax - jMin)) * (F_MAX - F_MIN);
    const psi = new Float32Array(GRID * GRID);
    let maxAbs = 0;
    for (let iy = 0; iy < GRID; iy++) {
      const y = (iy / (GRID - 1) - 0.5) / 0.5; // ∈ [-1,1] across the disk
      const rowBase = iy * GRID;
      for (let ix = 0; ix < GRID; ix++) {
        const x = (ix / (GRID - 1) - 0.5) / 0.5;
        const r = Math.hypot(x, y);
        const theta = Math.atan2(y, x);
        const v = besselJ(n, j * r) * Math.cos(n * theta);
        psi[rowBase + ix] = v;
        const a = v < 0 ? -v : v;
        if (a > maxAbs) maxAbs = a;
      }
    }
    if (maxAbs > 0) {
      const inv = 1 / maxAbs;
      for (let k = 0; k < psi.length; k++) psi[k] *= inv;
    }
    return { n, m, fnm, psi };
  });

  modes.sort((a, b) => a.fnm - b.fnm);
  return modes;
}
