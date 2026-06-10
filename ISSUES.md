# Issues & Known Limitations

Tracked rough edges, deferred work, and honest caveats. British English throughout.

## Open

- _(none yet — Step 1 in progress)_

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
