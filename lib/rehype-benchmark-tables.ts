import type { Element, Root } from 'hast'
import { SKIP, visit } from 'unist-util-visit'

const scoreHeaders = new Set(['Benchmark score (%)', 'RULER context (tokens)'])
const scoreText = /^\d{1,3}(?:\.\d+)?%?$/

function textContent(node: Root['children'][number]): string {
  if (node.type === 'text') return node.value
  return node.type === 'element' ? node.children.map(textContent).join('') : ''
}

function elements(parent: Element, tag: string): Element[] {
  return parent.children.filter((child): child is Element => child.type === 'element' && child.tagName === tag)
}

export function rehypeBenchmarkTables({ wrap = false } = {}) {
  return (tree: Root) => {
    visit(tree, 'element', (table, index, parent) => {
      if (table.tagName !== 'table') return
      const [head] = elements(table, 'thead')
      const [body] = elements(table, 'tbody')
      const heading = head && elements(head, 'tr')[0]
      const label = heading && elements(heading, 'th')[0]
      if (!label || !body || !scoreHeaders.has(textContent(label).trim())) return

      table.properties.className = ['benchmark-score-table']
      for (const row of elements(body, 'tr')) {
        const [rowLabel, ...cells] = elements(row, 'td')
        const scores = cells.flatMap(cell => {
          const number = textContent(cell).trim()
          const value = Number.parseFloat(number)
          return scoreText.test(number) && value <= 100 ? [{ cell, value }] : []
        })
        if (!rowLabel || scores.length < 2) continue
        rowLabel.tagName = 'th'
        rowLabel.properties.scope = 'row'
        const best = Math.max(...scores.map(({ value }) => value))
        for (const { cell, value } of scores) {
          if (value === best) {
            cell.properties.dataBenchmarkBest = ''
            cell.children.push({
              type: 'element', tagName: 'span', properties: { className: ['benchmark-best-label'] },
              children: [{ type: 'text', value: 'Best' }],
            })
          }
          cell.children.push({
            type: 'element', tagName: 'span',
            properties: { className: ['benchmark-score-track'], ariaHidden: 'true' },
            children: [{
              type: 'element', tagName: 'span', properties: { style: `width:${value}%` }, children: [],
            }],
          })
        }
      }

      if (wrap && parent && index !== undefined) {
        parent.children[index] = {
          type: 'element', tagName: 'div',
          properties: {
            className: ['benchmark-table-scroll'], role: 'region', tabIndex: 0,
            ariaLabel: 'Benchmark scores, horizontally scrollable',
          },
          children: [table],
        }
      }
      return SKIP
    })
  }
}
