// Autocorrelation pitch detection with a confidence (clarity) measure.
// Operates on a time-domain buffer; the lag search is bounded to the human
// vocal range, which both caps the cost and avoids gross octave errors.

export interface PitchResult {
  /** Detected frequency in Hz, or -1 when unvoiced/silent. */
  freq: number;
  /** Clarity ∈ [0,1] — autocorrelation peak relative to zero-lag energy. */
  clarity: number;
  /** RMS level ∈ [0,1]-ish, for the silence gate and the meter. */
  rms: number;
}

const MIN_F = 70; // Hz — bottom of the tracked range
const MAX_F = 1100; // Hz — top of the tracked range
const SILENCE_RMS = 0.01;

export function detectPitch(buf: Float32Array, sampleRate: number): PitchResult {
  const size = buf.length;

  // RMS for the silence gate / level meter.
  let sumSq = 0;
  for (let i = 0; i < size; i++) sumSq += buf[i] * buf[i];
  const rms = Math.sqrt(sumSq / size);
  if (rms < SILENCE_RMS) return { freq: -1, clarity: 0, rms };

  const minLag = Math.max(2, Math.floor(sampleRate / MAX_F));
  const maxLag = Math.min(size - 2, Math.floor(sampleRate / MIN_F));

  // Zero-lag energy (autocorrelation at lag 0).
  let energy = 0;
  for (let j = 0; j < size; j++) energy += buf[j] * buf[j];
  if (energy === 0) return { freq: -1, clarity: 0, rms };

  let bestLag = -1;
  let bestCorr = 0;
  let prev = 0;
  let descending = false; // wait until past the initial peak before accepting

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let j = 0; j < size - lag; j++) corr += buf[j] * buf[j + lag];

    // Only consider local maxima after the autocorrelation first descends —
    // avoids latching onto the broad zero-lag shoulder.
    if (!descending && corr < prev) descending = true;
    if (descending && corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
    prev = corr;
  }

  if (bestLag < 0) return { freq: -1, clarity: 0, rms };

  // Parabolic interpolation around the peak for sub-sample precision.
  const c1 = acf(buf, size, bestLag - 1);
  const c2 = bestCorr;
  const c3 = acf(buf, size, bestLag + 1);
  const a = (c1 + c3 - 2 * c2) / 2;
  const b = (c3 - c1) / 2;
  const refined = a !== 0 ? bestLag - b / (2 * a) : bestLag;

  const clarity = Math.max(0, Math.min(1, bestCorr / energy));
  const freq = sampleRate / refined;
  return { freq, clarity, rms };
}

function acf(buf: Float32Array, size: number, lag: number): number {
  if (lag < 0 || lag >= size) return 0;
  let corr = 0;
  for (let j = 0; j < size - lag; j++) corr += buf[j] * buf[j + lag];
  return corr;
}
