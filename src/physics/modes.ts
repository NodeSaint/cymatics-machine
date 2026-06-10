// Modal basis for a square free plate (modal approximation — see the About panel).
//
//   psi_nm(x,y) = cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy),   x,y ∈ [0,1]
//
// psi_nm with n == m is identically zero, and psi_mn = −psi_nm, so the unordered
// pair {n,m} with n < m is the unit of a distinct Chladni figure. We precompute
// every such mode on a GRID×GRID Float32 grid at boot.

export const GRID = 128; // field resolution (128×128)
export const N_MAX = 8; // highest mode index

export const F_MIN = 50; // Hz — bottom of the driven range
export const F_MAX = 2000; // Hz — top of the driven range

export interface Mode {
  n: number;
  m: number;
  /** Resonant frequency in Hz: (n²+m²) mapped linearly into [F_MIN, F_MAX]. */
  fnm: number;
  /** Mode shape on the GRID×GRID grid, normalised so max|psi| = 1. Row-major: idx = j*GRID + i. */
  psi: Float32Array;
}

/** Precompute cos(k·π·x_i) for k = 0..N_MAX along one axis. */
function cosineTable(): Float32Array[] {
  const table: Float32Array[] = [];
  for (let k = 0; k <= N_MAX; k++) {
    const row = new Float32Array(GRID);
    for (let i = 0; i < GRID; i++) {
      const x = i / (GRID - 1); // ∈ [0,1]
      row[i] = Math.cos(k * Math.PI * x);
    }
    table.push(row);
  }
  return table;
}

/** Build the full modal basis: all {n,m} with 1 ≤ n < m ≤ N_MAX, sorted by frequency. */
export function buildModes(): Mode[] {
  const cx = cosineTable();

  // First pass: collect (n,m) and their (n²+m²) so we can map the range into Hz.
  const pairs: Array<{ n: number; m: number; s: number }> = [];
  let sMin = Infinity;
  let sMax = -Infinity;
  for (let n = 1; n <= N_MAX; n++) {
    for (let m = n + 1; m <= N_MAX; m++) {
      const s = n * n + m * m;
      pairs.push({ n, m, s });
      if (s < sMin) sMin = s;
      if (s > sMax) sMax = s;
    }
  }

  const modes: Mode[] = pairs.map(({ n, m, s }) => {
    const fnm = F_MIN + ((s - sMin) / (sMax - sMin)) * (F_MAX - F_MIN);
    const psi = new Float32Array(GRID * GRID);
    const cn = cx[n];
    const cm = cx[m];
    let maxAbs = 0;
    for (let j = 0; j < GRID; j++) {
      const cnYj = cn[j];
      const cmYj = cm[j];
      const rowBase = j * GRID;
      for (let i = 0; i < GRID; i++) {
        const v = cn[i] * cmYj - cm[i] * cnYj;
        psi[rowBase + i] = v;
        const a = v < 0 ? -v : v;
        if (a > maxAbs) maxAbs = a;
      }
    }
    // Normalise to [-1, 1] so Lorentzian weights compare fairly across modes.
    if (maxAbs > 0) {
      const inv = 1 / maxAbs;
      for (let k = 0; k < psi.length; k++) psi[k] *= inv;
    }
    return { n, m, fnm, psi };
  });

  modes.sort((a, b) => a.fnm - b.fnm);
  return modes;
}

/** Unique resonance frequencies (Hz), ascending — used to draw slider ticks. */
export function resonanceFrequencies(modes: Mode[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const mode of modes) {
    const r = Math.round(mode.fnm);
    if (!seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}
