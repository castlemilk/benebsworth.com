import { describe, expect, it } from 'vitest'
import {
  MEMORY_CHIP_GRAPH,
  buildCompanyProfile,
  buildSankeyFlows,
  findTraversalPath,
} from './memory-chip-knowledge-graph'

describe('memory chip ecosystem knowledge graph', () => {
  it('finds a sourced traversal from lithography to cloud AI spend', () => {
    const path = findTraversalPath(MEMORY_CHIP_GRAPH, 'asml', 'microsoft')

    expect(path?.nodes.map((node) => node.id)).toEqual(['asml', 'tsmc', 'nvidia', 'microsoft'])
    expect(path?.edges.map((edge) => edge.kind)).toEqual(['supplies_equipment_to', 'fabricates_for', 'sells_accelerators_to'])
    expect(path?.confidence).toBe('inferred')
  })

  it('summarizes a company with upstream, downstream, and financial anchors', () => {
    const profile = buildCompanyProfile(MEMORY_CHIP_GRAPH, 'nvidia')

    expect(profile.node.label).toBe('NVIDIA')
    expect(profile.upstream.map((edge) => edge.from)).toEqual(expect.arrayContaining(['tsmc', 'sk-hynix', 'micron']))
    expect(profile.downstream.map((edge) => edge.to)).toEqual(expect.arrayContaining(['amazon', 'google', 'microsoft', 'meta']))
    expect(profile.metrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining(['FY2026 revenue', 'FY2026 data center revenue'])
    )
  })

  it('attaches a financial anchor to every core graph node', () => {
    const missing = MEMORY_CHIP_GRAPH.nodes
      .filter((node) => !node.metrics || node.metrics.length === 0)
      .map((node) => node.id)

    expect(missing).toEqual([])
  })

  it('normalizes Sankey flow widths while preserving source-backed values', () => {
    const flows = buildSankeyFlows(MEMORY_CHIP_GRAPH, [
      'alphabet-2026-capex',
      'amazon-2026-capex',
      'meta-2026-capex',
      'microsoft-q3-fy26-capex',
    ])

    expect(flows.totalValue).toBe(556.9)
    expect(flows.items[0]).toMatchObject({
      id: 'amazon-2026-capex',
      label: 'AWS AI infrastructure commitments',
      value: 200,
      unit: 'USD billions',
    })
    expect(flows.items.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100, 5)
    expect(flows.items.every((item) => item.width >= 12)).toBe(true)
  })
})
