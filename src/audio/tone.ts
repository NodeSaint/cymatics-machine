// Tone voice — a pure sine fundamental plus a soft 2nd harmonic, through a
// gentle lowpass so it reads as a warm sine rather than a buzz. Frequency
// changes are ramped to avoid zipper noise.

export class ToneVoice {
  private readonly ctx: AudioContext;
  private readonly fundamental: OscillatorNode;
  private readonly harmonic: OscillatorNode;
  private readonly harmonicGain: GainNode;
  private readonly out: GainNode;
  private started = false;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.fundamental = ctx.createOscillator();
    this.fundamental.type = 'sine';

    this.harmonic = ctx.createOscillator();
    this.harmonic.type = 'sine';

    this.harmonicGain = ctx.createGain();
    this.harmonicGain.gain.value = 0.16; // soft 2nd harmonic

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 5200;
    lowpass.Q.value = 0.5;

    this.out = ctx.createGain();
    this.out.gain.value = 0.22; // headroom; master bus does the fades

    this.fundamental.connect(this.out);
    this.harmonic.connect(this.harmonicGain).connect(this.out);
    this.out.connect(lowpass).connect(destination);
  }

  start(frequency: number): void {
    if (this.started) return;
    this.setFrequency(frequency, 0);
    this.fundamental.start();
    this.harmonic.start();
    this.started = true;
  }

  /** Glide both oscillators to a new plate frequency. */
  setFrequency(frequency: number, ramp = 0.05): void {
    const t = this.ctx.currentTime;
    const set = (param: AudioParam, value: number) => {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      if (ramp > 0) param.exponentialRampToValueAtTime(Math.max(1, value), t + ramp);
      else param.setValueAtTime(value, t);
    };
    set(this.fundamental.frequency, frequency);
    set(this.harmonic.frequency, frequency * 2);
  }

  stop(): void {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.fundamental.stop(t + 0.08);
    this.harmonic.stop(t + 0.08);
    this.started = false;
  }
}
