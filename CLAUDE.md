# CLAUDE.md — Cymatics Machine (project)

Supplements the global CLAUDE.md. If anything here conflicts with the global file, flag it.

## What this is

Zero-backend single-page Chladni-plate instrument. Vite + vanilla TypeScript, one WebGL1 canvas,
Web Audio synthesis only (no audio files). Deploys to GitHub Pages. See `PRIMER.md` for the full spec.

## Hard rules

- **British English throughout** — UI copy, comments, docs ("colour", "centre", "visualise").
- **No framework.** No React/Vue/etc. Plain DOM + one store module.
- **No audio files.** All sound synthesised from oscillators / filtered noise via Web Audio.
- **Zero backend.** Everything runs client-side; must be offline-capable after first load.
- **Honest physics.** It is a modal approximation and the explainer must say so.
- Keep the recombine budget `< 2 ms`; target 60 fps @ 30k grains.

## Conventions

- Source lives in `src/`; one responsibility per module (see `PRIMER.md` source map).
- Frequencies in Hz; plate coordinates normalised to `[0,1]²`.
- `dev` is the working branch; `main` deploys. Log every push in `CHANGELOG.md`.

## Specialist agents (`.claude/agents/`)

`physics-dev` (modes/field/grains), `audio-dev` (Web Audio engine + synth voices),
`ui-dev` (rail, panels, explainer, styling), `deploy` (Pages workflow, build, perf checks).
