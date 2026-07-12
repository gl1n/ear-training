import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  aggregateByCorrectDegree,
  aggregateByDegreePair,
  aggregateByPreviousInterval,
  analyzeScaleDegreeWeaknesses,
  clearScaleDegreeMistakeStats,
  loadScaleDegreeMistakeStats,
  MAX_RECENT_MISTAKES,
  recordScaleDegreeMistake,
  saveScaleDegreeMistakeStats,
  SCALE_DEGREE_MISTAKE_STATS_SCHEMA_VERSION,
  weightedRandomScaleDegreeQuizFromMistakes,
  type ScaleDegreeMistakeStatsStore,
} from './scaleDegreeMistakeStats'
import { STORAGE_KEYS } from './storageKeys'

const STORAGE_KEY = STORAGE_KEYS.scaleDegreeMistakeStats
const SCHEMA_KEY = STORAGE_KEYS.scaleDegreeMistakeStatsSchema

function createLocalStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  }
}

describe('scale degree mistake persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips records through localStorage', () => {
    const localStorage = createLocalStorageMock({
      [SCHEMA_KEY]: String(SCALE_DEGREE_MISTAKE_STATS_SCHEMA_VERSION),
    })
    vi.stubGlobal('localStorage', localStorage)

    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 3, wrongDegree: '1' },
    ]
    saveScaleDegreeMistakeStats(store)

    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store))
    expect(loadScaleDegreeMistakeStats()).toEqual(store)
  })

  it('clears stored records', () => {
    const localStorage = createLocalStorageMock({
      [STORAGE_KEY]: JSON.stringify([
        { previousNoteMidi: 60, correctDegree: 2, wrongDegree: '4' },
      ]),
      [SCHEMA_KEY]: String(SCALE_DEGREE_MISTAKE_STATS_SCHEMA_VERSION),
    })
    vi.stubGlobal('localStorage', localStorage)

    clearScaleDegreeMistakeStats()

    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(loadScaleDegreeMistakeStats()).toEqual([])
  })
})

describe('aggregateByCorrectDegree', () => {
  it('counts mistakes per correct degree', () => {
    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 3, wrongDegree: '1' },
      { previousNoteMidi: 62, correctDegree: 3, wrongDegree: '5' },
      { previousNoteMidi: null, correctDegree: 5, wrongDegree: '4' },
    ]

    expect(aggregateByCorrectDegree(store)).toEqual([
      { degree: 1, count: 0 },
      { degree: 2, count: 0 },
      { degree: 3, count: 2 },
      { degree: 4, count: 0 },
      { degree: 5, count: 1 },
      { degree: 6, count: 0 },
      { degree: 7, count: 0 },
    ])
  })
})

describe('aggregateByDegreePair', () => {
  it('groups mistakes by correct and wrong degree with ratios', () => {
    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 2, wrongDegree: '6' },
      { previousNoteMidi: 62, correctDegree: 2, wrongDegree: '6' },
      { previousNoteMidi: null, correctDegree: 2, wrongDegree: '1' },
      { previousNoteMidi: 64, correctDegree: 5, wrongDegree: '4' },
    ]

    expect(aggregateByDegreePair(store)).toEqual([
      { correctDegree: 2, wrongDegree: 6, count: 2, ratio: 0.5 },
      { correctDegree: 2, wrongDegree: 1, count: 1, ratio: 0.25 },
      { correctDegree: 5, wrongDegree: 4, count: 1, ratio: 0.25 },
    ])
  })

  it('returns an empty list when there are no mistakes', () => {
    expect(aggregateByDegreePair([])).toEqual([])
  })
})

describe('advanced weakness analysis', () => {
  it('ranks recurring concentrated confusions and groups previous-note intervals', () => {
    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, targetNoteMidi: 64, correctDegree: 3, wrongDegree: '1' },
      { previousNoteMidi: 62, targetNoteMidi: 66, correctDegree: 3, wrongDegree: '1' },
      { previousNoteMidi: 60, targetNoteMidi: 62, correctDegree: 2, wrongDegree: '4' },
    ]

    expect(analyzeScaleDegreeWeaknesses(store)[0]).toMatchObject({
      degree: 3,
      count: 2,
      topWrongDegree: 1,
      confusionRate: 1,
    })
    expect(aggregateByPreviousInterval(store)[0]).toEqual({
      semitones: 4,
      count: 2,
      ratio: 2 / 3,
      correctDegrees: [3],
    })
  })
})

describe('recordScaleDegreeMistake', () => {
  it('caps the store at MAX_RECENT_MISTAKES', () => {
    const store: ScaleDegreeMistakeStatsStore = []

    for (let i = 0; i < MAX_RECENT_MISTAKES + 5; i++) {
      recordScaleDegreeMistake(store, {
        previousNoteMidi: 60,
        correctDegree: 1,
        wrongDegree: '2',
      })
    }

    expect(store).toHaveLength(MAX_RECENT_MISTAKES)
    expect(store[0]).toEqual({
      previousNoteMidi: 60,
      correctDegree: 1,
      wrongDegree: '2',
    })
  })

  it('ignores invalid records', () => {
    const store: ScaleDegreeMistakeStatsStore = []

    recordScaleDegreeMistake(store, {
      previousNoteMidi: 60,
      correctDegree: 8,
      wrongDegree: '2',
    })

    expect(store).toHaveLength(0)
  })
})

describe('weightedRandomScaleDegreeQuizFromMistakes', () => {
  const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }

  it('returns a quiz with the chosen mistake degree', () => {
    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 5, wrongDegree: '3' },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quiz = weightedRandomScaleDegreeQuizFromMistakes(store, session, 48, 85, 60)
    expect(quiz).not.toBeNull()
    expect(quiz!.degree).toBe(5)
    expect(quiz!.previousNoteMidi).toBe(60)

    vi.restoreAllMocks()
  })

  it('returns null when the degree is unavailable in the current key range', () => {
    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 5, wrongDegree: '3' },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quiz = weightedRandomScaleDegreeQuizFromMistakes(store, session, 60, 60, null)
    expect(quiz).toBeNull()

    vi.restoreAllMocks()
  })

  it('recreates a learned previous-note jump when it fits the current key', () => {
    const store: ScaleDegreeMistakeStatsStore = [
      { previousNoteMidi: 60, targetNoteMidi: 64, correctDegree: 3, wrongDegree: '1' },
    ]
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quiz = weightedRandomScaleDegreeQuizFromMistakes(store, session, 48, 85, 60)
    expect(quiz?.noteMidi).toBe(64)
    expect(quiz?.previousNoteMidi).toBe(60)
    vi.restoreAllMocks()
  })
})
