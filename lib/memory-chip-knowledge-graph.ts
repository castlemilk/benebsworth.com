export type GraphNodeType = 'equipment' | 'foundry' | 'memory' | 'accelerator' | 'cloud' | 'technology'

export type GraphEdgeKind =
  | 'supplies_equipment_to'
  | 'fabricates_for'
  | 'packages_with'
  | 'supplies_memory_to'
  | 'sells_accelerators_to'
  | 'buys_compute_for'
  | 'competes_with'
  | 'depends_on'

export type GraphConfidence = 'direct' | 'inferred' | 'modeled'

export type GraphSource = {
  id: string
  title: string
  publisher: string
  date: string
  url: string
}

export type GraphMetric = {
  label: string
  value: number
  unit: string
  period: string
  sourceId: string
  note?: string
}

export type GraphNode = {
  id: string
  label: string
  type: GraphNodeType
  region: string
  summary: string
  metrics?: GraphMetric[]
}

export type GraphEdge = {
  id: string
  from: string
  to: string
  kind: GraphEdgeKind
  label: string
  confidence: GraphConfidence
  sourceIds: string[]
  note: string
  value?: number
  unit?: string
  period?: string
}

export type MemoryChipGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  sources: GraphSource[]
}

export type TraversalPath = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  confidence: GraphConfidence
}

export type CompanyProfile = {
  node: GraphNode
  upstream: GraphEdge[]
  downstream: GraphEdge[]
  peers: GraphEdge[]
  metrics: GraphMetric[]
  sources: GraphSource[]
}

export type SankeyFlow = GraphEdge & {
  percent: number
  width: number
}

export type SankeyFlowGroup = {
  totalValue: number
  unit: string
  items: SankeyFlow[]
}

const sourceIds = (...ids: string[]) => ids

