/** d3-force-3d ships no declarations; it mirrors d3-force's API plus a z axis
 *  and `numDimensions`, so the surface is declared here in terms of the typed
 *  2D package. */
declare module 'd3-force-3d' {
  import type {
    ForceCollide,
    ForceLink,
    ForceManyBody,
    ForceRadial,
    ForceX,
    ForceY,
    ForceCenter,
    Simulation,
    SimulationLinkDatum,
    SimulationNodeDatum,
  } from 'd3-force'

  /** Node datum carrying the third axis the 3D sim drives. */
  export interface SimulationNodeDatum3D extends SimulationNodeDatum {
    z?: number
    vz?: number
    fz?: number
  }

  export interface Simulation3D<
    N extends SimulationNodeDatum,
    L extends SimulationLinkDatum<N> | undefined,
  > extends Simulation<N, L> {
    numDimensions(): 1 | 2 | 3
    numDimensions(dimensions: 1 | 2 | 3): this
  }

  export function forceSimulation<N extends SimulationNodeDatum>(nodes?: N[]): Simulation3D<N, undefined>
  export function forceSimulation<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(
    nodes: N[],
    links: L[],
  ): Simulation3D<N, L>

  export function forceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(links?: L[]): ForceLink<N, L>
  export function forceManyBody<N extends SimulationNodeDatum>(): ForceManyBody<N>
  export function forceCollide<N extends SimulationNodeDatum>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
  ): ForceCollide<N>
  export function forceRadial<N extends SimulationNodeDatum>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
    x?: number,
    y?: number,
    z?: number,
  ): ForceRadial<N>
  export function forceX<N extends SimulationNodeDatum>(x?: number | ((node: N, i: number, nodes: N[]) => number)): ForceX<N>
  export function forceY<N extends SimulationNodeDatum>(y?: number | ((node: N, i: number, nodes: N[]) => number)): ForceY<N>
  /** forceZ mirrors forceX: a strength plus a z accessor. */
  export type ForceZ<N extends SimulationNodeDatum> = ForceX<N>
  export function forceZ<N extends SimulationNodeDatum>(z?: number | ((node: N, i: number, nodes: N[]) => number)): ForceZ<N>
  export function forceCenter<N extends SimulationNodeDatum>(x?: number, y?: number, z?: number): ForceCenter<N>
}
