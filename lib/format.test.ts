import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { fmtDate } from './format'

const dates = [
  ['2026-11-10T07:00:00.000Z', '10 NOV 2026'],
  ['2026-11-10T13:00:00.000Z', '11 NOV 2026'], // Melbourne daylight saving.
  ['2026-07-13T14:00:00.000Z', '14 JULY 2026'], // Melbourne standard time.
  ['2020-07-03T22:12:03.284Z', '04 JULY 2020'], // Preserve legacy publication dates.
] as const
const formatModule = new URL('./format.ts', import.meta.url).href

function inTimezone(timeZone: string, source: string) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], {
    env: { ...process.env, TZ: timeZone, NODE_ENV: 'production' },
    encoding: 'utf8',
    timeout: 10_000,
  })
  expect(result.error).toBeUndefined()
  expect(result.status, result.stderr).toBe(0)
  return JSON.parse(result.stdout)
}

describe('publication dates', () => {
  it('uses the Melbourne calendar across daylight saving and keeps invalid input readable', () => {
    for (const [iso, expected] of dates) expect(fmtDate(iso)).toBe(expected)
    expect(fmtDate('unparseable-date')).toBe('unparseabl')
  })

  it('renders the same date in UTC, Los Angeles and Melbourne, then hydrates without text recovery', () => {
    const render = `
      import { createElement } from 'react';
      import { renderToString } from 'react-dom/server';
      import { fmtDate } from ${JSON.stringify(formatModule)};
      const dates = ${JSON.stringify(dates)};
      console.log(JSON.stringify({
        dates: dates.map(([iso]) => fmtDate(iso)),
        html: renderToString(createElement('div', null, dates.map(([iso]) => createElement('time', { key: iso, dateTime: iso }, fmtDate(iso))))),
      }));
    `
    const server = inTimezone('UTC', render)
    expect(server.dates).toEqual(dates.map(([, expected]) => expected))
    for (const zone of ['America/Los_Angeles', 'Australia/Melbourne']) {
      expect(inTimezone(zone, render)).toEqual(server)
    }

    const hydrated = inTimezone('America/Los_Angeles', `
      import { JSDOM } from 'jsdom';
      import { fmtDate } from ${JSON.stringify(formatModule)};
      const dom = new JSDOM('<!doctype html><div id="root">' + ${JSON.stringify(server.html)} + '</div>');
      globalThis.window = dom.window;
      globalThis.document = dom.window.document;
      const { createElement, useEffect } = await import('react');
      const { hydrateRoot } = await import('react-dom/client');
      const dates = ${JSON.stringify(dates)};
      const errors = [];
      let root;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Hydration did not finish')), 5000);
        function PublicationDate() {
          useEffect(() => { clearTimeout(timeout); resolve(); }, []);
          return createElement('div', null, dates.map(([iso]) => createElement('time', { key: iso, dateTime: iso }, fmtDate(iso))));
        }
        root = hydrateRoot(document.getElementById('root'), createElement(PublicationDate), {
          onRecoverableError: error => errors.push(error.message),
        });
      });
      console.log(JSON.stringify({ text: [...document.querySelectorAll('time')].map(node => node.textContent), errors }));
      root.unmount();
      dom.window.close();
    `)
    expect(hydrated).toEqual({ text: dates.map(([, expected]) => expected), errors: [] })
  }, 15_000)
})
