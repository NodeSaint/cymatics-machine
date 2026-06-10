# Cymatics Machine — Build Plan

## Step 1 — Field + grains + slider (silent) → tune → deploy  ← CURRENT

- [x] Scaffold Vite + TS, configs, `.gitignore`, `index.html`.
- [x] Project docs (PRIMER, CHANGELOG, ISSUES, CLAUDE, agents).
- [x] `physics/modes.ts` — precompute `psi_nm` for `n<m≤8`, frequency table.
- [x] `physics/field.ts` — Lorentzian weights, recombine threshold, `|Ψ|` + gradients, bilinear sample.
- [x] `grains/grains.ts` — 30k grains, gradient descent, jitter, damping, walls, speed colour.
- [x] `render/webgl.ts` — point sprites + soft halo; `render/canvas2d.ts` fallback (12k).
- [x] `store.ts` — central state (frequency, mode, dominant (n,m), reduced-motion).
- [x] `ui/rail.ts` — frequency slider with resonance ticks (silent), readout shell.
- [x] `main.ts` — boot, resize, RAF loop wiring all of the above.
- [x] Tune: convergence ~2 s, 27 distinct figures across a sweep (headless harness).
- [x] Deploy workflow → live at https://nodesaint.github.io/cymatics-machine/

**Step 1 review:** Headless harness (`tools/convergence.ts`) quantified tuning instead of guessing
blind — 27 figures, ~2 s settle, 0.44 ms recombine. WebGL + Canvas2D both build clean. Deployed and
visually confirmed in production. Owner is `NodeSaint` (spec's `nuvixstudio` doesn't exist; user chose).

## Step 2 — Tone mode  ✅
- [x] Web Audio sine + soft 2nd harmonic; keyboard one octave; resonance gravitation; readout; explainer.
- [x] Verified via CDP (`tools/drive.mjs`): AudioContext running, exact note pitch, explainer opens.

## Step 3 — Composition
- [ ] Lookahead scheduler; synth voices; melody retune; kick jolts; sidechain.

## Step 4 — Voice
- [ ] getUserMedia; autocorrelation + confidence gate; meter; graceful denial; silence freeze.

## Step 5 — Sonic Signature + PNG export
- [ ] Letter→freq table; ~8 s morph; hold; pixel-stable 1080² PNG export.

## Step 6 — Circle plate (stretch)
- [ ] Bessel modes second instrument.

## Review
_(filled at end of each step)_
