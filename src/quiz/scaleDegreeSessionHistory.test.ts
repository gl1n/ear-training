import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  appendScaleDegreeSessionRecord,
  clearScaleDegreeSessionHistory,
  loadScaleDegreeSessionHistory,
} from './scaleDegreeSessionHistory'

const STORAGE_KEY = 'ear-trainer:note-key-session-history'

function createLocalStorageMock() {
  const store = new Map<string, string>()

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

describe('scaleDegreeSessionHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts empty', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    expect(loadScaleDegreeSessionHistory()).toEqual([])
  })

  it('appends session records', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock())

    appendScaleDegreeSessionRecord(3, 2.5)
    appendScaleDegreeSessionRecord(7, 6)

    expect(loadScaleDegreeSessionHistory()).toEqual([
      { correctCount: 3, totalScore: 2.5, at: expect.any(Number) },
      { correctCount: 7, totalScore: 6, at: expect.any(Number) },
    ])
  })

  it('clears stored history', () => {
    const localStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorage)

    appendScaleDegreeSessionRecord(5)
    clearScaleDegreeSessionHistory()

    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(loadScaleDegreeSessionHistory()).toEqual([])
  })
})
