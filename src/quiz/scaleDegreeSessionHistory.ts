import { STORAGE_KEYS } from './storageKeys'
import { readStorage, removeStorage, writeStorage } from '../utils/storage'

const STORAGE_KEY = STORAGE_KEYS.scaleDegreeSessionHistory
const MELODY_STORAGE_KEY = STORAGE_KEYS.scaleDegreeMelodySessionHistory
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

function loadSessionHistory(storageKey: string): ScaleDegreeSessionRecord[] {
  try {
    const raw = readStorage(storageKey)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isScaleDegreeSessionRecord)
  } catch {
    return []
  }
}

function saveSessionHistory(storageKey: string, records: ScaleDegreeSessionRecord[]): void {
  writeStorage(storageKey, JSON.stringify(records))
}

function appendSessionRecord(
  storageKey: string,
  correctCount: number,
  totalScore?: number,
): ScaleDegreeSessionRecord[] {
  const nextRecord: ScaleDegreeSessionRecord = {
    correctCount,
    ...(totalScore !== undefined ? { totalScore } : {}),
    at: Date.now(),
  }
  const records = [...loadSessionHistory(storageKey), nextRecord].slice(-MAX_RECORDS)
  saveSessionHistory(storageKey, records)
  return records
}

function clearSessionHistory(storageKey: string): void {
  try {
    removeStorage(storageKey)
  } catch {
    // Ignore private mode errors.
  }
}

export function loadScaleDegreeSessionHistory(): ScaleDegreeSessionRecord[] {
  return loadSessionHistory(STORAGE_KEY)
}

export function appendScaleDegreeSessionRecord(
  correctCount: number,
  totalScore?: number,
): ScaleDegreeSessionRecord[] {
  return appendSessionRecord(STORAGE_KEY, correctCount, totalScore)
}

export function clearScaleDegreeSessionHistory(): void {
  clearSessionHistory(STORAGE_KEY)
}

export function loadScaleDegreeMelodySessionHistory(): ScaleDegreeSessionRecord[] {
  return loadSessionHistory(MELODY_STORAGE_KEY)
}

export function appendScaleDegreeMelodySessionRecord(
  correctCount: number,
  totalScore?: number,
): ScaleDegreeSessionRecord[] {
  return appendSessionRecord(MELODY_STORAGE_KEY, correctCount, totalScore)
}

export function clearScaleDegreeMelodySessionHistory(): void {
  clearSessionHistory(MELODY_STORAGE_KEY)
}
