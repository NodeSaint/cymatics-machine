// Sonic Signature panel — a word field (≤12 chars), a Perform button that runs
// the morph, and an Export button that saves the reproducible PNG.

import { MAX_CHARS, sanitiseWord, cleanInput } from '../signature';

export interface SignaturePanelHandle {
  readonly el: HTMLElement;
  /** Current sanitised word. */
  word(): string;
  /** Called when the morph finishes, to enable Export. */
  markPerformed(): void;
}

export function buildSignaturePanel(
  onPerform: (word: string) => void,
  onExport: (word: string) => void,
): SignaturePanelHandle {
  const el = document.createElement('div');
  el.className = 'sig';

  const intro = document.createElement('p');
  intro.className = 'sig__intro';
  intro.textContent = 'Type a word — each letter tunes the plate. Perform it, then export the figure.';

  const row = document.createElement('div');
  row.className = 'sig__row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sig__input';
  input.maxLength = MAX_CHARS;
  input.placeholder = 'your word';
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', `Signature word, up to ${MAX_CHARS} characters`);

  const performBtn = document.createElement('button');
  performBtn.type = 'button';
  performBtn.className = 'sig__perform';
  performBtn.textContent = 'Perform';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'sig__export';
  exportBtn.textContent = 'Export PNG';
  exportBtn.disabled = true;

  row.append(input, performBtn, exportBtn);
  el.append(intro, row);

  const word = () => sanitiseWord(input.value);

  const perform = () => {
    const w = word();
    if (!w) {
      input.focus();
      return;
    }
    onPerform(w);
    exportBtn.disabled = false; // figure is reproducible regardless of the live morph
  };

  performBtn.addEventListener('click', perform);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') perform();
    e.stopPropagation(); // don't let global keys (digits/space) hijack typing
  });
  input.addEventListener('input', () => {
    // Strip disallowed characters live, but keep trailing spaces so multi-word
    // names remain typable.
    const s = cleanInput(input.value);
    if (s !== input.value) input.value = s;
  });
  exportBtn.addEventListener('click', () => onExport(word()));

  return {
    el,
    word,
    markPerformed: () => {
      exportBtn.disabled = false;
    },
  };
}
