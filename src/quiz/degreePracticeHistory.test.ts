import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appendDegreePracticeHistory, loadDegreePracticeHistory } from './degreePracticeHistory'
import { EMPTY_SESSION_STATS, recordMelodyGroupResult } from './stats'
import { STORAGE_KEYS } from './storageKeys'
import { clearAllTrainingStats } from './trainingStats'
import { loadEarTrainingPreferences } from '../hooks/usePersistedSettings'

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('degree practice persistence', () => {
  it('keeps phrase lengths and scale types separate and preserves listening counts', () => {
    const stats = recordMelodyGroupResult(EMPTY_SESSION_STATS, '1-2-3', true, true)
    appendDegreePracticeHistory('dictation-3', stats)
    appendDegreePracticeHistory('dictation-5', stats)
    appendDegreePracticeHistory('single-minor', { byKey: { '♭3': { correctCount: 1, totalCount: 2 } }, totalScore: 1 })
    const records = loadDegreePracticeHistory()
    expect(records.map((record) => record.practiceKey)).toEqual(['dictation-3', 'dictation-5', 'single-minor'])
    expect(records[0].listening?.replayCorrect).toBe(1)
    expect(records[2]).toMatchObject({ correct: 1, total: 2 })
    expect(localStorage.getItem(STORAGE_KEYS.scaleDegreeSessionHistory)).toBeNull()
    clearAllTrainingStats()
    expect(loadDegreePracticeHistory()).toEqual([])
  })

  it('bounds history per setting and ignores empty sessions', () => {
    const stats = recordMelodyGroupResult(EMPTY_SESSION_STATS, '1-2-3', true, false)
    appendDegreePracticeHistory('dictation-7', stats)
    for (let i = 0; i < 45; i++) appendDegreePracticeHistory('dictation-3', stats)
    appendDegreePracticeHistory('dictation-5', EMPTY_SESSION_STATS)
    const records = loadDegreePracticeHistory()
    expect(records.filter((record) => record.practiceKey === 'dictation-3')).toHaveLength(40)
    expect(records.filter((record) => record.practiceKey === 'dictation-7')).toHaveLength(1)
    expect(records.filter((record) => record.practiceKey === 'dictation-5')).toHaveLength(0)
  })

  it('falls back for old or invalid preferences and restores valid new settings', () => {
    expect(loadEarTrainingPreferences().degreePractice).toEqual({ scaleFlavor: 'major', melodyLength: 3, arcadeMode: false })
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ degreePractice: { scaleFlavor: 'minor', melodyLength: 7, arcadeMode: false } }))
    expect(loadEarTrainingPreferences().degreePractice).toEqual({ scaleFlavor: 'minor', melodyLength: 7, arcadeMode: false })
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ degreePractice: { scaleFlavor: 'invalid', melodyLength: 4 } }))
    expect(loadEarTrainingPreferences().degreePractice).toEqual({ scaleFlavor: 'major', melodyLength: 3, arcadeMode: false })
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ degreePractice: null }))
    expect(loadEarTrainingPreferences().degreePractice).toEqual({ scaleFlavor: 'major', melodyLength: 3, arcadeMode: false })
  })

  it('drops corrupt history records', () => {
    localStorage.setItem(STORAGE_KEYS.degreePracticeHistory, JSON.stringify([
      { practiceKey: 'dictation-7', at: 10, correct: 2, total: 1 },
      { practiceKey: 'dictation-5', at: 10, correct: 1, total: 2, listening: null },
      { practiceKey: 'dictation-4', at: 10, correct: 1, total: 2 },
      { practiceKey: 'single-minor', at: 10, correct: 1, total: 2 },
    ]))
    expect(loadDegreePracticeHistory()).toHaveLength(1)
  })
})
