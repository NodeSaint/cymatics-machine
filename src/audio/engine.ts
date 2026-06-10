// Shared Web Audio context + master bus. Created lazily on a user gesture
// (browsers block audio until then). All sound is synthesised — no files.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  get ready(): boolean {
    return this.ctx !== null;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Master bus all voices connect to. */
  get master(): GainNode {
    if (!this.masterGain) throw new Error('AudioEngine not started');
    return this.masterGain;
  }

  /** Current audio clock (seconds), or 0 before start. */
  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Create (first call) and resume the context. Must be called from a gesture. */
  async start(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0; // ramped up by fadeMaster
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  /** Ramp the master gain (click-free). */
  fadeMaster(value: number, seconds = 0.06): void {
    if (!this.ctx || !this.masterGain) return;
    const g = this.masterGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(value, t + seconds);
  }

  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
  }
}

export const engine = new AudioEngine();
