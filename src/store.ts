// Single central store. Tiny synchronous pub/sub — no framework.

import { F_MIN, F_MAX } from './physics/modes';

export type DriveMode = 'tone' | 'composition' | 'voice' | 'signature';

export interface State {
  /** Driving frequency in Hz. */
  frequency: number;
  /** Active drive mode. */
  mode: DriveMode;
  /** Dominant mode indices for the readout, or null before first build. */
  dominant: { n: number; m: number } | null;
  /** Whether sound is enabled (requires a user gesture to start the AudioContext). */
  audioOn: boolean;
  /** Microphone permission state for Voice mode. */
  micStatus: 'idle' | 'requesting' | 'granted' | 'denied';
  /** Plate geometry — square free plate or circular Bessel plate. */
  geometry: 'square' | 'circle';
  /** prefers-reduced-motion — lowers jitter, disables glow pulse. */
  reducedMotion: boolean;
  /** Renderer in use, for the diagnostics line. */
  renderer: 'webgl' | 'canvas2d';
  /** Smoothed frames per second. */
  fps: number;
}

type Listener = (state: Readonly<State>) => void;

const state: State = {
  frequency: 432,
  mode: 'tone',
  dominant: null,
  audioOn: false,
  micStatus: 'idle',
  geometry: 'square',
  reducedMotion:
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  renderer: 'webgl',
  fps: 0,
};

const listeners = new Set<Listener>();

export function getState(): Readonly<State> {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn(state);
}

/** Patch state and notify. Pass only the keys that changed. */
export function setState(patch: Partial<State>): void {
  let changed = false;
  for (const key of Object.keys(patch) as Array<keyof State>) {
    if (state[key] !== patch[key]) {
      (state as Record<keyof State, State[keyof State]>)[key] = patch[key]!;
      changed = true;
    }
  }
  if (changed) emit();
}

/** Clamp + set the driving frequency. */
export function setFrequency(f: number): void {
  const clamped = f < F_MIN ? F_MIN : f > F_MAX ? F_MAX : f;
  setState({ frequency: clamped });
}
