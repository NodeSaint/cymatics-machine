// Lookahead scheduler. A timer wakes periodically and schedules every step
// whose time falls within the lookahead horizon ahead of the audio clock — so
// audio events are queued with sample-accurate Web Audio timestamps while the
// JS timer stays coarse. The visual side reads the same timestamps, which is
// what keeps the figure locked to the beat.

export class Scheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly stepDuration: () => number,
    private readonly onStep: (step: number, time: number) => void,
    private readonly lookahead = 0.12, // seconds scheduled ahead
    private readonly interval = 25, // ms between timer wakes
  ) {}

  get running(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    while (this.nextStepTime < this.ctx.currentTime + this.lookahead) {
      this.onStep(this.step, this.nextStepTime);
      this.nextStepTime += this.stepDuration();
      this.step++;
    }
  }
}
