const LEGACY_STORAGE_KEY = 'ear-trainer:arcade-best'

const STORAGE_KEYS = {
  interval: 'ear-trainer:arcade-best:interval',
  noteKey: 'ear-trainer:arcade-best:noteKey',
} as const

export type ArcadeBestVariant = keyof typeof STORAGE_KEYS

export type ArcadeBestRecord = {
  correctCount: number
}

function isArcadeBestRecord(value: unknown): value is ArcadeBestRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.correctCount === 'number' && Number.isFinite(record.correctCount)
}

function isBetterArcadeRecord(
  candidate: ArcadeBestRecord,
  existing: ArcadeBestRecord,
): boolean {
  return candidate.correctCount > existing.correctCount
}

function migrateLegacyBestRecord(): ArcadeBestRecord | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isArcadeBestRecord(parsed)) return null

    localStorage.setItem(STORAGE_KEYS.interval, JSON.stringify(parsed))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return parsed
  } catch {
    return null
  }
}

export function loadArcadeBestRecord(variant: ArcadeBestVariant = 'interval'): ArcadeBestRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[variant])
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      return isArcadeBestRecord(parsed) ? parsed : null
    }

    if (variant === 'interval') {
      return migrateLegacyBestRecord()
    }

    return null
  } catch {
    return null
  }
}

function saveArcadeBestRecord(record: ArcadeBestRecord, variant: ArcadeBestVariant): void {
  localStorage.setItem(STORAGE_KEYS[variant], JSON.stringify(record))
}

export function tryUpdateArcadeBestRecord(
  candidate: ArcadeBestRecord,
  variant: ArcadeBestVariant = 'interval',
): {
  record: ArcadeBestRecord
  isNew: boolean
} {
  const existing = loadArcadeBestRecord(variant)
  if (!existing || isBetterArcadeRecord(candidate, existing)) {
    saveArcadeBestRecord(candidate, variant)
    return { record: candidate, isNew: true }
  }
  return { record: existing, isNew: false }
}

export function clearArcadeBestRecord(variant?: ArcadeBestVariant): void {
  try {
    if (variant) {
      localStorage.removeItem(STORAGE_KEYS[variant])
      if (variant === 'interval') {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
      return
    }

    localStorage.removeItem(STORAGE_KEYS.interval)
    localStorage.removeItem(STORAGE_KEYS.noteKey)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}
