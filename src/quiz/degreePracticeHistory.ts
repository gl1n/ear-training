import { readStorage, writeStorage } from '../utils/storage'
import { getCorrectAnswerCount, getTotalAnswerCount, type SessionStats } from './stats'
import { STORAGE_KEYS } from './storageKeys'

export type DegreePracticeRecord = {
  practiceKey: string
  at: number
  correct: number
  total: number
  listening?: SessionStats['listening']
}

export function loadDegreePracticeHistory(): DegreePracticeRecord[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(STORAGE_KEYS.degreePracticeHistory) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is DegreePracticeRecord => {
      if (!value || typeof value !== 'object') return false
      const r = value as DegreePracticeRecord
      return /^(dictation-(3|5|7)|single-(minor|chromatic))$/.test(r.practiceKey) &&
        Number.isFinite(r.at) && Number.isInteger(r.correct) && Number.isInteger(r.total) &&
        r.correct >= 0 && r.total > 0 && r.correct <= r.total &&
        (r.listening === undefined || (r.listening !== null && typeof r.listening === 'object' &&
          ['firstCorrect', 'replayCorrect', 'firstAttempts', 'replayAttempts'].every((key) =>
            Number.isInteger(r.listening![key as keyof NonNullable<SessionStats['listening']>]) &&
            r.listening![key as keyof NonNullable<SessionStats['listening']>] >= 0)))
    })
  } catch { return [] }
}

export function appendDegreePracticeHistory(practiceKey: string, stats: SessionStats): DegreePracticeRecord[] {
  const records = loadDegreePracticeHistory()
  const total = getTotalAnswerCount(stats)
  if (!total) return records
  const record: DegreePracticeRecord = { practiceKey, at: Date.now(), correct: getCorrectAnswerCount(stats), total, listening: stats.listening }
  const same = [...records.filter((r) => r.practiceKey === practiceKey), record].slice(-40)
  const next = [...records.filter((r) => r.practiceKey !== practiceKey), ...same]
  writeStorage(STORAGE_KEYS.degreePracticeHistory, JSON.stringify(next))
  return next
}
