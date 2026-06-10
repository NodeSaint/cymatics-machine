// Grain system — phenomenological "sand" that descends the |Ψ| landscape and
// settles on nodal lines. CPU physics; the renderer only draws the buffers.
//
// Per grain, per frame:
//   1. descend the gradient of |Ψ|  (toward nodal lines where |Ψ| → 0)
//   2. jitter with amplitude ∝ |Ψ|  (antinodes shake grains loose; nodes are quiet)
//   3. mild damping + wall containment
// Colour is driven by speed: hot amber moving → pale sand settled.
//
// No DOM/WebGL imports, so the model runs headlessly for convergence testing.

import type { Field } from '../physics/field';

export interface GrainConfig {
  /** Down-gradient pull toward nodal lines. */
  descent: number;
  /** Stochastic kick amplitude, multiplied by local |Ψ|. */
  jitter: number;
  /** Velocity retained each frame (mild damping). */
  damping: number;
  /** Baseline floor of jitter so settled grains still breathe a touch (× jitter). */
  jitterFloor: number;
  /** Hard speed clamp to keep the integrator stable. */
  maxSpeed: number;
}

export const DEFAULT_CONFIG: GrainConfig = {
  descent: 0.0013,
  jitter: 0.022,
  damping: 0.88,
  jitterFloor: 0.07,
  maxSpeed: 0.05,
};

/** Fast deterministic PRNG (mulberry32) so headless runs are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Grains {
  readonly count: number;
  /** Interleaved x,y ∈ [0,1]², length 2·count. Uploaded to the GPU each frame. */
  readonly pos: Float32Array;
  /** Per-grain speed in [0,1] after normalisation, for colour. Length count. */
  readonly speed: Float32Array;

  private readonly vel: Float32Array; // interleaved vx,vy
  private readonly rand: () => number;
  private readonly grad = { gx: 0, gy: 0 };

  config: GrainConfig;

  constructor(count: number, config: GrainConfig = DEFAULT_CONFIG, seed = 0x9e3779b9) {
    this.count = count;
    this.pos = new Float32Array(count * 2);
    this.vel = new Float32Array(count * 2);
    this.speed = new Float32Array(count);
    this.config = { ...config };
    this.rand = mulberry32(seed);
    this.scatter();
  }

  /** Uniformly scatter all grains across the plate and reset velocities. */
  scatter(): void {
    const { pos, vel, rand, count } = this;
    for (let g = 0; g < count; g++) {
      pos[g * 2] = rand();
      pos[g * 2 + 1] = rand();
      vel[g * 2] = 0;
      vel[g * 2 + 1] = 0;
      this.speed[g] = 0;
    }
  }

  /** Inject a radial velocity impulse from the plate centre (kick "jolt"). */
  jolt(strength: number): void {
    const { pos, vel, count, rand } = this;
    for (let g = 0; g < count; g++) {
      const dx = pos[g * 2] - 0.5;
      const dy = pos[g * 2 + 1] - 0.5;
      const d = Math.hypot(dx, dy) || 1e-4;
      const s = strength * (0.5 + rand() * 0.5);
      vel[g * 2] += (dx / d) * s;
      vel[g * 2 + 1] += (dy / d) * s;
    }
  }

  /**
   * Advance the simulation. `dtScale` = dt / (1/60), clamped, so motion is
   * roughly frame-rate independent. `motion` ∈ [0,1] globally scales jitter
   * (reduced-motion lowers it; silence in Voice mode can freeze it at 0).
   */
  update(field: Field, dtScale: number, motion = 1): void {
    const { pos, vel, speed, count, grad, rand, config } = this;
    const dt = dtScale < 0.25 ? 0.25 : dtScale > 3 ? 3 : dtScale;
    const descent = config.descent * dt;
    const jitterAmp = config.jitter * motion;
    const floor = config.jitterFloor;
    const damping = Math.pow(config.damping, dt);
    const maxSpeed = config.maxSpeed;
    const invMax = 1 / maxSpeed;

    for (let g = 0; g < count; g++) {
      const ix = g * 2;
      const iy = ix + 1;
      let x = pos[ix];
      let y = pos[iy];

      field.sampleGradient(x, y, grad);
      const mag = field.sampleMag(x, y);

      // 1. descend gradient of |Ψ| toward the nodal line.
      let vx = vel[ix] * damping - grad.gx * descent;
      let vy = vel[iy] * damping - grad.gy * descent;

      // 2. jitter proportional to |Ψ| (plus a small floor so it stays alive).
      const kick = jitterAmp * (mag + floor) * dt;
      vx += (rand() - 0.5) * kick;
      vy += (rand() - 0.5) * kick;

      // clamp velocity for integrator stability.
      const sp = Math.hypot(vx, vy);
      if (sp > maxSpeed) {
        const s = maxSpeed / sp;
        vx *= s;
        vy *= s;
      }

      x += vx;
      y += vy;

      // 3. wall containment — reflect softly so grains pool at the edges, not stick.
      if (x < 0) {
        x = -x;
        vx = -vx * 0.4;
      } else if (x > 1) {
        x = 2 - x;
        vx = -vx * 0.4;
      }
      if (y < 0) {
        y = -y;
        vy = -vy * 0.4;
      } else if (y > 1) {
        y = 2 - y;
        vy = -vy * 0.4;
      }

      pos[ix] = x;
      pos[iy] = y;
      vel[ix] = vx;
      vel[iy] = vy;
      speed[g] = sp > maxSpeed ? 1 : sp * invMax; // normalised for colour
    }
  }
}
