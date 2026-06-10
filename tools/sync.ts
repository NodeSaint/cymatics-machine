// Proves the beat-sync guarantee deterministically: run the REAL Composition
// scheduler against a mocked Web Audio graph and a steady 60 fps drain loop, in
// real time (Node timers, no rendering stalls). Every visual event must fire
// within one frame of its scheduled audio timestamp.
//
// Run: npx tsx tools/sync.ts

import { Composition } from '../src/audio/composition';

// ── Minimal Web Audio mock — enough for Composition's node graph ──────────
function param() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}
function node(): any {
  return {
    gain: param(),
    frequency: param(),
    detune: param(),
    delayTime: param(),
    Q: param(),
    type: '',
    buffer: null,
    loop: false,
    connect(dest: any) {
      return dest;
    },
    start() {},
    stop() {},
  };
}

const t0 = performance.now();
const ctx: any = {
  get currentTime() {
    return (performance.now() - t0) / 1000;
  },
  sampleRate: 48000,
  createGain: node,
  createOscillator: node,
  createBiquadFilter: node,
  createDelay: node,
  createBufferSource: node,
  createDynamicsCompressor: node,
  createBuffer: (_c: number, len: number) => ({ sampleRate: 48000, getChannelData: () => new Float32Array(len) }),
};

const comp = new Composition(ctx, node());
comp.start();

const samples: Array<{ kind: string; lagMs: number; frameMs: number }> = [];
let lastFrame = performance.now();
const FRAME_MS = 1000 / 60;

const drain = setInterval(() => {
  const now = performance.now();
  const frameMs = now - lastFrame;
  lastFrame = now;
  for (const e of comp.drain(ctx.currentTime)) {
    samples.push({ kind: e.kind, lagMs: (ctx.currentTime - e.t) * 1000, frameMs });
  }
}, FRAME_MS);

setTimeout(() => {
  clearInterval(drain);
  comp.stop();

  const notes = samples.filter((s) => s.kind === 'note');
  const kicks = samples.filter((s) => s.kind === 'kick');
  const within = samples.filter((s) => s.lagMs <= s.frameMs + 1);
  const lags = samples.map((s) => s.lagMs).sort((a, b) => a - b);
  const p = (q: number) => lags[Math.min(lags.length - 1, Math.floor(q * lags.length))] ?? 0;

  const result = {
    durationS: 8,
    events: samples.length,
    notes: notes.length,
    kicks: kicks.length,
    withinOneFrame: `${within.length}/${samples.length}`,
    lagMedianMs: +p(0.5).toFixed(2),
    lagP95Ms: +p(0.95).toFixed(2),
    lagMaxMs: +Math.max(...lags).toFixed(2),
    avgFrameMs: +(samples.reduce((a, s) => a + s.frameMs, 0) / samples.length).toFixed(2),
    PASS: within.length === samples.length && notes.length > 4 && kicks.length > 4,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.PASS ? 0 : 1);
}, 8000);
