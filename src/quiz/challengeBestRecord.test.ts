import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearChallengeBestRecord,
  loadChallengeBestRecord,
  tryUpdateChallengeBestRecord,
} from './challengeBestRecord'
import { STORAGE_KEYS } from './storageKeys'

const INTERVAL_SPEED_KEY = STORAGE_KEYS.challengeBest.intervalSpeed
const SCALE_DEGREE_KEY = STORAGE_KEYS.challengeBest.scaleDegree

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

describe('loadChallengeBestRecord', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when no record exists', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    expect(loadChallengeBestRecord('intervalSpeed')).toBeNull()
  })

  it('loads a valid record for each variant', () => {
    vi.stubGlobal(
      'localStorage',
      createLocalStorageMock({
        [INTERVAL_SPEED_KEY]: JSON.stringify({ correctCount: 5 }),
        [SCALE_DEGREE_KEY]: JSON.stringify({ correctCount: 8 }),
      }),
    )

    expect(loadChallengeBestRecord('intervalSpeed')).toEqual({ correctCount: 5 })
    expect(loadChallengeBestRecord('scaleDegree')).toEqual({ correctCount: 8 })
  })

  it('returns null for invalid stored data', () => {
    vi.stubGlobal(
      'localStorage',
      createLocalStorageMock({
        [INTERVAL_SPEED_KEY]: JSON.stringify({ correctCount: 'bad' }),
      }),
    )

    expect(loadChallengeBestRecord('intervalSpeed')).toBeNull()
  })
})

describe('tryUpdateChallengeBestRecord', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves a new record when none exists', () => {
    const localStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorage)

    const result = tryUpdateChallengeBestRecord({ correctCount: 4 }, 'intervalSpeed')

    expect(result).toEqual({ record: { correctCount: 4 }, isNew: true })
    expect(localStorage.setItem).toHaveBeenCalledWith(
      INTERVAL_SPEED_KEY,
      JSON.stringify({ correctCount: 4 }),
    )
  })

  it('updates when the candidate score is higher', () => {
    vi.stubGlobal(
      'localStorage',
      createLocalStorageMock({
        [INTERVAL_SPEED_KEY]: JSON.stringify({ correctCount: 3 }),
      }),
    )

    const result = tryUpdateChallengeBestRecord({ correctCount: 7 }, 'intervalSpeed')

    expect(result).toEqual({ record: { correctCount: 7 }, isNew: true })
  })

  it('keeps the existing record when the candidate is not better', () => {
    vi.stubGlobal(
      'localStorage',
      createLocalStorageMock({
        [SCALE_DEGREE_KEY]: JSON.stringify({ correctCount: 10 }),
      }),
    )

    const result = tryUpdateChallengeBestRecord({ correctCount: 6 }, 'scaleDegree')

    expect(result).toEqual({ record: { correctCount: 10 }, isNew: false })
  })
})

describe('clearChallengeBestRecord', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears a single variant', () => {
    const localStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorage)

    clearChallengeBestRecord('intervalSpeed')

    expect(localStorage.removeItem).toHaveBeenCalledWith(INTERVAL_SPEED_KEY)
  })

  it('clears all variants when no variant is specified', () => {
    const localStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorage)

    clearChallengeBestRecord()

    expect(localStorage.removeItem).toHaveBeenCalledWith(INTERVAL_SPEED_KEY)
    expect(localStorage.removeItem).toHaveBeenCalledWith(SCALE_DEGREE_KEY)
  })
})
