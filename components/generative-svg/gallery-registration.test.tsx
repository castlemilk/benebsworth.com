// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type * as Models from '@/lib/generative-svg/model'
import type { Study } from '@/lib/generative-svg/definition'

vi.mock('@/lib/generative-svg/model', async importOriginal => {
  const actual = await importOriginal<typeof Models>()
  const { createStudyRegistry } = await import('@/lib/generative-svg/registry')
  const definition: Study = {
    id: 'constructor', title: 'Registration boundary fixture', category: 'Mathematics',
    provenance: 'illustrative', description: 'A deterministic registration test fixture.',
    basis: 'Dimensionless line endpoints test valid identifiers without publishing another study.',
    tags: ['test-fixture'], aliases: ['registration fixture'],
    parameters: [
      { key: 'name', label: 'Model scale', min: 1, max: 3, step: 1, initial: 2 },
      { key: 'prototype', label: 'Model offset', min: 0, max: 2, step: 1, initial: 1 },
    ],
    model: p => ({ marks: [{ kind: 'line', role: 'ink', points: [[40, 80 + p.prototype * 20], [80 + p.name * 50, 160]] }] }),
  }
  const registry = createStudyRegistry([...actual.STUDIES, definition])
  return { ...actual, STUDY_REGISTRY: registry, STUDIES: registry.studies }
})

import { GenerativeGallery } from './gallery'
import { STUDY_REGISTRY } from '@/lib/generative-svg/model'
import { renderStudySvg } from '@/lib/generative-svg/render'

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/') })
const selected = () => screen.getByRole('region', { name: 'Selected study' })
const source = () => decodeURIComponent(within(selected()).getByRole('link', { name: 'Download SVG' }).getAttribute('href')!.split(',')[1])
const fixture = STUDY_REGISTRY.get('constructor')!

describe('registered study identity boundaries', () => {
  it('opens an inherited-property ID, retains own tuning and resets to model defaults', () => {
    render(<GenerativeGallery />)
    fireEvent.click(screen.getByRole('button', { name: `Open ${fixture.title}` }))
    expect((screen.getByLabelText('Model scale') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('Model offset') as HTMLInputElement).value).toBe('1')
    expect(source()).toBe(renderStudySvg(fixture))
    fireEvent.change(screen.getByLabelText('Model scale'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Model offset'), { target: { value: '2' } })
    const tuned = renderStudySvg(fixture, { name: 3, prototype: 2 })
    expect(source()).toBe(tuned)
    fireEvent.click(screen.getByRole('button', { name: 'Open Sine wave' }))
    fireEvent.click(screen.getByRole('button', { name: `Open ${fixture.title}` }))
    expect(source()).toBe(tuned)
    fireEvent.click(screen.getByRole('button', { name: 'Reset parameters' }))
    expect(source()).toBe(renderStudySvg(fixture))
  })

  it('opens the valid direct study link with aligned controls, preview and export', () => {
    window.history.replaceState(null, '', '/vectors/?study=constructor')
    render(<GenerativeGallery />)
    expect(within(selected()).getByRole('heading', { name: fixture.title })).toBeTruthy()
    expect((screen.getByLabelText('Model scale') as HTMLInputElement).value).toBe('2')
    expect(source()).toBe(renderStudySvg(fixture))
    expect(selected().querySelector('svg')?.isEqualNode(new DOMParser().parseFromString(source(), 'image/svg+xml').documentElement)).toBe(true)
  })
})
