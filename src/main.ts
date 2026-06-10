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
import { Composition } from './audio/composition';
import { VoiceInput } from './audio/voice';
import { signatureFrequencies } from './signature';
import { exportSignaturePNG, renderSignature } from './export';

const READY_MODES = new Set<DriveMode>(['tone', 'composition', 'voice', 'signature']);
const SIGNATURE_DURATION = 8; // seconds for the performed morph
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

  // ── Audio (Tone + Composition) ────────────────────────────────────────
  let toneVoice: ToneVoice | null = null;
  let composition: Composition | null = null;
  let voiceInput: VoiceInput | null = null;
  let kickBoost = 0; // brief jitter lift after a kick, decays each frame

  async function startVoice(): Promise<void> {
    if (!voiceInput) voiceInput = new VoiceInput();
    setState({ micStatus: 'requesting' });
    try {
      const ctx = await engine.start();
      await voiceInput.start(ctx);
      setState({ micStatus: 'granted' });
    } catch {
      setState({ micStatus: 'denied' });
    }
  }

  function stopVoice(): void {
    voiceInput?.stop();
    voiceInput = null;
    setState({ micStatus: 'idle' });
  }

  // ── Sonic Signature morph ─────────────────────────────────────────────
  let sigMorph: { freqs: number[]; start: number; done: boolean } | null = null;

  function performSignature(word: string): void {
    const freqs = signatureFrequencies(word);
    if (!freqs.length) return;
    sigMorph = { freqs, start: performance.now(), done: false };
    setState({ mode: 'signature' });
    setFrequency(freqs[0]);
  }

  async function syncAudio(): Promise<void> {
    const s = getState();
    // Tone voice also performs the Signature morph audibly.
    const wantTone = s.audioOn && (s.mode === 'tone' || s.mode === 'signature');
    const wantComp = s.audioOn && s.mode === 'composition';

    if ((wantTone || wantComp) && !engine.ready) await engine.start();

    if (wantTone && !toneVoice && engine.context) {
      toneVoice = new ToneVoice(engine.context, engine.master);
      toneVoice.start(s.frequency);
    } else if (!wantTone && toneVoice) {
      const v = toneVoice;
      toneVoice = null;
      setTimeout(() => v.stop(), 170);
    }

    if (wantComp && !composition && engine.context) {
      composition = new Composition(engine.context, engine.master);
      composition.start();
    } else if (!wantComp && composition) {
      composition.stop();
      composition = null;
    }

    engine.fadeMaster(wantTone || wantComp ? 0.85 : 0);
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
    onEnableMic: () => void startVoice(),
    onPerformSignature: performSignature,
    onExportSignature: (word) => exportSignaturePNG(word, modes),
  });

  // React to audio-relevant state transitions.
  let prevAudioOn = getState().audioOn;
  let prevMode = getState().mode;
  subscribe((s) => {
    const modeChanged = s.mode !== prevMode;
    if (s.audioOn !== prevAudioOn || modeChanged) {
      if (modeChanged) {
        if (prevMode === 'voice') stopVoice();
        if (s.mode === 'voice') void startVoice(); // request mic only on opening Voice
      }
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

    // Composition drives the plate: drain beat-synced events when the audio
    // clock passes their scheduled time (within a frame).
    if (composition) {
      const aNow = engine.now;
      for (const e of composition.drain(aNow)) {
        if (import.meta.env.DEV) recordLag(e.kind, aNow - e.t, dtMs);
        if (e.kind === 'note' && e.freq) {
          setFrequency(e.freq);
        } else if (e.kind === 'kick') {
          grains.jolt(e.strength ?? 0.03); // radial shatter
          kickBoost = Math.max(kickBoost, (e.strength ?? 0.03) * 9);
        }
      }
    }
    kickBoost *= Math.pow(0.9, dtScale);

    // Signature mode: glide through the word's frequencies over ~8 s, then hold.
    if (s.mode === 'signature' && sigMorph && !sigMorph.done) {
      const seq = sigMorph.freqs;
      const t = (now - sigMorph.start) / 1000;
      if (t >= SIGNATURE_DURATION) {
        setFrequency(seq[seq.length - 1]);
        sigMorph.done = true;
        rail.signature.markPerformed();
      } else {
        const p = (t / SIGNATURE_DURATION) * seq.length;
        const i = Math.min(seq.length - 1, Math.floor(p));
        const frac = p - i;
        const a = seq[i];
        const b = seq[Math.min(i + 1, seq.length - 1)];
        const e = frac * frac * (3 - 2 * frac); // smoothstep glide
        setFrequency(a + (b - a) * e);
      }
    }

    // Voice mode: detect pitch and drive the plate; silence freezes the figure.
    let voiceSilent = false;
    if (s.mode === 'voice' && voiceInput && voiceInput.status === 'granted' && engine.context) {
      voiceInput.update(engine.context.sampleRate);
      const vs = voiceInput.state;
      if (!vs.silent) setFrequency(vs.freq);
      voiceSilent = vs.silent;
      rail.voice.setVoice(vs);
    }

    field.setFrequency(getState().frequency);
    if (field.dominant) {
      const d = getState().dominant;
      if (!d || d.n !== field.dominant.n || d.m !== field.dominant.m) {
        setState({ dominant: { n: field.dominant.n, m: field.dominant.m } });
      }
    }
    if (toneVoice) toneVoice.setFrequency(getState().frequency);

    const baseMotion = voiceSilent ? 0 : s.reducedMotion ? 0.45 : 1;
    const motion = baseMotion + (s.reducedMotion ? 0 : kickBoost);
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
      get compLags() {
        return lagLog.slice();
      },
      get voice() {
        return voiceInput ? { ...voiceInput.state, status: voiceInput.status } : null;
      },
      signaturePNG(word: string) {
        return renderSignature(word, modes).toDataURL('image/png');
      },
    };
  }
}

// Beat-sync diagnostics: lag (ms) between an event's scheduled audio time and
// the frame it fired on, plus that frame's duration. Lag should be ≤ one frame.
interface LagSample {
  kind: string;
  lagMs: number;
  frameMs: number;
}
const lagLog: LagSample[] = [];
function recordLag(kind: string, lagSec: number, frameMs: number): void {
  lagLog.push({ kind, lagMs: lagSec * 1000, frameMs });
  if (lagLog.length > 400) lagLog.shift();
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

/** Register the service worker (production only) for offline capability. */
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is a progressive enhancement */
    });
  });
}

boot();
registerServiceWorker();
