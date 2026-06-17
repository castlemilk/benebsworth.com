'use client'

import { useEffect, useState, useCallback } from 'react'
import { groupedSamples } from '@/lib/lab/circuit-sim/samples'
import { listSaved, saveCircuit, deleteSaved, type SavedCircuit } from '@/lib/lab/circuit-sim/storage'

interface Props {
  open: boolean
  onClose: () => void
  onLoad: (yaml: string) => void
  /** Returns the current circuit serialized to YAML, for "Save". */
  getCurrentYaml: () => string
}

type Tab = 'examples' | 'mine'

export function GalleryDialog({ open, onClose, onLoad, getCurrentYaml }: Props) {
  const [tab, setTab] = useState<Tab>('examples')
  const [saved, setSaved] = useState<SavedCircuit[]>([])
  const [name, setName] = useState('')

  useEffect(() => { if (open) setSaved(listSaved()) }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const load = useCallback((yaml: string) => { onLoad(yaml); onClose() }, [onLoad, onClose])

  const doSave = useCallback(() => {
    if (!name.trim()) return
    setSaved(saveCircuit(name.trim(), getCurrentYaml(), Date.now()))
    setName('')
  }, [name, getCurrentYaml])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-[#1b2a38] bg-[#0a1118] shadow-2xl overflow-hidden">
        {/* Header + tabs */}
        <div className="flex items-center gap-2 border-b border-[#13202c] px-4 py-3">
          <span className="text-sm font-mono text-[#cfe3ee]">Circuit Library</span>
          <div className="ml-3 flex gap-1">
            <TabBtn active={tab === 'examples'} onClick={() => setTab('examples')}>Examples</TabBtn>
            <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')}>My Circuits</TabBtn>
          </div>
          <button onClick={onClose} className="ml-auto text-[#5c8294]/60 hover:text-[#cfe3ee] text-lg leading-none px-1">×</button>
        </div>

        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {tab === 'examples' && groupedSamples().map(group => (
            <div key={group.category} className="flex flex-col gap-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#22c8ee]/70">{group.category}</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {group.samples.map(s => (
                  <button
                    key={s.name}
                    onClick={() => load(s.yaml)}
                    className="text-left rounded-lg border border-[#13202c] bg-[#0c141d] px-3 py-2 hover:border-[#22c8ee]/40 hover:bg-[#101a26] transition-colors"
                  >
                    <span className="block text-[12px] font-mono text-[#cfe3ee]/90 leading-tight">{s.name}</span>
                    <span className="block text-[10px] font-mono text-[#7aa0b2]/60 leading-snug mt-0.5">{s.lookFor}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {tab === 'mine' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') doSave() }}
                  placeholder="Name this circuit…"
                  className="flex-1 min-w-0 px-3 py-1.5 text-[12px] font-mono bg-[#101822] border border-[#1b2a38] rounded-lg text-[#cfe3ee] placeholder:text-[#5c8294]/40 focus:outline-none focus:border-[#22c8ee]/60"
                />
                <button
                  onClick={doSave}
                  disabled={!name.trim()}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-mono bg-[#22c8ee]/15 text-[#22c8ee] border border-[#22c8ee]/40 disabled:opacity-30 hover:bg-[#22c8ee]/25 transition-colors"
                >
                  Save current
                </button>
              </div>
              {saved.length === 0 ? (
                <p className="text-[11px] font-mono text-[#5c8294]/50 py-6 text-center">
                  No saved circuits yet. Build one, then save it here — it stays in this browser.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {saved.map(s => (
                    <div key={s.name} className="flex items-center gap-2 rounded-lg border border-[#13202c] bg-[#0c141d] px-3 py-2">
                      <button onClick={() => load(s.yaml)} className="flex-1 min-w-0 text-left text-[12px] font-mono text-[#cfe3ee]/90 hover:text-[#22c8ee] truncate">
                        {s.name}
                      </button>
                      <button onClick={() => setSaved(deleteSaved(s.name))} className="text-[#5c8294]/50 hover:text-red-400 text-[12px]">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors border ${
        active ? 'bg-[#22c8ee]/15 text-[#22c8ee] border-[#22c8ee]/40' : 'bg-transparent text-[#7aa0b2]/70 border-transparent hover:bg-[#142233]'
      }`}
    >
      {children}
    </button>
  )
}
