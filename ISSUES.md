# Issues & Known Limitations

Tracked rough edges, deferred work, and honest caveats. British English throughout.

## Open

- **Signature PNG determinism is per-engine.** The figure is a fixed-seed, fixed-step simulation, so
  the same word yields byte-identical pixels on the same browser engine (verified: EMMA renders
  identically across calls). Across different engines/OSes, IEEE-754 `Math.sin`/float rounding and
  font antialiasing can differ sub-pixel. In practice all current Chromium/Firefox builds agree on
  the figure; the caption text is the most likely cross-OS variation. Good enough for "same word →
  same card", short of bundling a font and a fixed-point solver.
- Headless Chrome can't feed a fake microphone into a MediaStreamSource (reads silence), so Voice is
  verified by DSP unit tests + the denial branch rather than a live-mic end-to-end run. The analyser
  path itself is proven (an OscillatorNode reaches the analyser).

## Physics caveats (by design — surfaced in the explainer)

- This is a **modal approximation**, not a full Kirchhoff–Love plate FEM solve. We mix analytic
  square free-plate modes with Lorentzian weights rather than solving the biharmonic eigenproblem.
- Mode shapes use the idealised `cos·cos − cos·cos` form; true free-edge boundary conditions shift
  exact eigenfrequencies. Frequencies are mapped (not measured) into 50–2000 Hz.
- Grain motion is a phenomenological gradient-descent toward nodal lines, not a granular dynamics /
  acoustic-streaming simulation.

## Deferred / stretch

- Circular plate via Bessel modes `J_n(k·r)·cos(nθ)`.
- WebM capture of the Sonic Signature morph.
