// The instrument rail — sound toggle, explainer, mode selector, frequency slider
// with resonance ticks, the live readout, the one-octave keyboard, and a quiet
// diagnostics line.

import { F_MIN, F_MAX } from '../physics/modes';
import { getState, subscribe, setFrequency, setState, type DriveMode } from '../store';
import { createExplainer } from './explainer';
import { buildKeyboard, type KeyboardHandle } from './keyboard';

export interface RailOptions {
  resonances: number[];
  /** Play a note: set frequency and ensure sound is on. */
  onNote: (freq: number) => void;
  /** Toggle sound on/off (handles the AudioContext gesture). */
  onToggleSound: () => void;
  /** Fired when the user moves the slider (enables resonance gravitation). */
  onSliderInput: () => void;
}

export interface RailHandle {
  keyboard: KeyboardHandle;
}

// Modes implemented so far; others render as forthcoming.
const MODES: Array<{ id: DriveMode; label: string; ready: boolean }> = [
  { id: 'tone', label: 'Tone', ready: true },
  { id: 'composition', label: 'Composition', ready: false },
  { id: 'voice', label: 'Voice', ready: false },
  { id: 'signature', label: 'Signature', ready: false },
];

export function buildRail(root: HTMLElement, opts: RailOptions): RailHandle {
  root.innerHTML = '';
  const pct = (f: number) => ((f - F_MIN) / (F_MAX - F_MIN)) * 100;

  // ── Header: title, sound toggle, explainer ────────────────────────────
  const header = el('div', 'rail__header');
  const titleWrap = el('div', 'rail__titlewrap');
  titleWrap.append(
    el('h1', 'rail__title', 'CYMATICS MACHINE'),
    el('p', 'rail__subtitle', 'Sand finds the nodal lines.'),
  );

  const controls = el('div', 'rail__controls');
  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.className = 'rail__icon rail__sound';
  soundBtn.addEventListener('click', opts.onToggleSound);

  const explainer = createExplainer();
  controls.append(soundBtn, explainer.button);
  header.append(titleWrap, controls);

  // ── Mode selector ─────────────────────────────────────────────────────
  const modeBar = el('div', 'rail__modes');
  modeBar.setAttribute('role', 'tablist');
  const modeButtons = new Map<DriveMode, HTMLButtonElement>();
  for (const m of MODES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail__mode';
    b.textContent = m.label;
    b.setAttribute('role', 'tab');
    if (!m.ready) {
      b.disabled = true;
      b.title = 'Coming soon';
      b.classList.add('is-soon');
    } else {
      b.addEventListener('click', () => setState({ mode: m.id }));
    }
    modeButtons.set(m.id, b);
    modeBar.append(b);
  }

  // ── Readout ───────────────────────────────────────────────────────────
  const readout = el('output', 'rail__readout');
  readout.setAttribute('aria-live', 'polite');

  // ── Slider with resonance ticks ───────────────────────────────────────
  const sliderWrap = el('div', 'rail__slider');
  const ticks = el('div', 'rail__ticks');
  for (const f of opts.resonances) {
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
  slider.value = String(Math.round(getState().frequency));
  slider.className = 'rail__range';
  slider.setAttribute('aria-label', 'Driving frequency in hertz');
  slider.addEventListener('input', () => {
    setFrequency(Number(slider.value));
    opts.onSliderInput();
  });
  sliderWrap.append(ticks, slider);

  const scale = el('div', 'rail__scale');
  scale.append(el('span', '', `${F_MIN} Hz`), el('span', '', `${F_MAX} Hz`));

  // ── Keyboard (Tone mode) ──────────────────────────────────────────────
  const keyboard = buildKeyboard((freq) => opts.onNote(freq));
  const kbdPanel = el('div', 'rail__kbd');
  kbdPanel.append(keyboard.el);

  // ── Diagnostics ───────────────────────────────────────────────────────
  const diag = el('div', 'rail__diag');

  root.append(header, modeBar, readout, sliderWrap, scale, kbdPanel, diag);

  // ── Live updates ──────────────────────────────────────────────────────
  subscribe((s) => {
    if (document.activeElement !== slider) slider.value = String(Math.round(s.frequency));
    const modeLabel = s.dominant ? `mode (${s.dominant.n},${s.dominant.m})` : 'mode …';
    readout.textContent = `f = ${Math.round(s.frequency)} Hz · ${modeLabel}`;
    diag.textContent = `${s.renderer} · ${s.fps.toFixed(0)} fps`;

    soundBtn.textContent = s.audioOn ? '♪ on' : '♪ off';
    soundBtn.classList.toggle('is-on', s.audioOn);
    soundBtn.setAttribute('aria-pressed', String(s.audioOn));
    soundBtn.title = s.audioOn ? 'Sound on — click to mute' : 'Sound off — click to play';

    for (const [id, b] of modeButtons) b.classList.toggle('is-active', id === s.mode);
    kbdPanel.style.display = s.mode === 'tone' ? '' : 'none';
  });

  return { keyboard };
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
