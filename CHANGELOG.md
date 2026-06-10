# Changelog

All notable changes to the Cymatics Machine. Dates are ISO (YYYY-MM-DD). British English throughout.

## [Unreleased] — dev

### 2026-06-10 — `dev` → `main` — Step 3: Composition mode

- **Lookahead scheduler** (`audio/scheduler.ts`): a coarse timer queues each step with a
  sample-accurate Web Audio timestamp; the same timestamps drive the visual event queue.
- **Synth voices** (`audio/voices.ts`): kick (pitch-dropped sine), hat (highpassed noise), bass
  (filtered saw), lead (detuned saws). Deterministic noise buffer (no `Math.random`).
- **Composition** (`audio/composition.ts`): generative ~90 s loop over an i–VI–III–VII progression
  in A minor with per-bar melodic variation. Melody notes retune the plate; kicks push a radial
  jolt that shatters and re-forms the figure; a sidechain ducks the musical bus off every kick.
  Tempo-synced delay on the lead. Master limiter added so layered voices never clip.
- Render loop drains beat-synced events when the audio clock passes them (`grains.jolt` + retune).
- Verified: deterministic 60 fps simulation (`tools/sync.ts`) shows **24/24 events within one frame**
  (median lag 8.4 ms, max 14.8 ms < 16.8 ms). Browser test confirms AudioContext running, melody
  retuning the plate across distinct figures, kicks firing (`tools/composition.mjs`).

### 2026-06-10 — `dev` → `main` — Step 2: Tone mode

- **Web Audio engine** (`audio/engine.ts`): lazy `AudioContext` on first gesture, master bus with
  click-free gain ramps. All sound synthesised — no files.
- **Tone voice** (`audio/tone.ts`): sine fundamental + soft 2nd harmonic through a gentle lowpass,
  exponential frequency glides (no zipper noise).
- **One-octave keyboard** (C4–C5): clickable + home-row computer keys; plays the exact note pitch.
- **Resonance gravitation**: the slider eases toward the nearest resonance tick once the user pauses;
  suppressed for played notes so the keyboard stays in tune.
- **Mode selector** (Tone live; others marked forthcoming), **sound toggle**, **"?" explainer** with
  an honest account of the physics (nodal lines, why sand gathers, (n,m), what is approximated).
- Keyboard control: arrows nudge f, digits jump to ready modes, Space toggles sound.
- Verified interactively via CDP: AudioContext reaches `running`, note plays at exact pitch
  (429→440 Hz, no gravitation drift), explainer opens with the mode equation. `tools/drive.mjs`.

### 2026-06-10 — `dev` — Project scaffold + Step 1 foundation

- Scaffolded Vite 8 + TypeScript 6 vanilla project (no framework).
- Added project docs: `PRIMER.md`, `CHANGELOG.md`, `ISSUES.md`, `tasks/todo.md`, `tasks/lessons.md`,
  project `CLAUDE.md`, and `.claude/agents/` specialists (`physics-dev`, `audio-dev`, `ui-dev`, `deploy`).
- Implemented modal physics core: precomputed `psi_nm` modes, Lorentzian frequency mixing, `|Ψ|`
  gradient field, and a 30k-grain system that descends toward nodal lines (Canvas 2D fallback).
- Frequency slider with resonance ticks (silent).
- GitHub Pages deploy workflow (`base: '/cymatics-machine/'`).
- Verified headlessly: ~2 s convergence, **27 distinct figures** across the sweep (≥10 required),
  recombine **0.44 ms** (< 2 ms budget). Visual checks at 140/432/587/900/1600 Hz confirm distinct,
  Chladni-like figures with sand on nodal lines.
- **Deployed.** Repo `NodeSaint/cymatics-machine` (the spec's `nuvixstudio` owner does not exist on
  GitHub under this login; confirmed with the user). Live: https://nodesaint.github.io/cymatics-machine/
- Added `?f=` deep link for the initial frequency.
