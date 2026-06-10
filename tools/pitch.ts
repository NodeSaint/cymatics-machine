// Unit tests for the Voice DSP: detectPitch accuracy/clarity on synthesized
// sines, silence handling, and the VoiceInput confidence gate + smoothing
// (driven through a mock analyser). Headless browsers can't feed a fake mic
// into a MediaStreamSource, but the analyser path itself is proven separately —
// so this covers the actual logic deterministically.
//
// Run: npx tsx tools/pitch.ts

import { detectPitch } from '../src/audio/pitch';
import { VoiceInput } from '../src/audio/voice';

const SR = 48000;
const SIZE = 2048;

function sine(freq: number, amp = 0.6): Float32Array {
  const b = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) b[i] = Math.sin((2 * Math.PI * freq * i) / SR) * amp;
  return b;
}
const cents = (f: number, ref: number) => 1200 * Math.log2(f / ref);

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '  ok' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

console.log('detectPitch — accuracy across the vocal range:');
for (const f of [110, 146.83, 220, 329.63, 440, 587.33, 880]) {
  const r = detectPitch(sine(f), SR);
  const err = r.freq > 0 ? cents(r.freq, f) : 9999;
  // clarity > 0.7 here is well above the production CLARITY_GATE (0.55); the
  // lowest notes read slightly lower simply because fewer periods fit the buffer.
  ok(Math.abs(err) < 12 && r.clarity > 0.7, `${f} Hz → ${r.freq.toFixed(1)} Hz (${err.toFixed(1)} cents, clarity ${r.clarity.toFixed(2)})`);
}

console.log('detectPitch — silence gate:');
{
  const r = detectPitch(new Float32Array(SIZE), SR);
  ok(r.freq === -1 && r.clarity === 0, `silence → freq ${r.freq}, clarity ${r.clarity}`);
  const quiet = sine(300, 0.002); // below RMS gate
  const rq = detectPitch(quiet, SR);
  ok(rq.freq === -1, `near-silence (amp 0.002) → freq ${rq.freq}`);
}

console.log('VoiceInput — gate + smoothing through a mock analyser:');
{
  const vi = new VoiceInput();
  let buf = sine(196); // G3
  const mockAnalyser = {
    fftSize: SIZE,
    getFloatTimeDomainData: (out: Float32Array) => out.set(buf),
  };
  // Inject the analysis graph the mic would normally provide.
  (vi as unknown as { analyser: unknown; buf: Float32Array; status: string }).analyser = mockAnalyser;
  (vi as unknown as { buf: Float32Array }).buf = new Float32Array(SIZE);
  (vi as unknown as { status: string }).status = 'granted';

  for (let i = 0; i < 40; i++) vi.update(SR);
  ok(Math.abs(vi.state.freq - 196) < 4 && !vi.state.silent, `voiced 196 Hz → state.freq ${vi.state.freq.toFixed(1)}, silent ${vi.state.silent}`);

  // Now go silent: frequency must HOLD (not jump), silent flag must set.
  const held = vi.state.freq;
  buf = new Float32Array(SIZE);
  for (let i = 0; i < 10; i++) vi.update(SR);
  ok(vi.state.silent && Math.abs(vi.state.freq - held) < 0.001, `silence → holds ${vi.state.freq.toFixed(1)} Hz (was ${held.toFixed(1)}), silent ${vi.state.silent}`);

  // Resume a new pitch: it should glide there.
  buf = sine(440);
  for (let i = 0; i < 40; i++) vi.update(SR);
  ok(Math.abs(vi.state.freq - 440) < 5, `resume 440 Hz → state.freq ${vi.state.freq.toFixed(1)}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
