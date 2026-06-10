# PRIMER — Cymatics Machine

> One-screen spec for session continuity. Read this first when picking up the project.

## What it is

A public, zero-backend single-page instrument that simulates a vibrating **Chladni plate** with
real modal physics. Sand-like grains physically migrate to nodal lines and reorganise as the
driving frequency changes. Deploys to GitHub Pages. **British English throughout.**

## Stack

- **Vite + vanilla TypeScript.** No framework. One WebGL1 canvas for grains (point sprites,
  additive glow; Canvas 2D fallback at reduced count). Plain DOM instrument rail. One store module.
- **Web Audio** for ALL sound — synthesised from oscillators / filtered noise. Zero audio files.
- GitHub Pages via Actions from `main`. `dev` is the working branch. Vite `base: '/cymatics-machine/'`.

## Physics (modal approximation — stated honestly in the About panel)

- Square free-plate modes: `psi_nm(x,y) = cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy)`.
- Precompute all `psi_nm` for `n,m ≤ 8` on a 128×128 grid at boot (`n < m`; `n == m` ≡ 0).
- `f_nm` scales with `(n²+m²)` mapped into 50–2000 Hz.
- Lorentzian weights `w_nm(f) = 1/(1+((f−f_nm)/Γ)²)`.
- Live field `Ψ = Σ w_nm·psi_nm`, recombined only when weights move beyond a threshold.
- Gradient of `|Ψ|` via central differences. Recombine budget < 2 ms.
- Grains (30k WebGL / 12k fallback): descend gradient of `|Ψ|` toward nodal lines; jitter ∝ `|Ψ|`;
  mild damping + wall containment. Convergence to a clean figure ≈ 2 s.
- Colour by speed: hot amber moving → pale sand settled.

## Modes

1. **Tone** — 50–2000 Hz slider + one-octave keyboard. Sine + soft 2nd harmonic. Resonance ticks
   with gentle gravitation. Readout `f = 432 Hz · mode (3,5)`.
2. **Composition** — generative ~90 s loop via lookahead scheduler. Melody retunes the plate; kicks
   inject a radial jitter jolt. Voices from oscillators + filtered noise; sidechain duck off kick.
3. **Voice** — getUserMedia → autocorrelation pitch detection + confidence gate. Listening meter.
   Permission requested only on mode open; graceful denial; silence freezes the figure.
4. **Sonic Signature** — ≤12 chars → deterministic letter→frequency table → ~8 s morph → hold →
   export pixel-stable 1080×1080 PNG stamped with word, frequency sequence, "CYMATICS MACHINE".

## Design

Laboratory instrument, not rave. Near-black anodised plate, brass bezel, warm sand (#e8d5a8 family),
one monospace voice, still chrome (the motion IS the content). `prefers-reduced-motion` lowers jitter
and disables glow pulse. Keyboard: arrows nudge f, digits jump modes, space toggles. "?" opens a
genuine explainer (nodal lines, why sand gathers, what (n,m) means, what is approximated).

## Build order & status

1. ✅ Field + grains + slider.   2. ✅ Tone mode.   3. ✅ Composition.   4. ⬜ Voice.   5. ⬜ Sonic Signature.   6. ⬜ Circle plate (stretch).

## Acceptance

- 60 fps @ 30k grains (mid laptop); ≥30 fps @ 12k (recent phone).
- A sweep morphs through ≥10 distinct figures; convergence ~2 s at resonance.
- Composition events land within one frame of their scheduled audio timestamp.
- Voice tracks a hummed glissando; mic denial degrades gracefully.
- Identical word → pixel-stable identical Signature PNG across machines.
- Offline-capable after first load.

## Session note — 2026-06-10 (paused mid Step 4)

Steps 1–3 are live at https://nodesaint.github.io/cymatics-machine/ (committed, merged to `main`,
deployed, verified in production). Repo is `NodeSaint/cymatics-machine` (the spec's `nuvixstudio`
owner doesn't exist on GitHub under this login — user confirmed NodeSaint).

**Step 4 (Voice) is code-complete and builds clean, committed to `dev` as WIP (not deployed):**
`src/audio/pitch.ts` (autocorrelation + clarity), `src/audio/voice.ts` (mic, confidence gate,
silence→freeze), `src/ui/voicePanel.ts` (listening/denial UI), wired into main/rail/store.

**Blocker to resolve first thing:** the headless fake-mic verification shows `level: 0` (analyser
reads silence) so the pitch test can't confirm end-to-end. The detector itself is correct (reported
220 Hz, 0 cents when audio flowed). This is a *test-harness* issue, not proven app logic:
- Next: probe `window.__cym.audioState` + sample `window.__cym.voice.level` over ~3 s in Voice mode.
- Suspect the `--use-file-for-fake-audio-capture` flag (clean the messy `.replace('%noloop','')`
  in `tools/voice.mjs`) or the AudioContext not running. WAVs at `/tmp/tone220.wav`,
  `/tmp/tone440.wav` (48 kHz mono 16-bit). Verify the analyser graph is pulled
  (source→analyser→sink(0)→destination) and the context is resumed.
- Once green: commit/merge/deploy Step 4.

**Then:** Step 5 (Sonic Signature + PNG export — deterministic letter→freq table, ~8 s morph, hold,
pixel-stable 1080² PNG), Step 6 (circular Bessel plate, stretch).

Verification tooling (all headless/silent — null audio sink): `tools/convergence.ts` (grains),
`tools/drive.mjs` (Tone via CDP), `tools/sync.ts` (beat-sync, 24/24 within a frame),
`tools/composition.mjs`, `tools/voice.mjs` (fake-mic — needs the flag fix above).

## Source map

- `src/main.ts` — boot, render loop, mode wiring.
- `src/store.ts` — central reactive state.
- `src/physics/modes.ts` — precompute `psi_nm`, frequency table.
- `src/physics/field.ts` — Field: weights, recombine, `|Ψ|` gradients, sampling.
- `src/grains/grains.ts` — grain system (CPU physics).
- `src/render/webgl.ts` / `src/render/canvas2d.ts` — renderers.
- `src/ui/` — instrument rail, explainer, mode panels.
- `src/audio/` — Web Audio engine and synth voices.
