import { STORAGE_KEYS, type ChallengeBestVariant } from './storageKeys'

export type { ChallengeBestVariant }

export type ChallengeBestRecord = {
  correctCount: number
}

function isChallengeBestRecord(value: unknown): value is ChallengeBestRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.correctCount === 'number' && Number.isFinite(record.correctCount)
}

function isBetterChallengeRecord(
  candidate: ChallengeBestRecord,
  existing: ChallengeBestRecord,
): boolean {
  return candidate.correctCount > existing.correctCount
}

export function loadChallengeBestRecord(
  variant: ChallengeBestVariant = 'intervalSpeed',
): ChallengeBestRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.challengeBest[variant])
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    return isChallengeBestRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function saveChallengeBestRecord(record: ChallengeBestRecord, variant: ChallengeBestVariant): void {
  localStorage.setItem(STORAGE_KEYS.challengeBest[variant], JSON.stringify(record))
}

export function tryUpdateChallengeBestRecord(
  candidate: ChallengeBestRecord,
  variant: ChallengeBestVariant = 'intervalSpeed',
): {
  record: ChallengeBestRecord
  isNew: boolean
} {
  const existing = loadChallengeBestRecord(variant)
  if (!existing || isBetterChallengeRecord(candidate, existing)) {
    saveChallengeBestRecord(candidate, variant)
    return { record: candidate, isNew: true }
  }
  return { record: existing, isNew: false }
}

export function clearChallengeBestRecord(variant?: ChallengeBestVariant): void {
  try {
    if (variant) {
      localStorage.removeItem(STORAGE_KEYS.challengeBest[variant])
      return
    }

    localStorage.removeItem(STORAGE_KEYS.challengeBest.intervalSpeed)
    localStorage.removeItem(STORAGE_KEYS.challengeBest.scaleDegree)
  } catch {
    // Ignore private mode errors.
  }
}
