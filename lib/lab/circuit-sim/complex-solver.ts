/**
 * Complex linear system solver for AC (phasor) analysis.
 *
 * Complex numbers are represented as INTERLEAVED [re, im] pairs in Float64Arrays.
 *  - Matrix A is n*n complex, length 2*n*n, row-major:
 *      real(A[r][c]) at A[(r*n + c)*2], imag at A[(r*n + c)*2 + 1].
 *  - Vector b is length 2*n: real(b[i]) at b[i*2], imag at b[i*2 + 1].
 *
 * The decomposition mirrors the real Doolittle LU with partial pivoting in
 * solver.ts, lifted to complex arithmetic. Pure/headless — no DOM, no browser
 * APIs. Pivoting selects the row with the largest complex magnitude.
 */

const SINGULAR_TOL = 1e-30

/** Complex addition: (ar+ai·j) + (br+bi·j). */
export function cadd(ar: number, ai: number, br: number, bi: number): [number, number] {
  return [ar + br, ai + bi]
}

/** Complex subtraction: (ar+ai·j) - (br+bi·j). */
export function csub(ar: number, ai: number, br: number, bi: number): [number, number] {
  return [ar - br, ai - bi]
}

/** Complex multiplication: (ar+ai·j) · (br+bi·j). */
export function cmul(ar: number, ai: number, br: number, bi: number): [number, number] {
  return [ar * br - ai * bi, ar * bi + ai * br]
}

/**
 * Complex division: (ar+ai·j) / (br+bi·j).
 * Smith's algorithm — scales by the larger denominator component to avoid
 * intermediate overflow/underflow that the naïve |b|² form suffers.
 */
export function cdiv(ar: number, ai: number, br: number, bi: number): [number, number] {
  if (Math.abs(br) >= Math.abs(bi)) {
    const r = bi / br
    const denom = br + bi * r
    return [(ar + ai * r) / denom, (ai - ar * r) / denom]
  }
  const r = br / bi
  const denom = br * r + bi
  return [(ar * r + ai) / denom, (ai * r - ar) / denom]
}

/** Complex magnitude (modulus) of (re + im·j). */
function cabs(re: number, im: number): number {
  return Math.hypot(re, im)
}

/**
 * Solve the complex linear system A x = b via in-place LU decomposition with
 * partial pivoting (on complex magnitude), followed by forward/back substitution.
 *
 * A is mutated in place (it becomes the LU factors). Returns the solution x as
 * an interleaved Float64Array of length 2*n, or null if the matrix is singular
 * (any pivot magnitude < 1e-30).
 */
export function cluSolve(n: number, A: Float64Array, b: Float64Array): Float64Array | null {
  if (n === 0) return new Float64Array(0)

  const pivot = new Int32Array(n)
  for (let i = 0; i < n; i++) pivot[i] = i

  // ── LU decomposition (Doolittle) with partial pivoting ──────────────
  for (let j = 0; j < n; j++) {
    // 1. U[i][j] for i = 0..j (upper triangle, including diagonal raw value)
    for (let i = 0; i <= j; i++) {
      let sr = A[(i * n + j) * 2]
      let si = A[(i * n + j) * 2 + 1]
      for (let k = 0; k < i; k++) {
        const lr = A[(i * n + k) * 2]
        const li = A[(i * n + k) * 2 + 1]
        const ur = A[(k * n + j) * 2]
        const ui = A[(k * n + j) * 2 + 1]
        // sum -= L[i][k] * U[k][j]
        sr -= lr * ur - li * ui
        si -= lr * ui + li * ur
      }
      A[(i * n + j) * 2] = sr
      A[(i * n + j) * 2 + 1] = si
    }

    // 2. Raw L[i][j] for i = j+1..n-1 (before division by pivot)
    for (let i = j + 1; i < n; i++) {
      let sr = A[(i * n + j) * 2]
      let si = A[(i * n + j) * 2 + 1]
      for (let k = 0; k < j; k++) {
        const lr = A[(i * n + k) * 2]
        const li = A[(i * n + k) * 2 + 1]
        const ur = A[(k * n + j) * 2]
        const ui = A[(k * n + j) * 2 + 1]
        sr -= lr * ur - li * ui
        si -= lr * ui + li * ur
      }
      A[(i * n + j) * 2] = sr
      A[(i * n + j) * 2 + 1] = si
    }

    // 3. Partial pivot: pick the row with the largest complex magnitude
    let maxVal = cabs(A[(j * n + j) * 2], A[(j * n + j) * 2 + 1])
    let maxRow = j
    for (let i = j + 1; i < n; i++) {
      const v = cabs(A[(i * n + j) * 2], A[(i * n + j) * 2 + 1])
      if (v > maxVal) {
        maxVal = v
        maxRow = i
      }
    }
    if (maxVal < SINGULAR_TOL) return null

    if (maxRow !== j) {
      const t = pivot[j]
      pivot[j] = pivot[maxRow]
      pivot[maxRow] = t
      // swap the two full rows (real and imag parts)
      for (let k = 0; k < n; k++) {
        const a = (j * n + k) * 2
        const bIdx = (maxRow * n + k) * 2
        let tmp = A[a]
        A[a] = A[bIdx]
        A[bIdx] = tmp
        tmp = A[a + 1]
        A[a + 1] = A[bIdx + 1]
        A[bIdx + 1] = tmp
      }
    }

    // 4. Divide L[i][j] by U[j][j]
    const dr = A[(j * n + j) * 2]
    const di = A[(j * n + j) * 2 + 1]
    if (cabs(dr, di) < SINGULAR_TOL) return null
    for (let i = j + 1; i < n; i++) {
      const [qr, qi] = cdiv(A[(i * n + j) * 2], A[(i * n + j) * 2 + 1], dr, di)
      A[(i * n + j) * 2] = qr
      A[(i * n + j) * 2 + 1] = qi
    }
  }

  // ── Solve: forward substitution Ly = Pb, then back substitution Ux = y ──
  const x = new Float64Array(2 * n)

  // Forward substitution (L has implicit unit diagonal)
  for (let i = 0; i < n; i++) {
    let sr = b[pivot[i] * 2]
    let si = b[pivot[i] * 2 + 1]
    for (let k = 0; k < i; k++) {
      const lr = A[(i * n + k) * 2]
      const li = A[(i * n + k) * 2 + 1]
      const xr = x[k * 2]
      const xi = x[k * 2 + 1]
      sr -= lr * xr - li * xi
      si -= lr * xi + li * xr
    }
    x[i * 2] = sr
    x[i * 2 + 1] = si
  }

  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    let sr = x[i * 2]
    let si = x[i * 2 + 1]
    for (let k = i + 1; k < n; k++) {
      const ur = A[(i * n + k) * 2]
      const ui = A[(i * n + k) * 2 + 1]
      const xr = x[k * 2]
      const xi = x[k * 2 + 1]
      sr -= ur * xr - ui * xi
      si -= ur * xi + ui * xr
    }
    const [qr, qi] = cdiv(sr, si, A[(i * n + i) * 2], A[(i * n + i) * 2 + 1])
    x[i * 2] = qr
    x[i * 2 + 1] = qi
  }

  return x
}
