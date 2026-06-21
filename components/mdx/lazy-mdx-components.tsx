'use client'
import dynamic from 'next/dynamic'

const loading = () => null

export const IngressFlowBasic = dynamic(() => import('./istio-flows').then(m => ({ default: m.IngressFlowBasic })), { ssr: false, loading })
export const EgressFlowBasic = dynamic(() => import('./istio-flows').then(m => ({ default: m.EgressFlowBasic })), { ssr: false, loading })
export const EgressFlowAdvanced = dynamic(() => import('./istio-flows').then(m => ({ default: m.EgressFlowAdvanced })), { ssr: false, loading })

export const FfnnFlow = dynamic(() => import('./neural-graphs').then(m => ({ default: m.FfnnFlow })), { ssr: false, loading })
export const RnnFlow = dynamic(() => import('./neural-graphs').then(m => ({ default: m.RnnFlow })), { ssr: false, loading })
export const LstmFlow = dynamic(() => import('./neural-graphs').then(m => ({ default: m.LstmFlow })), { ssr: false, loading })
export const VaeFlow = dynamic(() => import('./neural-graphs').then(m => ({ default: m.VaeFlow })), { ssr: false, loading })
export const GanFlow = dynamic(() => import('./neural-graphs').then(m => ({ default: m.GanFlow })), { ssr: false, loading })
export const TransformerFlow = dynamic(() => import('./neural-graphs').then(m => ({ default: m.TransformerFlow })), { ssr: false, loading })

export const LabCanvas = dynamic(() => import('./lab-canvas').then(m => ({ default: m.LabCanvas })), { ssr: false, loading })
export const LabSide = dynamic(() => import('./lab-canvas').then(m => ({ default: m.LabSide })), { ssr: false, loading })

export const ColorLegend = dynamic(() => import('./color-legend').then(m => ({ default: m.ColorLegend })), { ssr: false, loading })
export const ZooMiniMap = dynamic(() => import('./zoo-mini-map').then(m => ({ default: m.ZooMiniMap })), { ssr: false, loading })
export const PllDiagram = dynamic(() => import('./pll-diagram').then(m => ({ default: m.PllDiagram })), { ssr: false, loading })
export const AttentionHeatmap = dynamic(() => import('./attention-heatmap').then(m => ({ default: m.AttentionHeatmap })), { ssr: false, loading })
export const SoftmaxLab = dynamic(() => import('./softmax-lab').then(m => ({ default: m.SoftmaxLab })), { ssr: false, loading })
export const TokenSampler = dynamic(() => import('./token-sampler').then(m => ({ default: m.TokenSampler })), { ssr: false, loading })
export const MoEBlock = dynamic(() => import('./moe-block').then(m => ({ default: m.MoEBlock })), { ssr: false, loading })
export const HashTableDemo = dynamic(() => import('./hash-table-demo').then(m => ({ default: m.HashTableDemo })), { ssr: false, loading })
export const StorageEngineSim = dynamic(() => import('./storage-engine-sim').then(m => ({ default: m.StorageEngineSim })), { ssr: false, loading })

export const KvCacheCompressor = dynamic(() => import('./kv-cache-compressor').then(m => ({ default: m.KvCacheCompressor })), { ssr: false, loading })
export const KvQuantDial = dynamic(() => import('./kv-quant-dial').then(m => ({ default: m.KvQuantDial })), { ssr: false, loading })
export const KvEvictionWindow = dynamic(() => import('./kv-eviction-window').then(m => ({ default: m.KvEvictionWindow })), { ssr: false, loading })
export const KvAblationLedger = dynamic(() => import('./kv-ablation-ledger').then(m => ({ default: m.KvAblationLedger })), { ssr: false, loading })
export const KvContextHistogram = dynamic(() => import('./kv-context-histogram').then(m => ({ default: m.KvContextHistogram })), { ssr: false, loading })
