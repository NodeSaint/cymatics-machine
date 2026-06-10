// Sonic Signature — a deterministic, hand-tuned map from a word to a sequence of
// plate frequencies. Pure: the same word yields the same sequence everywhere,
// which is what makes the exported PNG reproducible.
//
// Letters land on an A-minor pentatonic scale so any name reads as consonant.
// Collisions (repeated letters, anagrams) are broken by a small position
// weighting that nudges the scale index ±1 by position — still on the scale, so
// it stays musical while making distinct words distinct.

// A-minor pentatonic across ~2.25 octaves (Hz). Tasteful, distinct figures.
export const SCALE = [
  220.0, // A3
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.0, // G4
  440.0, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
];

export const MAX_CHARS = 12;

/** Scale index for a character, or null to skip (spaces, punctuation). */
function pitchIndex(ch: string): number | null {
  const code = ch.toLowerCase().charCodeAt(0);
  // Adjacent letters/digits land on adjacent scale steps (mod the scale), so
  // permutations like ABBA vs BABA give different sequences. Distinct letters
  // → distinct pitches; the scale keeps it consonant.
  if (code >= 97 && code <= 122) return (code - 97) % SCALE.length;
  if (code >= 48 && code <= 57) return (code - 48) % SCALE.length;
  return null;
}

/** Strip disallowed chars, upper-case, cap length — keeps a trailing space so
 *  multi-word names can be typed. Used for the live input field. */
export function cleanInput(word: string): string {
  return word
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/, '')
    .toUpperCase()
    .slice(0, MAX_CHARS);
}

/** Final, trimmed word for performing / exporting / stamping. */
export function sanitiseWord(word: string): string {
  return cleanInput(word).trim();
}

/** Deterministic frequency sequence for a word (≤ MAX_CHARS meaningful chars). */
export function signatureFrequencies(word: string): number[] {
  const out: number[] = [];
  let pos = 0;
  for (const ch of word) {
    const base = pitchIndex(ch);
    if (base === null) continue;
    // Position weighting: ±1 scale step on a 3-cycle, clamped to the scale.
    const shifted = base + ((pos % 3) - 1);
    const idx = shifted < 0 ? 0 : shifted >= SCALE.length ? SCALE.length - 1 : shifted;
    out.push(SCALE[idx]);
    if (++pos >= MAX_CHARS) break;
  }
  return out;
}
