import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAllTrainingStats, hasPersistedTrainingStats } from './trainingStats'
import type { MistakeStatsStore } from './mistakeStats'
import type { ScaleDegreeMistakeStatsStore } from './scaleDegreeMistakeStats'
import type { ScaleDegreeSessionRecord } from './scaleDegreeSessionHistory'

describe('hasPersistedTrainingStats', () => {
  it('is false when all stores are empty', () => {
    expect(hasPersistedTrainingStats([], null)).toBe(false)
    expect(
      hasPersistedTrainingStats([], null, null, [], []),
    ).toBe(false)
  })

  it('is true when interval mistakes exist', () => {
    const mistakes: MistakeStatsStore = [{ root: 60 }]
    expect(hasPersistedTrainingStats(mistakes, null)).toBe(true)
  })

  it('is true when interval speed best record exists', () => {
    expect(hasPersistedTrainingStats([], { correctCount: 3 })).toBe(true)
  })

  it('is true when scale degree best record exists', () => {
    expect(
      hasPersistedTrainingStats([], null, { correctCount: 2 }),
    ).toBe(true)
  })

  it('is true when scale degree mistake stats exist', () => {
    const scaleDegreeMistakes: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 3, wrongDegree: '1' },
    ]

    expect(
      hasPersistedTrainingStats([], null, null, scaleDegreeMistakes, []),
    ).toBe(true)
  })

  it('is true when scale degree session history exists', () => {
    const history: ScaleDegreeSessionRecord[] = [{ correctCount: 4, totalScore: 2, at: 1 }]

    expect(
      hasPersistedTrainingStats([], null, null, [], history),
    ).toBe(true)
  })
})

describe('clearAllTrainingStats', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not throw when localStorage is unavailable', () => {
    expect(() => clearAllTrainingStats()).not.toThrow()
  })
})
