# Cymatics Machine — Build Plan

## Step 1 — Field + grains + slider (silent) → tune → deploy  ← CURRENT

- [x] Scaffold Vite + TS, configs, `.gitignore`, `index.html`.
- [x] Project docs (PRIMER, CHANGELOG, ISSUES, CLAUDE, agents).
- [ ] `physics/modes.ts` — precompute `psi_nm` for `n<m≤8`, frequency table.
- [ ] `physics/field.ts` — Lorentzian weights, recombine threshold, `|Ψ|` + gradients, bilinear sample.
- [ ] `grains/grains.ts` — 30k grains, gradient descent, jitter, damping, walls, speed colour.
- [ ] `render/webgl.ts` — point sprites + additive glow; `render/canvas2d.ts` fallback (12k).
- [ ] `store.ts` — central state (frequency, mode, dominant (n,m), reduced-motion).
- [ ] `ui/rail.ts` — frequency slider with resonance ticks (silent), readout shell.
- [ ] `main.ts` — boot, resize, RAF loop wiring all of the above.
- [ ] Tune: convergence ~2 s, ≥10 distinct figures across a sweep, 60 fps @ 30k.
- [ ] Deploy workflow → confirm live URL.

## Step 2 — Tone mode
- [ ] Web Audio sine + soft 2nd harmonic; keyboard one octave; resonance gravitation; readout; explainer.

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