export const MEMORY_CHIP_GRAPH: MemoryChipGraph = {
  sources: [
    {
      id: 'asml-2025-annual',
      title: 'ASML 2025 Annual Report, Financials',
      publisher: 'ASML',
      date: '2026-02-18',
      url: 'https://www.asml.com/en/investors/annual-report/2025/financials',
    },
    {
      id: 'tsmc-cowos',
      title: 'CoWoS',
      publisher: 'TSMC',
      date: '2026',
      url: 'https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm',
    },
    {
      id: 'tsmc-2025-annual',
      title: 'TSMC 2025 Annual Report',
      publisher: 'TSMC',
      date: '2026',
      url: 'https://investor.tsmc.com/static/annualReports/2025/english/index.html',
    },
    {
      id: 'tsmc-q4-2025-transcript',
      title: 'TSMC Fourth Quarter 2025 Earnings Conference Transcript',
      publisher: 'TSMC',
      date: '2026-01-15',
      url: 'https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-01/51d09df96cd89ac19d65af39032b038dc2896a24/TSMC%204Q25%20Transcript.pdf',
    },
    {
      id: 'nvidia-fy2026',
      title: 'NVIDIA Announces Financial Results for Fourth Quarter and Fiscal 2026',
      publisher: 'NVIDIA',
      date: '2026-02-25',
      url: 'https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026',
    },
    {
      id: 'alphabet-q1-2026',
      title: 'Alphabet 2026 Q1 Earnings Call',
      publisher: 'Alphabet',
      date: '2026-04-29',
      url: 'https://abc.xyz/investor/events/event-details/2026/2026-Q1-Earnings-Call-2026-nW8kCrBAKS/default.aspx',
    },
    {
      id: 'microsoft-q3-fy2026',
      title: 'Microsoft Fiscal Year 2026 Third Quarter Earnings Conference Call',
      publisher: 'Microsoft',
      date: '2026-04-29',
      url: 'https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q3',
    },
    {
      id: 'meta-q1-2026',
      title: 'Meta Reports First Quarter 2026 Results',
      publisher: 'Meta',
      date: '2026-04-29',
      url: 'https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-First-Quarter-2026-Results/default.aspx',
    },
    {
      id: 'amazon-2025-annual',
      title: 'Amazon 2025 Annual Report',
      publisher: 'Amazon',
      date: '2026-04-10',
      url: 'https://s2.q4cdn.com/299287126/files/doc_financials/2026/ar/Amazon-2025-Annual-Report.pdf',
    },
    {
      id: 'micron-nvidia-gtc-2025',
      title: 'Micron Innovates From the Data Center to the Edge With NVIDIA',
      publisher: 'Micron',
      date: '2025-03-18',
      url: 'https://investors.micron.com/news-releases/news-release-details/micron-innovates-data-center-edge-nvidia',
    },
    {
      id: 'micron-fy2025-results',
      title: 'Micron Technology Reports Results for Fourth Quarter and Full Year of Fiscal 2025',
      publisher: 'Micron',
      date: '2025-09-23',
      url: 'https://investors.micron.com/news-releases/news-release-details/micron-technology-inc-reports-results-fourth-quarter-and-full-8',
    },
    {
      id: 'sk-hynix-nvidia-2026',
      title: 'SK hynix and NVIDIA Announce Multi-year Technology Partnership to Advance Memory for AI Factories',
      publisher: 'SK hynix',
      date: '2026-06-07',
      url: 'https://news.skhynix.com/multi-year-tech-partnership-with-nvidia/',
    },
    {
      id: 'sk-hynix-fy2025-results',
      title: 'SK hynix Announces FY25 Financial Results',
      publisher: 'SK hynix',
      date: '2026-01-28',
      url: 'https://news.skhynix.com/sk-hynix-announces-fy25-financial-results/',
    },
    {
      id: 'samsung-q4-2025-presentation',
      title: 'Samsung Electronics 4Q 2025 Financial Results Presentation',
      publisher: 'Samsung Electronics',
      date: '2026-01-29',
      url: 'https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2025_4Q_conference_eng.pdf',
    },
    {
      id: 'trendforce-dram-1q26',
      title: 'Rapid Contract Price Surge Drives 1Q26 DRAM Industry Up 81% QoQ',
      publisher: 'TrendForce',
      date: '2026-06-01',
      url: 'https://www.trendforce.com/presscenter/news/20260601-13070.html',
    },
  ],
  nodes: [
    {
      id: 'asml',
      label: 'ASML',
      type: 'equipment',
      region: 'Netherlands',
      summary: 'Lithography supplier whose EUV and DUV tools gate advanced logic and DRAM capacity.',
      metrics: [
        {
          label: '2025 net sales',
          value: 32.7,
          unit: 'EUR billions',
          period: 'FY2025',
          sourceId: 'asml-2025-annual',
        },
        {
          label: '2026 net sales guide',
          value: 39,
          unit: 'EUR billions high end',
          period: 'FY2026',
          sourceId: 'asml-2025-annual',
          note: 'ASML guided 2026 total net sales to EUR 34B to EUR 39B.',
        },
      ],
    },
    {
      id: 'tsmc',
      label: 'TSMC',
      type: 'foundry',
      region: 'Taiwan',
      summary: 'Leading foundry and advanced packaging bottleneck for AI accelerators and custom ASICs.',
      metrics: [
        {
          label: '2025 revenue',
          value: 122.42,
          unit: 'USD billions',
          period: 'FY2025',
          sourceId: 'tsmc-2025-annual',
        },
        {
          label: '2026 capex guide high end',
          value: 56,
          unit: 'USD billions',
          period: 'FY2026',
          sourceId: 'tsmc-q4-2025-transcript',
          note: 'TSMC guided 2026 capital budget to USD 52B to USD 56B.',
        },
      ],
    },
    {
      id: 'cowos',
      label: 'CoWoS',
      type: 'technology',
      region: 'Taiwan',
      summary: 'TSMC 2.5D package family that places logic chiplets beside HBM cubes on interposers.',
      metrics: [
        {
          label: '2026 packaging capex envelope',
          value: 11.2,
          unit: 'USD billions modeled high end',
          period: 'FY2026',
          sourceId: 'tsmc-q4-2025-transcript',
          note: 'Modeled as 20% of TSMC high-end 2026 capex guide; TSMC allocates 10-20% to advanced packaging, testing, mask making, and others.',
        },
      ],
    },
    {
      id: 'samsung',
      label: 'Samsung',
      type: 'memory',
      region: 'South Korea',
      summary: 'Major DRAM, NAND, HBM, and foundry participant.',
      metrics: [
        {
          label: 'FY2025 memory revenue',
          value: 104.1,
          unit: 'KRW trillions',
          period: 'FY2025',
          sourceId: 'samsung-q4-2025-presentation',
        },
      ],
    },
    {
      id: 'sk-hynix',
      label: 'SK hynix',
      type: 'memory',
      region: 'South Korea',
      summary: 'AI memory leader with HBM products and a public multi-year technology partnership with NVIDIA.',
      metrics: [
        {
          label: 'FY2025 revenue',
          value: 97.1467,
          unit: 'KRW trillions',
          period: 'FY2025',
          sourceId: 'sk-hynix-fy2025-results',
        },
      ],
    },
    {
      id: 'micron',
      label: 'Micron',
      type: 'memory',
      region: 'United States',
      summary: 'DRAM, NAND, HBM, and data-center memory supplier with HBM3E designed into NVIDIA platforms.',
      metrics: [
        {
          label: 'FY2025 revenue',
          value: 37.378,
          unit: 'USD billions',
          period: 'FY2025',
          sourceId: 'micron-fy2025-results',
        },
        {
          label: 'FY2025 net capex',
          value: 13.804,
          unit: 'USD billions',
          period: 'FY2025',
          sourceId: 'micron-fy2025-results',
        },
      ],
    },
    {
      id: 'nvidia',
      label: 'NVIDIA',
      type: 'accelerator',
      region: 'United States',
      summary: 'Accelerator platform company that converts foundry, packaging, and HBM capacity into AI systems.',
      metrics: [
        {
          label: 'FY2026 revenue',
          value: 215.9,
          unit: 'USD billions',
          period: 'FY2026',
          sourceId: 'nvidia-fy2026',
        },
        {
          label: 'FY2026 data center revenue',
          value: 193.7,
          unit: 'USD billions',
          period: 'FY2026',
          sourceId: 'nvidia-fy2026',
        },
      ],
    },
    {
      id: 'amazon',
      label: 'Amazon / AWS',
      type: 'cloud',
      region: 'United States',
      summary: 'Cloud buyer with AWS AI infrastructure, NVIDIA GPU instances, and in-house Trainium silicon.',
      metrics: [
        {
          label: '2026 capex plan',
          value: 200,
          unit: 'USD billions',
          period: 'FY2026',
          sourceId: 'amazon-2025-annual',
          note: 'Amazon disclosed approximately USD 200B in 2026 capex backed by customer commitments.',
        },
      ],
    },
    {
      id: 'google',
      label: 'Google / Alphabet',
      type: 'cloud',
      region: 'United States',
      summary: 'Cloud and model operator buying NVIDIA GPUs while scaling TPU and data-center capex.',
      metrics: [
        {
          label: '2026 capex guide high end',
          value: 190,
          unit: 'USD billions',
          period: 'FY2026',
          sourceId: 'alphabet-q1-2026',
        },
      ],
    },
    {
      id: 'microsoft',
      label: 'Microsoft / Azure',
      type: 'cloud',
      region: 'United States',
      summary: 'Azure AI cloud buyer whose capex includes GPUs, CPUs, data centers, and OpenAI-linked demand.',
      metrics: [
        {
          label: 'Q3 FY2026 capex',
          value: 31.9,
          unit: 'USD billions',
          period: 'Q3 FY2026',
          sourceId: 'microsoft-q3-fy2026',
          note: 'Microsoft said roughly two thirds was short-lived assets, primarily GPUs and CPUs.',
        },
      ],
    },
    {
      id: 'meta',
      label: 'Meta',
      type: 'cloud',
      region: 'United States',
      summary: 'Large AI infrastructure buyer with 2026 capex guidance lifted by component pricing and data-center costs.',
      metrics: [
        {
          label: '2026 capex guide midpoint',
          value: 135,
          unit: 'USD billions',
          period: 'FY2026',
          sourceId: 'meta-q1-2026',
        },
      ],
    },
  ],
  edges: [
    {
      id: 'asml-to-tsmc',
      from: 'asml',
      to: 'tsmc',
      kind: 'supplies_equipment_to',
      label: 'EUV and DUV lithography exposure',
      confidence: 'inferred',
      sourceIds: sourceIds('asml-2025-annual'),
      note: 'ASML cites advanced logic demand and DRAM/HBM investment; TSMC is modeled as a leading advanced logic customer.',
    },
    {
      id: 'asml-to-memory',
      from: 'asml',
      to: 'sk-hynix',
      kind: 'supplies_equipment_to',
      label: 'DRAM and HBM lithography exposure',
      confidence: 'inferred',
      sourceIds: sourceIds('asml-2025-annual'),
      note: 'ASML says memory momentum is fueled by HBM and DDR5 investment for AI-related applications.',
    },
    {
      id: 'asml-to-micron',
      from: 'asml',
      to: 'micron',
      kind: 'supplies_equipment_to',
      label: 'DRAM and HBM lithography exposure',
      confidence: 'inferred',
      sourceIds: sourceIds('asml-2025-annual'),
      note: 'Modeled as memory-equipment exposure, not a disclosed purchase order.',
    },
    {
      id: 'tsmc-to-cowos',
      from: 'tsmc',
      to: 'cowos',
      kind: 'depends_on',
      label: 'Advanced package platform',
      confidence: 'direct',
      sourceIds: sourceIds('tsmc-cowos'),
      note: 'TSMC describes CoWoS as a package technology for AI and supercomputing with logic and HBM cubes.',
    },
    {
      id: 'tsmc-to-nvidia',
      from: 'tsmc',
      to: 'nvidia',
      kind: 'fabricates_for',
      label: 'AI GPU logic and packaging path',
      confidence: 'direct',
      sourceIds: sourceIds('tsmc-cowos', 'nvidia-fy2026'),
      note: 'TSMC documents NVIDIA products in its CoWoS history; NVIDIA reports data-center growth driven by accelerated computing and AI.',
    },
    {
      id: 'cowos-to-nvidia',
      from: 'cowos',
      to: 'nvidia',
      kind: 'packages_with',
      label: 'Logic plus HBM on interposer',
      confidence: 'direct',
      sourceIds: sourceIds('tsmc-cowos'),
      note: 'CoWoS integrates functional top die with HBM cubes for AI and supercomputing applications.',
    },
    {
      id: 'sk-hynix-to-nvidia',
      from: 'sk-hynix',
      to: 'nvidia',
      kind: 'supplies_memory_to',
      label: 'HBM technology partnership',
      confidence: 'direct',
      sourceIds: sourceIds('sk-hynix-nvidia-2026'),
      note: 'SK hynix and NVIDIA announced a multi-year technology partnership for memory used in AI factories.',
    },
    {
      id: 'micron-to-nvidia',
      from: 'micron',
      to: 'nvidia',
      kind: 'supplies_memory_to',
      label: 'HBM3E and SOCAMM in NVIDIA platforms',
      confidence: 'direct',
      sourceIds: sourceIds('micron-nvidia-gtc-2025'),
      note: 'Micron says HBM3E products are designed into NVIDIA HGX B200/B300 and GB200/GB300 platforms.',
    },
    {
      id: 'samsung-to-nvidia',
      from: 'samsung',
      to: 'nvidia',
      kind: 'supplies_memory_to',
      label: 'HBM qualification path',
      confidence: 'inferred',
      sourceIds: sourceIds('trendforce-dram-1q26'),
      note: 'Samsung is a major DRAM supplier; specific NVIDIA platform exposure should be treated as a research follow-up.',
    },
    {
      id: 'nvidia-to-amazon',
      from: 'nvidia',
      to: 'amazon',
      kind: 'sells_accelerators_to',
      label: 'AWS GPU instances and AI infrastructure',
      confidence: 'direct',
      sourceIds: sourceIds('amazon-2025-annual', 'nvidia-fy2026'),
      note: 'Amazon describes a strong NVIDIA partnership for AWS AI, while also shifting some inference to Trainium.',
    },
    {
      id: 'nvidia-to-google',
      from: 'nvidia',
      to: 'google',
      kind: 'sells_accelerators_to',
      label: 'Google Cloud NVIDIA GPU portfolio',
      confidence: 'direct',
      sourceIds: sourceIds('alphabet-q1-2026', 'nvidia-fy2026'),
      note: 'Alphabet says NVIDIA GPUs are core to its accelerator portfolio and that it will offer Vera Rubin NVL72 instances.',
    },
    {
      id: 'nvidia-to-microsoft',
      from: 'nvidia',
      to: 'microsoft',
      kind: 'sells_accelerators_to',
      label: 'Azure GPU supply for AI demand',
      confidence: 'direct',
      sourceIds: sourceIds('microsoft-q3-fy2026', 'nvidia-fy2026'),
      note: 'Microsoft says roughly two thirds of Q3 FY2026 capex was short-lived assets, primarily GPUs and CPUs.',
    },
    {
      id: 'nvidia-to-meta',
      from: 'nvidia',
      to: 'meta',
      kind: 'sells_accelerators_to',
      label: 'AI cluster component exposure',
      confidence: 'inferred',
      sourceIds: sourceIds('meta-q1-2026', 'nvidia-fy2026'),
      note: 'Meta cites component pricing and data-center costs in capex guidance; NVIDIA GPU exposure is modeled rather than directly itemized here.',
    },
    {
      id: 'amazon-2026-capex',
      from: 'amazon',
      to: 'nvidia',
      kind: 'buys_compute_for',
      label: 'AWS AI infrastructure commitments',
      confidence: 'direct',
      sourceIds: sourceIds('amazon-2025-annual'),
      note: 'Amazon says it is investing approximately USD 200B in 2026 capex, backed by customer commitments.',
      value: 200,
      unit: 'USD billions',
      period: '2026 capex plan',
    },
    {
      id: 'alphabet-2026-capex',
      from: 'google',
      to: 'nvidia',
      kind: 'buys_compute_for',
      label: 'Google AI infrastructure capex guide',
      confidence: 'direct',
      sourceIds: sourceIds('alphabet-q1-2026'),
      note: 'Alphabet updated full-year 2026 capex guidance to USD 180B to USD 190B; this flow uses the high end.',
      value: 190,
      unit: 'USD billions',
      period: 'FY2026 capex high end',
    },
    {
      id: 'microsoft-q3-fy26-capex',
      from: 'microsoft',
      to: 'nvidia',
      kind: 'buys_compute_for',
      label: 'Azure quarterly AI/cloud capex',
      confidence: 'direct',
      sourceIds: sourceIds('microsoft-q3-fy2026'),
      note: 'Microsoft Q3 FY2026 capex was USD 31.9B; roughly two thirds was for short-lived assets, primarily GPUs and CPUs.',
      value: 31.9,
      unit: 'USD billions',
      period: 'Q3 FY2026 capex',
    },
    {
      id: 'meta-2026-capex',
      from: 'meta',
      to: 'nvidia',
      kind: 'buys_compute_for',
      label: 'Meta AI infrastructure capex guide',
      confidence: 'direct',
      sourceIds: sourceIds('meta-q1-2026'),
      note: 'Meta guided 2026 capex to USD 125B to USD 145B; this flow uses the midpoint.',
      value: 135,
      unit: 'USD billions',
      period: 'FY2026 capex midpoint',
    },
  ],
}

