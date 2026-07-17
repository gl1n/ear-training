/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fretboardRegionEdgeClasses } from './fretboardRegionStyles'

describe('fretboard question region styling', () => {
  const region = { stringStart: 1, fretStart: 4 }
  const classesAt = (stringIndex: number, fret: number) => (
    fretboardRegionEdgeClasses({ stringIndex, fret }, region, true).split(' ').filter(Boolean)
  )

  it('outlines only the outside edges of a 3 by 4 question region', () => {
    expect(classesAt(1, 4)).toEqual([
      'fretboard-cell--region-edge',
      'fretboard-cell--region-top',
      'fretboard-cell--region-left',
    ])
    expect(classesAt(1, 5)).toEqual([
      'fretboard-cell--region-edge',
      'fretboard-cell--region-top',
    ])
    expect(classesAt(2, 5)).toEqual(['fretboard-cell--region-edge'])
    expect(classesAt(3, 7)).toEqual([
      'fretboard-cell--region-edge',
      'fretboard-cell--region-bottom',
      'fretboard-cell--region-right',
    ])
  })

  it('does not draw a region outline in full-fretboard mode', () => {
    expect(fretboardRegionEdgeClasses({ stringIndex: 1, fret: 4 }, region, false)).toBe('')
  })

  it('does not restore a per-cell shadow that creates internal grid lines', () => {
    const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
    const activeRule = css.match(/\.fretboard-cell--active\s*\{([^}]*)\}/)?.[1]

    expect(activeRule).toBeDefined()
    expect(activeRule).not.toContain('box-shadow')
    expect(css).toContain('.fretboard-cell--region-edge::before')
    expect(css).toContain('.fretboard-cell--region-top::before { border-top-width: 1px; }')
    expect(css).toContain('.fretboard-cell--region-right::before { border-right-width: 1px; }')
    expect(css).toContain('.fretboard-cell--region-bottom::before { border-bottom-width: 1px; }')
    expect(css).toContain('.fretboard-cell--region-left::before { border-left-width: 1px; }')
  })
})
