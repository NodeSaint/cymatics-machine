// Bessel functions of the first kind J_n and their positive zeros — the basis
// for circular-plate (Chladni) modes: u_nm(r,θ) = J_n(j_nm·r)·cos(nθ), where
// j_nm is the m-th zero of J_n (clamped edge → a nodal circle at the rim).

/** J_n(x) for integer n ≥ 0 via the (stable, ratio-form) power series. */
export function besselJ(n: number, x: number): number {
  if (x === 0) return n === 0 ? 1 : 0;
  const h = x / 2;
  // term_0 = h^n / n!
  let term = 1;
  for (let k = 1; k <= n; k++) term *= h / k;
  let sum = term;
  const h2 = h * h;
  for (let k = 1; k < 80; k++) {
    term *= -h2 / (k * (k + n));
    sum += term;
    if (Math.abs(term) < 1e-13 * Math.abs(sum)) break;
  }
  return sum;
}

/** First `count` positive zeros of J_n, found by scan + bisection. */
export function besselZeros(n: number, count: number): number[] {
  const zeros: number[] = [];
  const step = 0.02;
  let prevX = 1e-4;
  let prevV = besselJ(n, prevX);
  for (let x = prevX + step; zeros.length < count && x < 200; x += step) {
    const v = besselJ(n, x);
    if (prevV === 0 || (prevV < 0 !== v < 0)) {
      // Sign change in (prevX, x] — bisect.
      let lo = prevX;
      let hi = x;
      let flo = prevV;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        const fmid = besselJ(n, mid);
        if (flo < 0 !== fmid < 0) {
          hi = mid;
        } else {
          lo = mid;
          flo = fmid;
        }
      }
      zeros.push((lo + hi) / 2);
    }
    prevX = x;
    prevV = v;
  }
  return zeros;
}
