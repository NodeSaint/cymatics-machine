// One-octave keyboard (C4–C5). Click a key, or use the home-row computer keys,
// to set the plate frequency to that note. Used in Tone mode.

interface Key {
  note: string;
  freq: number;
  black: boolean;
  char: string; // computer key
}

// Equal-temperament, A4 = 440 Hz.
const KEYS: Key[] = [
  { note: 'C4', freq: 261.63, black: false, char: 'a' },
  { note: 'C#4', freq: 277.18, black: true, char: 'w' },
  { note: 'D4', freq: 293.66, black: false, char: 's' },
  { note: 'D#4', freq: 311.13, black: true, char: 'e' },
  { note: 'E4', freq: 329.63, black: false, char: 'd' },
  { note: 'F4', freq: 349.23, black: false, char: 'f' },
  { note: 'F#4', freq: 369.99, black: true, char: 't' },
  { note: 'G4', freq: 392.0, black: false, char: 'g' },
  { note: 'G#4', freq: 415.3, black: true, char: 'y' },
  { note: 'A4', freq: 440.0, black: false, char: 'h' },
  { note: 'A#4', freq: 466.16, black: true, char: 'u' },
  { note: 'B4', freq: 493.88, black: false, char: 'j' },
  { note: 'C5', freq: 523.25, black: false, char: 'k' },
];

export interface KeyboardHandle {
  readonly el: HTMLElement;
  /** Feed a computer keypress; returns true if it mapped to a note. */
  handleChar(char: string): boolean;
  /** Briefly light the key nearest a frequency (e.g. when the slider lands on a note). */
  highlightFrequency(freq: number): void;
}

export function buildKeyboard(onNote: (freq: number, note: string) => void): KeyboardHandle {
  const el = document.createElement('div');
  el.className = 'kbd';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'One-octave keyboard');

  const whites = KEYS.filter((k) => !k.black);
  const whiteW = 100 / whites.length;
  const byChar = new Map<string, { key: Key; btn: HTMLButtonElement }>();

  let whiteIndex = 0;
  const whitePosOf = new Map<string, number>(); // note → white index
  for (const k of KEYS) {
    if (!k.black) {
      whitePosOf.set(k.note, whiteIndex);
      whiteIndex++;
    }
  }

  // White keys first (flow), black keys positioned over the gaps.
  let prevWhite = -1;
  for (const k of KEYS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = k.black ? 'kbd__key kbd__key--black' : 'kbd__key kbd__key--white';
    btn.dataset.note = k.note;
    btn.title = `${k.note} · ${Math.round(k.freq)} Hz · key “${k.char}”`;
    btn.setAttribute('aria-label', `${k.note}, ${Math.round(k.freq)} hertz`);

    if (k.black) {
      // Sits on the boundary after the previous white key.
      btn.style.left = `calc(${(prevWhite + 1) * whiteW}% - 0.85em)`;
    } else {
      btn.style.width = `${whiteW}%`;
      btn.style.left = `${whitePosOf.get(k.note)! * whiteW}%`;
      prevWhite = whitePosOf.get(k.note)!;
    }

    const fire = () => {
      onNote(k.freq, k.note);
      flash(btn);
    };
    btn.addEventListener('click', fire);
    el.append(btn);
    byChar.set(k.char, { key: k, btn });
  }

  function flash(btn: HTMLElement): void {
    btn.classList.add('is-active');
    setTimeout(() => btn.classList.remove('is-active'), 160);
  }

  return {
    el,
    handleChar(char: string): boolean {
      const hit = byChar.get(char.toLowerCase());
      if (!hit) return false;
      onNote(hit.key.freq, hit.key.note);
      flash(hit.btn);
      return true;
    },
    highlightFrequency(freq: number): void {
      // Light a key only when the frequency is essentially on the note.
      let best: { key: Key; btn: HTMLButtonElement } | null = null;
      let bestD = Infinity;
      for (const v of byChar.values()) {
        const d = Math.abs(v.key.freq - freq);
        if (d < bestD) {
          bestD = d;
          best = v;
        }
      }
      if (best && bestD < 3) flash(best.btn);
    },
  };
}
