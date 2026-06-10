// Synth voices for Composition — all built from oscillators and filtered noise,
// each self-contained: schedule it at an audio time and it cleans itself up.

let noiseBuffer: AudioBuffer | null = null;

/** Shared white-noise buffer (created once per context). */
function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 1.0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic noise (no Math.random) so renders are reproducible.
  let s = 1;
  for (let i = 0; i < len; i++) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    data[i] = (s / 0x40000000 - 1) * 0.9;
  }
  noiseBuffer = buf;
  return buf;
}

/** Kick — pitch-dropped sine with a fast amp envelope. */
export function kick(ctx: AudioContext, dest: AudioNode, t: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(46, t + 0.13);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.95, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.33);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + 0.35);
}

/** Hat — highpassed noise burst. */
export function hat(ctx: AudioContext, dest: AudioNode, t: number, open = false): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7800;
  const g = ctx.createGain();
  const decay = open ? 0.18 : 0.045;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(open ? 0.28 : 0.22, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(hp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + decay + 0.02);
}

/** Bass — filtered saw with a plucky envelope. */
export function bass(ctx: AudioContext, dest: AudioNode, t: number, freq: number, dur: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + dur * 0.8);
  lp.Q.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp).connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Lead — two detuned saws, gentle attack. (Tempo-synced delay lives on the bus.) */
export function lead(ctx: AudioContext, dest: AudioNode, t: number, freq: number, dur: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
  g.gain.setValueAtTime(0.32, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;

  for (const detune of [-6, 6]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  lp.connect(g).connect(dest);
}
