# Lessons

Patterns captured after corrections, surprises, or hard-won tuning. Reviewed at session start.

## Physics / rendering

- `psi_nm` with `n == m` is identically zero — only precompute `n < m`. Since `psi_mn = −psi_nm`
  they share nodal lines, so the unordered pair `{n,m}` is the unit of a "figure".
- Grains converge to **nodal lines** = where `|Ψ| → 0`. Descend the gradient of `|Ψ|`, not `Ψ`.

## Process

- Spec was fully locked on arrival → skipped brainstorming, went straight to execution per the
  explicit "Start now" directive. Brainstorming is for ambiguous intent, not detailed specs.
