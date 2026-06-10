// Voice input — captures the microphone, runs autocorrelation pitch detection
// each frame, and applies a confidence gate: below confidence it holds the last
// stable frequency; in silence it reports `silent` so the figure freezes.
//
// The mic is tapped through an Analyser into a muted gain → there is no audio
// output, so no feedback. Permission is requested only when start() is called.

import { detectPitch } from './pitch';

export type MicStatus = 'idle' | 'requesting' | 'granted' | 'denied';

export interface VoiceState {
  /** Smoothed plate frequency (held through low-confidence frames). */
  freq: number;
  /** Live clarity ∈ [0,1] for the confidence meter. */
  clarity: number;
  /** Live level ∈ [0,1] for the listening meter. */
  level: number;
  /** True when the input is silent — the figure should freeze. */
  silent: boolean;
}

const CLARITY_GATE = 0.55; // below this we hold the last stable frequency
const SMOOTHING = 0.25; // exponential glide toward the detected pitch
const PLATE_MIN = 50;
const PLATE_MAX = 2000;

export class VoiceInput {
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private sink: GainNode | null = null;

  status: MicStatus = 'idle';
  readonly state: VoiceState = { freq: 220, clarity: 0, level: 0, silent: true };

  /** Request the mic and wire up analysis. Throws/sets 'denied' on refusal. */
  async start(ctx: AudioContext): Promise<void> {
    this.status = 'requesting';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      this.status = 'denied';
      throw new Error('microphone denied');
    }

    const source = ctx.createMediaStreamSource(this.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    this.buf = new Float32Array(analyser.fftSize);

    // Route through a silent gain to keep the graph pulled without output.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(analyser).connect(sink).connect(ctx.destination);

    this.analyser = analyser;
    this.sink = sink;
    this.status = 'granted';
  }

  /** Sample + detect. Call once per frame while Voice mode is active. */
  update(sampleRate: number): void {
    if (!this.analyser || !this.buf) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    const { freq, clarity, rms } = detectPitch(this.buf, sampleRate);

    this.state.clarity = clarity;
    this.state.level = Math.min(1, rms * 6);
    this.state.silent = freq < 0;

    // Confident, in-range pitch → glide the plate frequency toward it.
    if (freq > 0 && clarity >= CLARITY_GATE) {
      const target = Math.max(PLATE_MIN, Math.min(PLATE_MAX, freq));
      this.state.freq += (target - this.state.freq) * SMOOTHING;
    }
    // Otherwise hold the last stable frequency (no change).
  }

  stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    try {
      this.sink?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* already torn down */
    }
    this.analyser = null;
    this.buf = null;
    this.sink = null;
    this.status = 'idle';
  }
}
