// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { TargetStudy } from './target-study'

afterEach(cleanup)

it('lets readers choose any cue without changing experiment values or focus', () => {
  const { getByRole, getAllByRole } = render(<TargetStudy />)
  const controls = getAllByRole('slider') as HTMLInputElement[]
  const initial = controls.map(control => control.value)
  const targetButton = getByRole('button', { name: 'Frequency' })
  targetButton.focus()
  fireEvent.click(targetButton)
  expect(targetButton.getAttribute('aria-pressed')).toBe('true')
  expect(document.activeElement).toBe(targetButton)
  expect(controls.map(control => control.value)).toEqual(initial)
  expect(controls.map(control => control.dataset.signalControl)).toEqual(['amplitude', 'frequency', 'damping'])
})

it('edits only the selected parameter and updates the actual plotted signal', () => {
  const { container, getAllByRole } = render(<TargetStudy />)
  const before = container.querySelector('polyline')?.getAttribute('points')
  const controls = getAllByRole('slider') as HTMLInputElement[]
  fireEvent.change(controls[1], { target: { value: '2' } })
  expect(controls.map(control => control.value)).toEqual(['1', '2', '0.6'])
  expect(container.querySelector('polyline')?.getAttribute('points')).not.toEqual(before)
})
