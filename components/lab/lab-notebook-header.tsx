import Link from 'next/link'
import { ArrowUpRight, ArrowDown } from 'lucide-react'
import { LabCard } from './lab-card'
import { CategoryIcon } from './category-icon'

const tools = [
  { href: '/lab/llm-benchmark/', title: 'LLM Benchmark', detail: 'Code, reasoning & UI tasks' },
  { href: '/lab/harness-eval/', title: 'Harness Eval', detail: 'Fast, deep & hard suites' },
  { href: '/lab/cost-dashboard/', title: 'Cost & Model Dashboard', detail: 'Tokens, budgets & duration' },
  { href: '/lab/carbon/', title: 'Carbon Capture Research', detail: 'Cited pathways & trade-offs' },
]

export function LabNotebookHeader() {
  return (
    <section className="lab-notebook-opening" aria-labelledby="lab-heading">
      <header className="lab-notebook-title">
        <p className="type-label text-muted">Field notes / interactive experiments</p>
        <h1 id="lab-heading">Ideas you can<br /><em>put your hands on.</em></h1>
        <p className="lab-notebook-intro">A working notebook of mathematics, physics and engineering. Change a parameter, follow the pattern, then read the idea behind it.</p>
      </header>
      <div className="lab-notebook-desk">
        <Link href="/lab/wave-superposition/" className="lab-notebook-feature">
          <div className="lab-notebook-feature-meta"><span>Start exploring</span><span className="lab-notebook-topic"><CategoryIcon category="physics" fallback="" /> Physics</span></div>
          <LabCard slug="wave-superposition" />
          <div className="lab-notebook-feature-caption"><h2>Wave Superposition</h2><ArrowUpRight aria-hidden="true" size={18} /></div>
          <p>Two waves. One changing pattern. Explore interference, beats and standing waves.</p>
        </Link>
        <aside className="lab-notebook-index" aria-labelledby="lab-tools-heading">
          <p className="lab-notebook-note">Try changing one thing.<svg aria-hidden="true" viewBox="0 0 160 40"><path d="M4 8 Q80 38 145 16 M133 12 L148 15 L139 27" /></svg></p>
          <h2 id="lab-tools-heading">Research &amp; tools</h2>
          <ol>{tools.map((tool, index) => <li key={tool.href}><Link href={tool.href}><span className="lab-notebook-number" aria-hidden="true">0{index + 1}</span><span><strong>{tool.title}</strong><small>{tool.detail}</small></span><ArrowUpRight aria-hidden="true" size={18} /></Link></li>)}</ol>
          <a className="lab-notebook-browse" href="#experiment-index">Browse the experiment index <ArrowDown aria-hidden="true" size={16} /></a>
        </aside>
      </div>
    </section>
  )
}
