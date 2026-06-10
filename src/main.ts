// Boot, resize, and the render loop. Wires modes → field → grains → renderer,
// plus the Tone-mode audio, resonance gravitation, and keyboard.

import './style.css';
import { buildModes, resonanceFrequencies, F_MIN, F_MAX } from './physics/modes';
import { Field } from './physics/field';
import { Grains } from './grains/grains';
import { type Renderer } from './render/renderer';
import { WebGLRenderer } from './render/webgl';
import { Canvas2DRenderer } from './render/canvas2d';
import { getState, setState, setFrequency, subscribe, type DriveMode } from './store';
import { buildRail } from './ui/rail';
import { engine } from './audio/engine';
import { ToneVoice } from './audio/tone';

const READY_MODES = new Set<DriveMode>(['tone']); // expands as modes come online
const GRAV_WINDOW = 26; // Hz — capture range of resonance gravitation
const GRAV_EASE = 0.1; // per-frame easing toward a resonance

function boot(): void {
  const canvas = document.getElementById('plate') as HTMLCanvasElement;
  const railRoot = document.getElementById('rail') as HTMLElement;

  // ── Physics ───────────────────────────────────────────────────────────
  const modes = buildModes();
  const field = new Field(modes);
  const resonances = resonanceFrequencies(modes);

  const initialF = Number(new URLSearchParams(location.search).get('f'));
  if (Number.isFinite(initialF) && initialF > 0) setFrequency(initialF);
  field.setFrequency(getState().frequency);

  // ── Renderer ──────────────────────────────────────────────────────────
  let renderer: Renderer;
  try {
    renderer = new WebGLRenderer(canvas);
  } catch {
    renderer = new Canvas2DRenderer(canvas);
  }
  setState({ renderer: renderer.kind });
  const grains = new Grains(renderer.capacity);

  // ── Audio (Tone mode) ─────────────────────────────────────────────────
  let toneVoice: ToneVoice | null = null;

  async function syncAudio(): Promise<void> {
    const s = getState();
    const wantTone = s.audioOn && s.mode === 'tone';
    if (wantTone && !toneVoice) {
      const ctx = await engine.start();
      toneVoice = new ToneVoice(ctx, engine.master);
      toneVoice.start(s.frequency);
      engine.fadeMaster(0.85);
    } else if (!wantTone && toneVoice) {
      engine.fadeMaster(0);
      const v = toneVoice;
      toneVoice = null;
      setTimeout(() => v.stop(), 170);
    }
  }

  let lastInputAt = 0;
  let allowGravitation = true; // slider/arrows gravitate; played notes hold their exact pitch
  const markInput = (gravitate: boolean) => {
    lastInputAt = performance.now();
    allowGravitation = gravitate;
  };

  function playNote(freq: number): void {
    setFrequency(freq);
    if (!getState().audioOn) setState({ audioOn: true });
    markInput(false); // exact note pitch — do not pull to a resonance
  }

  // ── UI ────────────────────────────────────────────────────────────────
  const rail = buildRail(railRoot, {
    resonances,
    onNote: playNote,
    onToggleSound: () => setState({ audioOn: !getState().audioOn }),
    onSliderInput: () => markInput(true),
  });

  // React to audio-relevant state transitions.
  let prevAudioOn = getState().audioOn;
  let prevMode = getState().mode;
  subscribe((s) => {
    if (s.audioOn !== prevAudioOn || s.mode !== prevMode) {
      prevAudioOn = s.audioOn;
      prevMode = s.mode;
      void syncAudio();
    }
  });

  installKeyboard(rail.keyboard.handleChar, () => markInput(true));

  // ── Resize ────────────────────────────────────────────────────────────
  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.resize(rect.width, rect.height, dpr);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ── Render loop ───────────────────────────────────────────────────────
  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;

  function frame(now: number): void {
    const dtMs = now - last;
    last = now;
    const dtScale = dtMs / (1000 / 60);

    const s = getState();

    // Gentle gravitation toward the nearest resonance once the user pauses.
    // Suppressed after a played note so the keyboard stays in tune.
    if (s.mode === 'tone' && allowGravitation && now - lastInputAt > 150) {
      const r = nearestResonance(resonances, s.frequency);
      const gap = r - s.frequency;
      if (Math.abs(gap) > 0.04 && Math.abs(gap) < GRAV_WINDOW) {
        setFrequency(s.frequency + gap * Math.min(1, GRAV_EASE * dtScale));
      }
    }

    field.setFrequency(getState().frequency);
    if (field.dominant) {
      const d = getState().dominant;
      if (!d || d.n !== field.dominant.n || d.m !== field.dominant.m) {
        setState({ dominant: { n: field.dominant.n, m: field.dominant.m } });
      }
    }
    if (toneVoice) toneVoice.setFrequency(getState().frequency);

    const motion = s.reducedMotion ? 0.45 : 1;
    grains.update(field, dtScale, motion);
    renderer.draw(grains.pos, grains.speed, grains.count, !s.reducedMotion);

    fpsAccum += dtMs;
    fpsFrames++;
    if (fpsAccum >= 400) {
      setState({ fps: (fpsFrames * 1000) / fpsAccum });
      fpsAccum = 0;
      fpsFrames = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (typeof matchMedia !== 'undefined') {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      setState({ reducedMotion: e.matches });
    });
  }

  // Dev-only inspection hook (stripped from production builds).
  if (import.meta.env.DEV) {
    (window as unknown as { __cym: unknown }).__cym = {
      get state() {
        return getState();
      },
      get audioState() {
        return engine.context?.state ?? 'none';
      },
    };
  }
}

/** Nearest resonance frequency to f (linear scan over the small set). */
function nearestResonance(resonances: number[], f: number): number {
  let best = resonances[0];
  let bestD = Infinity;
  for (const r of resonances) {
    const d = Math.abs(r - f);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

/** Global keyboard: notes (Tone), arrows nudge f, digits jump modes, Space toggles sound. */
function installKeyboard(handleNote: (char: string) => boolean, markInput: () => void): void {
  window.addEventListener('keydown', (e) => {
    // Don't hijack typing in inputs (Signature mode later has a text field).
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    const s = getState();

    if (e.key === ' ') {
      setState({ audioOn: !s.audioOn });
      e.preventDefault();
      return;
    }
    if (e.key >= '1' && e.key <= '4') {
      const mode = (['tone', 'composition', 'voice', 'signature'] as DriveMode[])[Number(e.key) - 1];
      if (READY_MODES.has(mode)) setState({ mode });
      e.preventDefault();
      return;
    }

    const f = s.frequency;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        setFrequency(f + (e.shiftKey ? 20 : 4));
        markInput();
        e.preventDefault();
        return;
      case 'ArrowLeft':
      case 'ArrowDown':
        setFrequency(f - (e.shiftKey ? 20 : 4));
        markInput();
        e.preventDefault();
        return;
      case 'Home':
        setFrequency(F_MIN);
        markInput();
        e.preventDefault();
        return;
      case 'End':
        setFrequency(F_MAX);
        markInput();
        e.preventDefault();
        return;
    }

    // Note keys only in Tone mode.
    if (s.mode === 'tone' && !e.metaKey && !e.ctrlKey && handleNote(e.key)) {
      e.preventDefault();
    }
  });
}

boot();
