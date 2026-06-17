import type { Circuit, CircuitComponent } from './types'
import { assembleMNA, makeDCEnv } from './mna'

export interface MNAMatrix {
  /** Size of the matrix (n + m) */
  size: number
  /** Number of non-ground nodes */
  n: number
  /** Number of voltage sources */
  m: number
  /** The combined A matrix stored as flat Float64Array (row-major) */
  A: Float64Array
  /** RHS vector z */
  z: Float64Array
  /** Maps voltage source component id to its row index in the extra rows */
  vsIndex: Map<string, number>
}

function ipiv(p: Int32Array, i: number, j: number) {
  const t = p[i]; p[i] = p[j]; p[j] = t
}

/**
 * LU decomposition with partial pivoting (in-place, Doolittle).
 * On return, A contains L (below diagonal, implicit 1s on diagonal) and
 * U (diagonal and above). pivot[i] stores the permuted row index for row i.
 * Returns true if the matrix is non-singular.
 */
export function luDecompose(n: number, A: Float64Array, pivot: Int32Array): boolean {
  for (let i = 0; i < n; i++) pivot[i] = i

  for (let j = 0; j < n; j++) {
    // ── 1. U[i][j] for i = 0..j (upper triangle) ─────────────────
    for (let i = 0; i <= j; i++) {
      let sum = A[i * n + j]
      for (let k = 0; k < i; k++) {
        sum -= A[i * n + k] * A[k * n + j]
      }
      A[i * n + j] = sum
    }

    // ── 2. Raw L[i][j] for i = j+1..n-1 (before division) ────────
    for (let i = j + 1; i < n; i++) {
      let sum = A[i * n + j]
      for (let k = 0; k < j; k++) {
        sum -= A[i * n + k] * A[k * n + j]
      }
      A[i * n + j] = sum
    }

    // ── 3. Pivot ──────────────────────────────────────────────────
    let maxVal = Math.abs(A[j * n + j])
    let maxRow = j
    for (let i = j + 1; i < n; i++) {
      const v = Math.abs(A[i * n + j])
      if (v > maxVal) { maxVal = v; maxRow = i }
    }
    if (maxVal < 1e-30) return false

    if (maxRow !== j) {
      ipiv(pivot, j, maxRow)
      for (let k = 0; k < n; k++) {
        const t = A[j * n + k]; A[j * n + k] = A[maxRow * n + k]; A[maxRow * n + k] = t
      }
    }

    // ── 4. Divide L[i][j] by U[j][j] ─────────────────────────────
    const diag = A[j * n + j]
    if (Math.abs(diag) < 1e-30) return false
    for (let i = j + 1; i < n; i++) {
      A[i * n + j] /= diag
    }
  }
  return true
}

/**
 * Solve Ly = b, then Ux = y using LU-decomposed matrix A and pivot array.
 */
export function luSolve(n: number, LU: Float64Array, pivot: Int32Array, b: Float64Array, x: Float64Array) {
  // Forward substitution: Ly = Pb
  for (let i = 0; i < n; i++) {
    const bi = b[pivot[i]]
    let sum = 0
    for (let k = 0; k < i; k++) sum += LU[i * n + k] * x[k]
    x[i] = bi - sum
  }

  // Back substitution: Ux = y
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0
    for (let k = i + 1; k < n; k++) sum += LU[i * n + k] * x[k]
    x[i] = (x[i] - sum) / LU[i * n + i]
  }
}

/**
 * Build the DC MNA matrix for a circuit (thin wrapper over the shared assembler).
 * Retained for consumers that need the raw matrix + branch index (e.g. laws.ts).
 *
 * DC rules:
 * - Resistors: stamp conductance into G
 * - Capacitors: open circuit (no stamp)
 * - Inductors: short circuit → treated as 0V voltage source (extra row)
 * - Voltage sources: extra row, V = value
 * - Ground: node 0, always 0V, excluded from unknowns
 */
export function buildDCMatrix(circuit: Circuit): MNAMatrix | null {
  const mna = assembleMNA(circuit, makeDCEnv())
  if (!mna) return null
  return { size: mna.size, n: mna.n, m: mna.m, A: mna.A, z: mna.z, vsIndex: mna.vsIndex }
}

/**
 * Solve DC operating point.
 * Returns node voltages (indexed by node id) or null if singular.
 */
export function solveDC(circuit: Circuit): Float64Array | null {
  const mna = assembleMNA(circuit, makeDCEnv())
  if (!mna || mna.size === 0) return null

  const { size, A, z, n, nodeOrder } = mna
  const pivot = new Int32Array(size)
  if (!luDecompose(size, A, pivot)) return null

  const x = new Float64Array(size)
  luSolve(size, A, pivot, z, x)

  // Extract node voltages indexed by node id (row i ↔ nodeOrder[i]).
  const maxNode = nodeOrder.length ? nodeOrder[nodeOrder.length - 1] : 0
  const result = new Float64Array(maxNode + 1)
  for (let i = 0; i < n; i++) {
    result[nodeOrder[i]] = x[i]
  }
  result[0] = 0 // ground
  return result
}

/**
 * Get component current from DC solution.
 */
export function getComponentCurrent(
  circuit: Circuit,
  comp: CircuitComponent,
  nodeVoltages: Float64Array,
  mna: MNAMatrix | null,
  x: Float64Array | null,
): number {
  if (comp.type === 'R') {
    return (nodeVoltages[comp.nodeA] - nodeVoltages[comp.nodeB]) / comp.value
  }
  if (comp.type === 'V' || comp.type === 'L') {
    if (mna && x) {
      const vi = mna.vsIndex.get(comp.id)
      if (vi !== undefined) return x[vi]
    }
  }
  if (comp.type === 'C') {
    return 0 // DC: open circuit
  }
  return 0
}

// Re-export types from the MNAMatrix
export type { CircuitComponent }
