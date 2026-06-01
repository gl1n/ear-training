import { describe, expect, it } from 'vitest'
import type { ArcadeBestRecord } from './arcadeBestRecord'
import { clearAllTrainingStats, hasPersistedTrainingStats } from './trainingStats'
import type { MistakeStatsStore } from './mistakeStats'
import type { WeakPriorityItem } from './quizPriority'

describe('hasPersistedTrainingStats', () => {
  it('is false when all stores are empty', () => {
    expect(hasPersistedTrainingStats([], [], null)).toBe(false)
  })

  it('is true when any store has data', () => {
    const mistakes: MistakeStatsStore = [60]
    const weakItems = [] as WeakPriorityItem[]
    const bestRecord = null as ArcadeBestRecord | null

    expect(hasPersistedTrainingStats(mistakes, weakItems, bestRecord)).toBe(true)
    expect(hasPersistedTrainingStats([], [{ key: 'a', level: 2, quiz: {} as never }], null)).toBe(
      true,
    )
    expect(hasPersistedTrainingStats([], [], { correctCount: 3 })).toBe(true)
  })
})

describe('clearAllTrainingStats', () => {
  it('does not throw when localStorage is unavailable', () => {
    expect(() => clearAllTrainingStats()).not.toThrow()
  })
})
