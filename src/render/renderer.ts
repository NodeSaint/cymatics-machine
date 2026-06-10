// Common renderer contract + factory. Tries WebGL1 first (30k point sprites),
// falls back to Canvas 2D (reduced count) when WebGL is unavailable.

export interface Renderer {
  readonly kind: 'webgl' | 'canvas2d';
  /** Grain count this renderer is sized for. */
  readonly capacity: number;
  /** Resize backing store to CSS pixels w×h at the given device pixel ratio. */
  resize(cssW: number, cssH: number, dpr: number): void;
  /** Draw `count` grains: pos is interleaved x,y ∈ [0,1]; speed ∈ [0,1] per grain. */
  draw(pos: Float32Array, speed: Float32Array, count: number, glow: boolean): void;
}

export const WEBGL_GRAINS = 30000;
export const CANVAS_GRAINS = 12000;
