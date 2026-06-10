# Changelog

All notable changes to the Cymatics Machine. Dates are ISO (YYYY-MM-DD). British English throughout.

## [Unreleased] — dev

### 2026-06-10 — `dev` → `main` — Step 5: Sonic Signature + PNG export

- **Deterministic letter→frequency map** (`signature.ts`): letters/digits land on an A-minor
  pentatonic scale (`code % scale` so adjacent letters differ), with ±1-step position weighting to
  break collisions — so ABBA ≠ BABA. Pure: same word ⇒ same sequence. `cleanInput` (live, keeps
  trailing space for multi-word names) vs `sanitiseWord` (final, trimmed).
- **Reproducible figure + PNG** (`export.ts`): `simulateSignature` runs a fixed-seed, fixed-step
  morph (no `Math.random`/time) → identical grain positions every run. `renderSignature` draws the
  1080×1080 card — additive grains, brass bezel, bottom scrim, stamped with the word, the frequency
  sequence, and "CYMATICS MACHINE" (manual letter-tracking, portable). `exportSignaturePNG` downloads.
- **Signature panel** (`ui/signaturePanel.ts`): word field (≤12), Perform, Export PNG.
- **Performed morph**: glides through the word's frequencies over ~8 s (smoothstep) then holds the
  final figure; the Tone voice performs it audibly when sound is on.
- Verified: determinism unit tests (`tools/signature.ts`) — same word ⇒ identical fingerprint, 5/5
  distinct words distinct. In-browser (`tools/`): PNG is 1080×1080, **byte-identical for the same
  word across calls**, differs between words; live morph glides then holds (330→220→262→220 → hold).
  Determinism caveat (per-engine) documented in ISSUES.

### 2026-06-10 — `dev` → `main` — Step 4: Voice mode

- **Autocorrelation pitch detection** (`audio/pitch.ts`): full ACF, first-trough skip to avoid the
  zero-lag shoulder, parabolic interpolation, clarity (confidence) measure, RMS silence gate.
- **Voice input** (`audio/voice.ts`): mic via getUserMedia tapped through a muted analyser (no
  output/feedback); confidence gate holds the last stable frequency below threshold; silence reports
  `silent` so the figure freezes. Permission requested only when Voice mode opens.
- **Voice panel** (`ui/voicePanel.ts`): listening status, confidence + level meters, and a graceful
  denial state with a "Try again" button.
- Verified: DSP unit tests (`tools/pitch.ts`) — accurate to ≤11 cents across 110–880 Hz, silence
  gate, and gate/smoothing (tracks → holds on silence → glides on resume). Denial branch verified in
  browser (micStatus → denied, graceful UI). Note: fake-mic→analyser data flow is not testable in
  headless Chrome, but the analyser path is proven via an oscillator and the detector via real buffers.

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
