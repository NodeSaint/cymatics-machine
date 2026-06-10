// The live field Ψ and the |Ψ| landscape the grains descend.
//
//   w_nm(f) = 1 / (1 + ((f − f_nm)/Γ)²)        Lorentzian excitation weight
//   Ψ       = Σ w_nm · psi_nm                   recombined only past a threshold
//
// Grains gather on nodal lines, where |Ψ| → 0, so they descend the gradient of
// |Ψ| (computed by central differences). Sampling is bilinear. No DOM/WebGL here
// so the model can be exercised headlessly.

import { GRID, type Mode } from './modes';

/** Linewidth Γ (Hz) of the Lorentzian — how broadly a driving tone excites nearby modes. */
const GAMMA = 55;

/** Recombine when any weight has moved more than this since the last rebuild. */
const RECOMBINE_THRESHOLD = 0.012;

/** Weights below this are skipped during recombination (negligible contribution). */
const WEIGHT_EPS = 0.004;

export interface DominantMode {
  n: number;
  m: number;
  weight: number;
}

export class Field {
  readonly size = GRID;
  readonly psi = new Float32Array(GRID * GRID); // current Ψ
  readonly mag = new Float32Array(GRID * GRID); // |Ψ|, normalised to [0,1]
  readonly gradX = new Float32Array(GRID * GRID); // ∂|Ψ|/∂x in [0,1]-space
  readonly gradY = new Float32Array(GRID * GRID); // ∂|Ψ|/∂y in [0,1]-space

  private readonly modes: Mode[];
  private readonly weights: Float32Array;
  private readonly lastWeights: Float32Array;
  private frequency = -1;
  private built = false;

  dominant: DominantMode | null = null;

  constructor(modes: Mode[]) {
    this.modes = modes;
    this.weights = new Float32Array(modes.length);
    this.lastWeights = new Float32Array(modes.length);
    this.lastWeights.fill(-1);
  }

  /** Set the driving frequency (Hz). Returns true if the field was recombined. */
  setFrequency(f: number): boolean {
    if (f === this.frequency && this.built) return false;
    this.frequency = f;

    let maxDelta = 0;
    let domWeight = -1;
    let domIndex = 0;
    for (let k = 0; k < this.modes.length; k++) {
      const d = (f - this.modes[k].fnm) / GAMMA;
      const w = 1 / (1 + d * d);
      this.weights[k] = w;
      const delta = Math.abs(w - this.lastWeights[k]);
      if (delta > maxDelta) maxDelta = delta;
      if (w > domWeight) {
        domWeight = w;
        domIndex = k;
      }
    }

    const dom = this.modes[domIndex];
    this.dominant = { n: dom.n, m: dom.m, weight: domWeight };

    if (!this.built || maxDelta > RECOMBINE_THRESHOLD) {
      this.recombine();
      this.lastWeights.set(this.weights);
      this.built = true;
      return true;
    }
    return false;
  }

  /** Ψ = Σ w·psi, then |Ψ| normalised, then its gradient. Budget < 2 ms. */
  private recombine(): void {
    const { psi, mag, modes, weights } = this;
    psi.fill(0);

    for (let k = 0; k < modes.length; k++) {
      const w = weights[k];
      if (w < WEIGHT_EPS) continue;
      const src = modes[k].psi;
      for (let p = 0; p < psi.length; p++) psi[p] += w * src[p];
    }

    // |Ψ|, tracking the peak for normalisation.
    let peak = 0;
    for (let p = 0; p < psi.length; p++) {
      const a = psi[p] < 0 ? -psi[p] : psi[p];
      mag[p] = a;
      if (a > peak) peak = a;
    }
    if (peak > 0) {
      const inv = 1 / peak;
      for (let p = 0; p < mag.length; p++) mag[p] *= inv;
    }

    this.computeGradient();
  }

  /** Central-difference gradient of |Ψ| in [0,1] coordinates. */
  private computeGradient(): void {
    const { mag, gradX, gradY } = this;
    const n = GRID;
    const scale = (n - 1) / 2; // d/dx where x ∈ [0,1]: (f[i+1]−f[i−1]) · (n−1)/2
    for (let j = 0; j < n; j++) {
      const row = j * n;
      const up = j > 0 ? row - n : row;
      const down = j < n - 1 ? row + n : row;
      for (let i = 0; i < n; i++) {
        const left = i > 0 ? i - 1 : i;
        const right = i < n - 1 ? i + 1 : i;
        gradX[row + i] = (mag[row + right] - mag[row + left]) * scale;
        gradY[row + i] = (mag[down + i] - mag[up + i]) * scale;
      }
    }
  }

  /** Bilinear sample of |Ψ| at normalised (x,y) ∈ [0,1]². */
  sampleMag(x: number, y: number): number {
    return this.bilinear(this.mag, x, y);
  }

  /** Bilinear sample of the |Ψ| gradient into out = [gx, gy]. */
  sampleGradient(x: number, y: number, out: { gx: number; gy: number }): void {
    out.gx = this.bilinear(this.gradX, x, y);
    out.gy = this.bilinear(this.gradY, x, y);
  }

  private bilinear(grid: Float32Array, x: number, y: number): number {
    const n = GRID;
    let fx = x * (n - 1);
    let fy = y * (n - 1);
    if (fx < 0) fx = 0;
    else if (fx > n - 1) fx = n - 1;
    if (fy < 0) fy = 0;
    else if (fy > n - 1) fy = n - 1;
    const i0 = fx | 0;
    const j0 = fy | 0;
    const i1 = i0 < n - 1 ? i0 + 1 : i0;
    const j1 = j0 < n - 1 ? j0 + 1 : j0;
    const tx = fx - i0;
    const ty = fy - j0;
    const a = grid[j0 * n + i0];
    const b = grid[j0 * n + i1];
    const c = grid[j1 * n + i0];
    const d = grid[j1 * n + i1];
    const top = a + (b - a) * tx;
    const bottom = c + (d - c) * tx;
    return top + (bottom - top) * ty;
  }
}
