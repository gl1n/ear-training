const STORAGE_KEY = 'ear-trainer:arcade-best'

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

export function loadArcadeBestRecord(): ArcadeBestRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    return isArcadeBestRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function saveArcadeBestRecord(record: ArcadeBestRecord): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

export function tryUpdateArcadeBestRecord(candidate: ArcadeBestRecord): {
  record: ArcadeBestRecord
  isNew: boolean
} {
  const existing = loadArcadeBestRecord()
  if (!existing || isBetterArcadeRecord(candidate, existing)) {
    saveArcadeBestRecord(candidate)
    return { record: candidate, isNew: true }
  }
  return { record: existing, isNew: false }
}
