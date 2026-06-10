// Canvas 2D fallback — additive pixel plotting into an ImageData buffer.
// Fewer grains, but fast and crisp. Colour by speed, same palette as WebGL.

import { type Renderer, CANVAS_GRAINS } from './renderer';

// Background (near-black anodised plate) as 0..255.
const BG_R = 10;
const BG_G = 10;
const BG_B = 11;

export class Canvas2DRenderer implements Renderer {
  readonly kind = 'canvas2d' as const;
  readonly capacity = CANVAS_GRAINS;

  private readonly ctx: CanvasRenderingContext2D;
  private image: ImageData;
  private buf: Uint8ClampedArray;
  private w = 1;
  private h = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.image = ctx.createImageData(1, 1);
    this.buf = this.image.data;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    // Cap the backing resolution on the fallback path to protect the fill rate.
    const scale = Math.min(dpr, 2);
    this.w = Math.max(1, Math.round(cssW * scale));
    this.h = Math.max(1, Math.round(cssH * scale));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.image = this.ctx.createImageData(this.w, this.h);
    this.buf = this.image.data;
  }

  draw(pos: Float32Array, speed: Float32Array, count: number, _glow: boolean): void {
    const { buf, w, h } = this;
    // Clear to background.
    for (let p = 0; p < buf.length; p += 4) {
      buf[p] = BG_R;
      buf[p + 1] = BG_G;
      buf[p + 2] = BG_B;
      buf[p + 3] = 255;
    }

    for (let g = 0; g < count; g++) {
      const x = (pos[g * 2] * (w - 1)) | 0;
      const y = (pos[g * 2 + 1] * (h - 1)) | 0;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const s = speed[g];
      // sand → amber by speed.
      const r = 232 + s * 23; // 232→255
      const gg = 213 - s * 50; // 213→163
      const b = 168 - s * 105; // 168→63
      const idx = (y * w + x) * 4;
      // Additive so overlapping grains brighten the nodal lines.
      buf[idx] = Math.min(255, buf[idx] + r * 0.7);
      buf[idx + 1] = Math.min(255, buf[idx + 1] + gg * 0.7);
      buf[idx + 2] = Math.min(255, buf[idx + 2] + b * 0.7);
    }

    this.ctx.putImageData(this.image, 0, 0);
  }
}
