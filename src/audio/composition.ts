// Composition — a generative ~90 s loop. A lookahead scheduler queues every
// voice with a sample-accurate Web Audio timestamp and, crucially, pushes the
// matching {t, kind} visual events onto a queue the render loop drains when the
// audio clock passes them. Because the same code writes the music and the
// events, the figure lands on the beat to within a frame.
//
// All sound is synthesised (voices.ts). Melody notes retune the plate; kicks
// inject a radial jolt so the figure shatters and re-forms; a sidechain ducks
// the musical bus off every kick.

import { Scheduler } from './scheduler';
import { kick, hat, bass, lead } from './voices';

export interface VisualEvent {
  t: number; // audio time the event should fire
  kind: 'kick' | 'note';
  freq?: number; // plate frequency for 'note'
  strength?: number; // jolt strength for 'kick'
}

const BPM = 110;
const STEPS_PER_BAR = 16; // sixteenth-note grid

// i – VI – III – VII in A minor, four bars each (≈ 70 s loop with variation).
interface Chord {
  bass: number; // Hz
  lead: number[]; // plate frequencies the melody draws from (Hz)
}
const PROGRESSION: Chord[] = [
  { bass: 110.0, lead: [440.0, 523.25, 587.33, 659.25, 392.0] }, // Am
  { bass: 87.31, lead: [349.23, 440.0, 523.25, 587.33, 698.46] }, // F
  { bass: 130.81, lead: [392.0, 523.25, 659.25, 440.0, 783.99] }, // C
  { bass: 98.0, lead: [392.0, 493.88, 587.33, 440.0, 392.0] }, // G
];

function hash(a: number, b: number): number {
  let h = (Math.imul(a, 73856093) ^ Math.imul(b + 1, 19349663)) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

export class Composition {
  private readonly scheduler: Scheduler;
  private readonly bus: GainNode; // sidechained musical bus
  private readonly kickGain: GainNode; // kick bypasses the sidechain
  private readonly delaySend: GainNode; // send into the tempo-synced delay
  private events: VisualEvent[] = [];

  constructor(
    private readonly ctx: AudioContext,
    master: AudioNode,
  ) {
    const stepDur = () => 60 / BPM / 4;

    this.bus = ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(master);

    this.kickGain = ctx.createGain();
    this.kickGain.gain.value = 1;
    this.kickGain.connect(master);

    // Tempo-synced delay on the lead (and anything routed to the bus).
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = stepDur() * 3; // dotted-eighth-ish
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.25;
    delay.connect(feedback).connect(delay);
    delay.connect(this.bus);
    delaySend.connect(delay);
    this.delaySend = delaySend;

    this.scheduler = new Scheduler(ctx, stepDur, (step, time) => this.onStep(step, time));
  }

  start(): void {
    this.events.length = 0;
    this.scheduler.start();
  }

  stop(): void {
    this.scheduler.stop();
    this.events.length = 0;
  }

  /** Pop visual events whose time has passed `now`. Events are queued in order. */
  drain(now: number): VisualEvent[] {
    if (this.events.length === 0) return [];
    const due: VisualEvent[] = [];
    while (this.events.length && this.events[0].t <= now) {
      due.push(this.events.shift()!);
    }
    return due;
  }

  private onStep(step: number, t: number): void {
    const stepDur = 60 / BPM / 4;
    const s = step % STEPS_PER_BAR;
    const bar = Math.floor(step / STEPS_PER_BAR) % 16;
    const chord = PROGRESSION[Math.floor(bar / 4) % PROGRESSION.length];
    const ctx = this.ctx;

    // ── Kick — four on the floor, strong downbeat ───────────────────────
    if (s === 0 || s === 4 || s === 8 || s === 12) {
      kick(ctx, this.kickGain, t);
      const strong = s === 0;
      this.events.push({ t, kind: 'kick', strength: strong ? 0.05 : 0.028 });
      // Sidechain: duck the musical bus, recover over ~a beat.
      const g = this.bus.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.5, t);
      g.linearRampToValueAtTime(1, t + stepDur * 3.4);
    }

    // ── Hats — offbeats ─────────────────────────────────────────────────
    if (s === 2 || s === 6 || s === 10 || s === 14) {
      hat(ctx, this.bus, t, s === 14 && bar % 2 === 1);
    }

    // ── Bass — root on the half notes ───────────────────────────────────
    if (s === 0 || s === 8) {
      bass(ctx, this.bus, t, chord.bass, stepDur * 6);
    }

    // ── Lead — melodic notes retune the plate ───────────────────────────
    // A fill bar (every 4th) adds an extra note for movement.
    const leadSteps = bar % 4 === 3 ? [0, 6, 8, 12] : [0, 8];
    if (leadSteps.includes(s)) {
      const idx = hash(bar, s) % chord.lead.length;
      const freq = chord.lead[idx];
      const dur = stepDur * (s === 0 || s === 8 ? 5 : 3);
      lead(ctx, this.bus, t, freq, dur);
      // send a copy to the delay
      lead(ctx, this.delaySend, t, freq, dur * 0.5);
      this.events.push({ t, kind: 'note', freq });
    }
  }
}
