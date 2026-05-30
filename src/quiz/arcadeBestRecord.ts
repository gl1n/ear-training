const STORAGE_KEY = 'ear-trainer:arcade-best'

export type ArcadeBestRecord = {
  correctCount: number
  avgResponseTimeMs: number
}

function isArcadeBestRecord(value: unknown): value is ArcadeBestRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.correctCount === 'number' &&
    Number.isFinite(record.correctCount) &&
    typeof record.avgResponseTimeMs === 'number' &&
    Number.isFinite(record.avgResponseTimeMs)
  )
}

export function isBetterArcadeRecord(
  candidate: ArcadeBestRecord,
  existing: ArcadeBestRecord,
): boolean {
  if (candidate.correctCount !== existing.correctCount) {
    return candidate.correctCount > existing.correctCount
  }
  return candidate.avgResponseTimeMs < existing.avgResponseTimeMs
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
