// Deterministic Sonic Signature render → 1080×1080 PNG. The figure is produced
// by a fixed-seed, fixed-step simulation (NOT the live, frame-timed grains), so
// the same word yields byte-identical pixels for the figure on the same engine.
// Stamped with the word, its frequency sequence, and "CYMATICS MACHINE".

import { type Mode } from './physics/modes';
import { Field } from './physics/field';
import { Grains, DEFAULT_CONFIG } from './grains/grains';
import { signatureFrequencies, sanitiseWord } from './signature';

const SIZE = 1080;
const EXPORT_GRAINS = 60000;
const SEED = 0x5f3759df; // fixed → reproducible
const STEPS_PER_LETTER = 34; // morph dwell per character
const SETTLE_STEPS = 170; // crisp the final figure

// Palette (matches the live plate).
const BG = [10, 10, 11];
const SAND = [232, 213, 168];
const AMBER = [255, 178, 77];

/**
 * The deterministic figure: a fixed-seed, fixed-step simulation of the word's
 * morph. Pure — same word ⇒ identical grain positions on every run. No DOM, so
 * it can be exercised headlessly.
 */
export function simulateSignature(word: string, modes: Mode[]): Grains {
  const clean = sanitiseWord(word) || 'CYMATICS';
  const freqs = signatureFrequencies(clean);
  const sequence = freqs.length ? freqs : [432];

  const field = new Field(modes);
  const grains = new Grains(EXPORT_GRAINS, DEFAULT_CONFIG, SEED);

  // Perform the word: dwell on each frequency so the path (not just the last
  // note) shapes the final figure.
  for (const f of sequence) {
    field.setFrequency(f);
    for (let k = 0; k < STEPS_PER_LETTER; k++) grains.update(field, 1, 1);
  }
  // Settle on the final figure with reduced jitter for crisp nodal lines.
  field.setFrequency(sequence[sequence.length - 1]);
  for (let k = 0; k < SETTLE_STEPS; k++) grains.update(field, 1, 0.25);

  return grains;
}

/** Run the deterministic morph and return the final grain figure as a canvas. */
export function renderSignature(word: string, modes: Mode[]): HTMLCanvasElement {
  const clean = sanitiseWord(word) || 'CYMATICS';
  const sequence = signatureFrequencies(clean).length ? signatureFrequencies(clean) : [432];
  const grains = simulateSignature(word, modes);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  drawGrains(ctx, grains);
  drawFrame(ctx);
  drawStamps(ctx, clean, sequence);

  return canvas;
}

/** Additive plot of the grains into the plate area. */
function drawGrains(ctx: CanvasRenderingContext2D, grains: Grains): void {
  const img = ctx.createImageData(SIZE, SIZE);
  const buf = img.data;
  for (let p = 0; p < buf.length; p += 4) {
    buf[p] = BG[0];
    buf[p + 1] = BG[1];
    buf[p + 2] = BG[2];
    buf[p + 3] = 255;
  }

  const inset = 40; // leave room for the brass frame
  const span = SIZE - inset * 2;
  const plot = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    buf[i] = Math.min(255, buf[i] + r * a);
    buf[i + 1] = Math.min(255, buf[i + 1] + g * a);
    buf[i + 2] = Math.min(255, buf[i + 2] + b * a);
  };

  for (let gi = 0; gi < grains.count; gi++) {
    const px = inset + grains.pos[gi * 2] * span;
    const py = inset + grains.pos[gi * 2 + 1] * span;
    const s = grains.speed[gi];
    const r = SAND[0] + (AMBER[0] - SAND[0]) * s;
    const g = SAND[1] + (AMBER[1] - SAND[1]) * s;
    const b = SAND[2] + (AMBER[2] - SAND[2]) * s;
    const x = px | 0;
    const y = py | 0;
    // 2×2 soft footprint for body, with a faint surrounding glow.
    plot(x, y, r, g, b, 0.5);
    plot(x + 1, y, r, g, b, 0.3);
    plot(x, y + 1, r, g, b, 0.3);
    plot(x + 1, y + 1, r, g, b, 0.2);
  }

  ctx.putImageData(img, 0, 0);
}

/** Brass bezel + bottom scrim for the caption. */
function drawFrame(ctx: CanvasRenderingContext2D): void {
  // Bottom scrim so text reads over the figure.
  const grad = ctx.createLinearGradient(0, SIZE - 260, 0, SIZE);
  grad.addColorStop(0, 'rgba(8,8,10,0)');
  grad.addColorStop(1, 'rgba(8,8,10,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, SIZE - 260, SIZE, 260);

  // Brass frame.
  const bz = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bz.addColorStop(0, '#e7c882');
  bz.addColorStop(0.4, '#6b5836');
  bz.addColorStop(0.7, '#b69256');
  bz.addColorStop(1, '#e7c882');
  ctx.strokeStyle = bz;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, SIZE - 16, SIZE - 16);
}

/** Word, frequency sequence, and the wordmark. */
function drawStamps(ctx: CanvasRenderingContext2D, word: string, freqs: number[]): void {
  ctx.textBaseline = 'alphabetic';

  // The word — large, sand, letterspaced.
  ctx.fillStyle = '#e8d5a8';
  ctx.font = '600 84px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.textAlign = 'center';
  drawTracked(ctx, word, SIZE / 2, SIZE - 132, 8);

  // Frequency sequence — small, dim.
  ctx.fillStyle = '#9a8f74';
  ctx.font = '400 26px ui-monospace, "SF Mono", Menlo, monospace';
  const seq = freqs.map((f) => `${Math.round(f)}`).join('  ·  ') + ' Hz';
  ctx.fillText(seq, SIZE / 2, SIZE - 86, SIZE - 120);

  // Wordmark.
  ctx.fillStyle = '#b69256';
  ctx.font = '600 22px ui-monospace, "SF Mono", Menlo, monospace';
  drawTracked(ctx, 'CYMATICS MACHINE', SIZE / 2, SIZE - 44, 10);
}

/** Centred text with manual letter-spacing (portable across engines). */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number,
): void {
  const widths = [...text].map((ch) => ctx.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let x = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += widths[i];
  }
  ctx.textAlign = prev;
}

/** Trigger a PNG download of the signature for `word`. */
export function exportSignaturePNG(word: string, modes: Mode[]): void {
  const canvas = renderSignature(word, modes);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cymatics-${sanitiseWord(word).toLowerCase().replace(/\s+/g, '-') || 'signature'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
