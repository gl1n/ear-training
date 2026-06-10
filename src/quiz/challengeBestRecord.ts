const LEGACY_STORAGE_KEY = 'ear-trainer:arcade-best'

const STORAGE_KEYS = {
  intervalSpeed: 'ear-trainer:challenge-best:intervalSpeed',
  scaleDegree: 'ear-trainer:challenge-best:scaleDegree',
} as const

const LEGACY_VARIANT_KEYS = {
  intervalSpeed: 'ear-trainer:arcade-best:interval',
  scaleDegree: 'ear-trainer:arcade-best:noteKey',
} as const

export type ChallengeBestVariant = keyof typeof STORAGE_KEYS

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

function migrateLegacyBestRecord(): ChallengeBestRecord | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isChallengeBestRecord(parsed)) return null

    localStorage.setItem(STORAGE_KEYS.intervalSpeed, JSON.stringify(parsed))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return parsed
  } catch {
    return null
  }
}

function migrateVariantStorage(variant: ChallengeBestVariant): void {
  try {
    const legacyKey = LEGACY_VARIANT_KEYS[variant]
    const nextKey = STORAGE_KEYS[variant]
    const legacyRaw = localStorage.getItem(legacyKey)
    if (!legacyRaw || localStorage.getItem(nextKey)) {
      return
    }

    localStorage.setItem(nextKey, legacyRaw)
  } catch {
    // Ignore private mode errors.
  }
}

export function loadChallengeBestRecord(
  variant: ChallengeBestVariant = 'intervalSpeed',
): ChallengeBestRecord | null {
  try {
    migrateVariantStorage(variant)

    const raw = localStorage.getItem(STORAGE_KEYS[variant])
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      return isChallengeBestRecord(parsed) ? parsed : null
    }

    if (variant === 'intervalSpeed') {
      return migrateLegacyBestRecord()
    }

    return null
  } catch {
    return null
  }
}

function saveChallengeBestRecord(record: ChallengeBestRecord, variant: ChallengeBestVariant): void {
  localStorage.setItem(STORAGE_KEYS[variant], JSON.stringify(record))
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
      localStorage.removeItem(STORAGE_KEYS[variant])
      localStorage.removeItem(LEGACY_VARIANT_KEYS[variant])
      if (variant === 'intervalSpeed') {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
      return
    }

    localStorage.removeItem(STORAGE_KEYS.intervalSpeed)
    localStorage.removeItem(STORAGE_KEYS.scaleDegree)
    localStorage.removeItem(LEGACY_VARIANT_KEYS.intervalSpeed)
    localStorage.removeItem(LEGACY_VARIANT_KEYS.scaleDegree)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}