const confidenceRank: Record<GraphConfidence, number> = {
  direct: 0,
  inferred: 1,
  modeled: 2,
}

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]))

export function findTraversalPath(
  graph: MemoryChipGraph,
  fromId: string,
  toId: string,
  maxDepth = 5
): TraversalPath | null {
  const nodes = byId(graph.nodes)
  const adjacency = new Map<string, GraphEdge[]>()

  for (const edge of graph.edges) {
    const current = adjacency.get(edge.from) ?? []
    current.push(edge)
    adjacency.set(edge.from, current)
  }

  const queue: { nodeId: string; edgePath: GraphEdge[] }[] = [{ nodeId: fromId, edgePath: [] }]
  const seen = new Set<string>([fromId])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    if (current.nodeId === toId) {
      const pathNodeIds = [fromId, ...current.edgePath.map((edge) => edge.to)]
      const pathNodes = pathNodeIds.map((id) => nodes.get(id)).filter((node): node is GraphNode => Boolean(node))
      return {
        nodes: pathNodes,
        edges: current.edgePath,
        confidence: current.edgePath.reduce<GraphConfidence>(
          (worst, edge) => (confidenceRank[edge.confidence] > confidenceRank[worst] ? edge.confidence : worst),
          'direct'
        ),
      }
    }

    if (current.edgePath.length >= maxDepth) continue

    for (const edge of adjacency.get(current.nodeId) ?? []) {
      if (seen.has(edge.to)) continue
      seen.add(edge.to)
      queue.push({ nodeId: edge.to, edgePath: [...current.edgePath, edge] })
    }
  }

  return null
}

