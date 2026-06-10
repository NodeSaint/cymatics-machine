// Voice-mode panel — a "listening" confidence meter, a level meter, and a
// graceful permission/denial state. Shown only while Voice mode is active.

import type { VoiceState } from '../audio/voice';
import type { State } from '../store';

export interface VoicePanelHandle {
  readonly el: HTMLElement;
  /** Live meter update each frame. */
  setVoice(v: VoiceState): void;
  /** React to mic permission state. */
  setStatus(status: State['micStatus']): void;
}

export function buildVoicePanel(onEnable: () => void): VoicePanelHandle {
  const el = document.createElement('div');
  el.className = 'voice';

  const status = document.createElement('p');
  status.className = 'voice__status';

  const meters = document.createElement('div');
  meters.className = 'voice__meters';
  const clarityWrap = meter('confidence');
  const levelWrap = meter('level');
  meters.append(clarityWrap.wrap, levelWrap.wrap);

  const enableBtn = document.createElement('button');
  enableBtn.type = 'button';
  enableBtn.className = 'voice__enable';
  enableBtn.textContent = 'Allow microphone';
  enableBtn.addEventListener('click', onEnable);

  el.append(status, meters, enableBtn);

  function setStatus(s: State['micStatus']): void {
    el.dataset.status = s;
    switch (s) {
      case 'idle':
        status.textContent = 'Voice mode listens to your microphone. Nothing is recorded or sent.';
        enableBtn.style.display = '';
        enableBtn.textContent = 'Allow microphone';
        meters.style.display = 'none';
        break;
      case 'requesting':
        status.textContent = 'Requesting microphone…';
        enableBtn.style.display = 'none';
        meters.style.display = 'none';
        break;
      case 'granted':
        status.textContent = 'Listening — hum or sing to move the sand.';
        enableBtn.style.display = 'none';
        meters.style.display = '';
        break;
      case 'denied':
        status.textContent =
          'Microphone blocked. Allow it in your browser’s site settings, then try again.';
        enableBtn.style.display = '';
        enableBtn.textContent = 'Try again';
        meters.style.display = 'none';
        break;
    }
  }

  function setVoice(v: VoiceState): void {
    clarityWrap.set(v.clarity);
    levelWrap.set(v.level);
    el.classList.toggle('is-silent', v.silent);
  }

  setStatus('idle');
  return { el, setVoice, setStatus };
}

function meter(label: string): { wrap: HTMLElement; set: (v: number) => void } {
  const wrap = document.createElement('div');
  wrap.className = 'voice__meter';
  const name = document.createElement('span');
  name.className = 'voice__meter-label';
  name.textContent = label;
  const bar = document.createElement('div');
  bar.className = 'voice__bar';
  const fill = document.createElement('div');
  fill.className = 'voice__fill';
  bar.append(fill);
  wrap.append(name, bar);
  return {
    wrap,
    set: (v: number) => {
      fill.style.width = `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
    },
  };
}
