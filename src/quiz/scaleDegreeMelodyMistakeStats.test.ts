import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  aggregateTopMelodyPatterns,
  clearScaleDegreeMelodyMistakeStats,
  loadScaleDegreeMelodyMistakeStats,
  MAX_RECENT_MELODY_MISTAKES,
  recordScaleDegreeMelodyMistake,
  saveScaleDegreeMelodyMistakeStats,
  SCALE_DEGREE_MELODY_MISTAKE_STATS_SCHEMA_VERSION,
  weightedRandomMelodyQuizFromMistakes,
  type ScaleDegreeMelodyMistakeStatsStore,
} from './scaleDegreeMelodyMistakeStats'
import { STORAGE_KEYS } from './storageKeys'

const STORAGE_KEY = STORAGE_KEYS.scaleDegreeMelodyMistakeStats
const SCHEMA_KEY = STORAGE_KEYS.scaleDegreeMelodyMistakeStatsSchema

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

describe('scale degree melody mistake persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips records through localStorage', () => {
    const localStorage = createLocalStorageMock({
      [SCHEMA_KEY]: String(SCALE_DEGREE_MELODY_MISTAKE_STATS_SCHEMA_VERSION),
    })
    vi.stubGlobal('localStorage', localStorage)

    const store: ScaleDegreeMelodyMistakeStatsStore = [{ pattern: '1-3-5' }]
    saveScaleDegreeMelodyMistakeStats(store)

    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store))
    expect(loadScaleDegreeMelodyMistakeStats()).toEqual(store)
  })

  it('clears stored records', () => {
    const localStorage = createLocalStorageMock({
      [STORAGE_KEY]: JSON.stringify([{ pattern: '2-4-6' }]),
      [SCHEMA_KEY]: String(SCALE_DEGREE_MELODY_MISTAKE_STATS_SCHEMA_VERSION),
    })
    vi.stubGlobal('localStorage', localStorage)

    clearScaleDegreeMelodyMistakeStats()

    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(loadScaleDegreeMelodyMistakeStats()).toEqual([])
  })
})

describe('aggregateTopMelodyPatterns', () => {
  it('returns top patterns by count with ratios', () => {
    const store: ScaleDegreeMelodyMistakeStatsStore = [
      { pattern: '1-3-5' },
      { pattern: '1-3-5' },
      { pattern: '2-4-6' },
      { pattern: '3-5-7' },
    ]

    expect(aggregateTopMelodyPatterns(store, 10)).toEqual([
      { pattern: '1-3-5', count: 2, ratio: 0.5 },
      { pattern: '2-4-6', count: 1, ratio: 0.25 },
      { pattern: '3-5-7', count: 1, ratio: 0.25 },
    ])
  })

  it('limits results to the requested count', () => {
    const store: ScaleDegreeMelodyMistakeStatsStore = Array.from({ length: 12 }, (_, index) => ({
      pattern: `${index + 1}-${((index + 1) % 7) + 1}-${((index + 2) % 7) + 1}`,
    }))

    expect(aggregateTopMelodyPatterns(store, 10)).toHaveLength(10)
  })
})

describe('recordScaleDegreeMelodyMistake', () => {
  it('caps the store at MAX_RECENT_MELODY_MISTAKES', () => {
    const store: ScaleDegreeMelodyMistakeStatsStore = []

    for (let i = 0; i < MAX_RECENT_MELODY_MISTAKES + 5; i++) {
      recordScaleDegreeMelodyMistake(store, { pattern: '1-2-3' })
    }

    expect(store).toHaveLength(MAX_RECENT_MELODY_MISTAKES)
    expect(store[0]).toEqual({ pattern: '1-2-3' })
  })

  it('ignores invalid patterns', () => {
    const store: ScaleDegreeMelodyMistakeStatsStore = []

    recordScaleDegreeMelodyMistake(store, { pattern: '1-2' })

    expect(store).toHaveLength(0)
  })
})

describe('weightedRandomMelodyQuizFromMistakes', () => {
  const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }

  it('returns a quiz matching the chosen pattern degrees', () => {
    const store: ScaleDegreeMelodyMistakeStatsStore = [{ pattern: '1-3-5' }]

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quiz = weightedRandomMelodyQuizFromMistakes(store, session, 48, 85, 60)
    expect(quiz).not.toBeNull()
    expect(quiz!.degrees.join('-')).toBe('1-3-5')

    vi.restoreAllMocks()
  })
})
