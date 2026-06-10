const STORAGE_KEY = 'ear-trainer:note-key-session-history'
const MAX_RECORDS = 40

export type ScaleDegreeSessionRecord = {
  correctCount: number
  totalScore?: number
  at: number
}

function isScaleDegreeSessionRecord(value: unknown): value is ScaleDegreeSessionRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.correctCount === 'number' &&
    Number.isFinite(record.correctCount) &&
    typeof record.at === 'number' &&
    Number.isFinite(record.at) &&
    (record.totalScore === undefined ||
      (typeof record.totalScore === 'number' && Number.isFinite(record.totalScore)))
  )
}

export function loadScaleDegreeSessionHistory(): ScaleDegreeSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isScaleDegreeSessionRecord)
  } catch {
    return []
  }
}

function saveScaleDegreeSessionHistory(records: ScaleDegreeSessionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function appendScaleDegreeSessionRecord(
  correctCount: number,
  totalScore?: number,
): ScaleDegreeSessionRecord[] {
  const nextRecord: ScaleDegreeSessionRecord = {
    correctCount,
    ...(totalScore !== undefined ? { totalScore } : {}),
    at: Date.now(),
  }
  const records = [...loadScaleDegreeSessionHistory(), nextRecord].slice(-MAX_RECORDS)
  saveScaleDegreeSessionHistory(records)
  return records
}

export function clearScaleDegreeSessionHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}
