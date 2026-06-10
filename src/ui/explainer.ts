// The "?" explainer — a genuine account of the physics. Honest physics is part
// of the brand, including what we approximate. British English throughout.

export function createExplainer(): { open: () => void; button: HTMLButtonElement } {
  const dialog = document.createElement('dialog');
  dialog.className = 'explain';
  dialog.innerHTML = `
    <article class="explain__body">
      <header class="explain__head">
        <h2>What you're looking at</h2>
        <button class="explain__close" aria-label="Close" value="close">✕</button>
      </header>

      <p>This is a <strong>Chladni plate</strong>. Drive a stiff plate at the right frequency and it
      flexes in a standing-wave pattern. Some lines on the surface barely move at all — the
      <strong>nodal lines</strong>. Scatter fine sand across it and the grains are shaken off the
      parts that are vibrating and come to rest along those still lines. The pattern you see
      <em>is</em> the set of places that are holding still.</p>

      <h3>Why the sand gathers</h3>
      <p>Everywhere the plate is moving, grains get a kick and hop. A nodal line is the one place a
      grain can sit without being thrown off, so over a couple of seconds the grains random-walk
      their way downhill until almost all of them are parked on the nodes. Here each grain follows
      the gradient of <code>|Ψ|</code> (the local vibration amplitude) toward zero, with a jitter
      proportional to how hard that spot is shaking — the same bargain real sand strikes.</p>

      <h3>What (n,m) means</h3>
      <p>A square plate has a family of natural shapes — <em>modes</em> — indexed by two whole
      numbers <code>(n,m)</code>, roughly the number of half-waves across each axis. Higher numbers
      mean finer, busier figures. The readout names the mode the current frequency excites most
      strongly. Drive between two modes and you see a blend of both.</p>

      <h3>What we approximate (honestly)</h3>
      <p>This is a <strong>modal approximation</strong>, not a full plate-mechanics solve. We use the
      idealised square free-plate mode shapes</p>
      <p class="explain__eq"><code>ψₙₘ(x,y) = cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy)</code></p>
      <p>mix the modes a driving tone excites with Lorentzian weights, and let the grains descend the
      resulting landscape. Real plates have free-edge boundary conditions that shift the exact
      resonant frequencies; here frequencies are <em>mapped</em> into 50–2000 Hz rather than measured.
      The figures are faithful in character; the precise Hz of each is stylised.</p>

      <h3>Playing it</h3>
      <p>Slide the frequency, or play the one-octave keyboard. The slider gravitates gently toward
      resonances (the brass ticks), where the figures are cleanest. Arrow keys nudge the frequency;
      <kbd>Space</kbd> toggles sound. Turn sound on with the ♪ button.</p>
    </article>
  `;

  const close = () => dialog.close();
  dialog.querySelector('.explain__close')!.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    // Click on the backdrop (outside the article) closes.
    if (e.target === dialog) close();
  });

  document.body.append(dialog);

  const button = document.createElement('button');
  button.className = 'rail__icon';
  button.type = 'button';
  button.textContent = '?';
  button.title = 'What is this? (the physics)';
  button.setAttribute('aria-label', 'Explain the physics');
  button.addEventListener('click', () => dialog.showModal());

  return { open: () => dialog.showModal(), button };
}
