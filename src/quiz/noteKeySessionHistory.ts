const STORAGE_KEY = 'ear-trainer:note-key-session-history'
const MAX_RECORDS = 40

export type NoteKeySessionRecord = {
  correctCount: number
  totalScore?: number
  at: number
}

function isNoteKeySessionRecord(value: unknown): value is NoteKeySessionRecord {
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

export function loadNoteKeySessionHistory(): NoteKeySessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isNoteKeySessionRecord)
  } catch {
    return []
  }
}

function saveNoteKeySessionHistory(records: NoteKeySessionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function appendNoteKeySessionRecord(
  correctCount: number,
  totalScore?: number,
): NoteKeySessionRecord[] {
  const nextRecord: NoteKeySessionRecord = {
    correctCount,
    ...(totalScore !== undefined ? { totalScore } : {}),
    at: Date.now(),
  }
  const records = [...loadNoteKeySessionHistory(), nextRecord].slice(-MAX_RECORDS)
  saveNoteKeySessionHistory(records)
  return records
}

export function clearNoteKeySessionHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}