export function buildCompanyProfile(graph: MemoryChipGraph, companyId: string): CompanyProfile {
  const node = graph.nodes.find((item) => item.id === companyId)
  if (!node) {
    throw new Error(`Unknown graph node: ${companyId}`)
  }

  const sourceMap = byId(graph.sources)
  const upstream = graph.edges.filter((edge) => edge.to === companyId)
  const downstream = graph.edges.filter((edge) => edge.from === companyId)
  const peers = graph.edges.filter(
    (edge) => edge.kind === 'competes_with' && (edge.from === companyId || edge.to === companyId)
  )
  const sourceIdsForProfile = new Set<string>([
    ...(node.metrics ?? []).map((metric) => metric.sourceId),
    ...upstream.flatMap((edge) => edge.sourceIds),
    ...downstream.flatMap((edge) => edge.sourceIds),
  ])

  return {
    node,
    upstream,
    downstream,
    peers,
    metrics: node.metrics ?? [],
    sources: Array.from(sourceIdsForProfile)
      .map((sourceId) => sourceMap.get(sourceId))
      .filter((source): source is GraphSource => Boolean(source)),
  }
}

export function buildSankeyFlows(graph: MemoryChipGraph, edgeIds: string[]): SankeyFlowGroup {
  const edgeMap = byId(graph.edges)
  const selected = edgeIds.map((edgeId) => edgeMap.get(edgeId)).filter((edge): edge is GraphEdge => Boolean(edge))
  const totalValue = selected.reduce((sum, edge) => sum + Math.max(0, edge.value ?? 0), 0)
  const unit = selected.find((edge) => edge.unit)?.unit ?? ''

  return {
    totalValue: Math.round(totalValue * 10) / 10,
    unit,
    items: selected
      .map((edge) => {
        const value = Math.max(0, edge.value ?? 0)
        const percent = totalValue > 0 ? (value / totalValue) * 100 : 0
        return {
          ...edge,
          percent,
          width: Math.max(12, percent),
        }
      })
      .sort((a, b) => b.value! - a.value!),
  }
}
