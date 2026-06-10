# Changelog

All notable changes to the Cymatics Machine. Dates are ISO (YYYY-MM-DD). British English throughout.

## [Unreleased] — dev

### 2026-06-10 — `dev` — Project scaffold + Step 1 foundation

- Scaffolded Vite 8 + TypeScript 6 vanilla project (no framework).
- Added project docs: `PRIMER.md`, `CHANGELOG.md`, `ISSUES.md`, `tasks/todo.md`, `tasks/lessons.md`,
  project `CLAUDE.md`, and `.claude/agents/` specialists (`physics-dev`, `audio-dev`, `ui-dev`, `deploy`).
- Implemented modal physics core: precomputed `psi_nm` modes, Lorentzian frequency mixing, `|Ψ|`
  gradient field, and a 30k-grain system that descends toward nodal lines (Canvas 2D fallback).
- Frequency slider with resonance ticks (silent).
- GitHub Pages deploy workflow (`base: '/cymatics-machine/'`).
