// The instrument rail — frequency slider with resonance ticks, the live readout,
// and a quiet diagnostics line. Silent in Step 1; Tone mode wires audio in later.

import { F_MIN, F_MAX } from '../physics/modes';
import { getState, subscribe, setFrequency } from '../store';

export interface RailHandles {
  /** Pull the live frequency toward the nearest resonance ('gravitation'). */
  setGravitation(on: boolean): void;
}

export function buildRail(root: HTMLElement, resonances: number[]): RailHandles {
  root.innerHTML = '';

  const pct = (f: number) => ((f - F_MIN) / (F_MAX - F_MIN)) * 100;

  // ── Header ────────────────────────────────────────────────────────────
  const header = el('div', 'rail__header');
  header.append(
    el('h1', 'rail__title', 'CYMATICS MACHINE'),
    el('p', 'rail__subtitle', 'Sand finds the nodal lines.'),
  );

  // ── Readout ───────────────────────────────────────────────────────────
  const readout = el('output', 'rail__readout');
  readout.setAttribute('aria-live', 'polite');

  // ── Slider with resonance ticks ───────────────────────────────────────
  const sliderWrap = el('div', 'rail__slider');
  const ticks = el('div', 'rail__ticks');
  for (const f of resonances) {
    const tick = el('span', 'rail__tick');
    tick.style.left = `${pct(f)}%`;
    tick.title = `resonance ≈ ${f} Hz`;
    ticks.append(tick);
  }
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(F_MIN);
  slider.max = String(F_MAX);
  slider.step = '1';
  slider.value = String(getState().frequency);
  slider.className = 'rail__range';
  slider.setAttribute('aria-label', 'Driving frequency in hertz');
  slider.addEventListener('input', () => setFrequency(Number(slider.value)));
  sliderWrap.append(ticks, slider);

  const scale = el('div', 'rail__scale');
  scale.append(el('span', '', `${F_MIN} Hz`), el('span', '', `${F_MAX} Hz`));

  // ── Diagnostics ───────────────────────────────────────────────────────
  const diag = el('div', 'rail__diag');

  root.append(header, readout, sliderWrap, scale, diag);

  // ── Live updates from the store ───────────────────────────────────────
  subscribe((s) => {
    if (document.activeElement !== slider) slider.value = String(Math.round(s.frequency));
    const modeLabel = s.dominant ? `mode (${s.dominant.n},${s.dominant.m})` : 'mode …';
    readout.textContent = `f = ${Math.round(s.frequency)} Hz · ${modeLabel}`;
    diag.textContent = `${s.renderer} · ${s.fps.toFixed(0)} fps`;
  });

  return {
    setGravitation: () => {
      /* wired in Tone mode */
    },
  };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
