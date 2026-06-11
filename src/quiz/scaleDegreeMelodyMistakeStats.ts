import {
  DEGREE_OPTION_IDS,
  formatMelodyDegrees,
  melodyScaleDegreeQuizFromPattern,
  type MajorKeySession,
  type MelodyScaleDegreeQuiz,
} from './keys'
import { createRecentRecordStore } from './recentRecordStore'
import { STORAGE_KEYS } from './storageKeys'
import { pickWeighted } from './weightedPick'

export type ScaleDegreeMelodyMistakeRecord = {
  pattern: string
}

export type ScaleDegreeMelodyMistakeStatsStore = ScaleDegreeMelodyMistakeRecord[]

export type ScaleDegreeMelodyPatternAggregate = {
  pattern: string
  count: number
  ratio: number
}

const STORAGE_KEY = STORAGE_KEYS.scaleDegreeMelodyMistakeStats
const SCHEMA_STORAGE_KEY = STORAGE_KEYS.scaleDegreeMelodyMistakeStatsSchema

/** Bump when mistake record shape changes. On mismatch, stored stats are cleared. */
export const SCALE_DEGREE_MELODY_MISTAKE_STATS_SCHEMA_VERSION = 1

export const MAX_RECENT_MELODY_MISTAKES = 500

export function isValidMelodyPattern(pattern: string): boolean {
  const parts = pattern.split('-')
  if (parts.length !== 3) return false

  return parts.every((part) =>
    DEGREE_OPTION_IDS.includes(part as (typeof DEGREE_OPTION_IDS)[number]),
  )
}

function isScaleDegreeMelodyMistakeRecord(
  value: unknown,
): value is ScaleDegreeMelodyMistakeRecord {
  if (typeof value !== 'object' || value === null) return false

  const record = value as ScaleDegreeMelodyMistakeRecord
  return typeof record.pattern === 'string' && isValidMelodyPattern(record.pattern)
}

function isScaleDegreeMelodyMistakeStatsStore(
  value: unknown,
): value is ScaleDegreeMelodyMistakeStatsStore {
  return Array.isArray(value) && value.every(isScaleDegreeMelodyMistakeRecord)
}

const scaleDegreeMelodyMistakeRecordStore =
  createRecentRecordStore<ScaleDegreeMelodyMistakeRecord>({
    storageKey: STORAGE_KEY,
    maxRecords: MAX_RECENT_MELODY_MISTAKES,
    isValidRecord: isScaleDegreeMelodyMistakeRecord,
    isValidStore: isScaleDegreeMelodyMistakeStatsStore,
    schemaStorageKey: SCHEMA_STORAGE_KEY,
    schemaVersion: SCALE_DEGREE_MELODY_MISTAKE_STATS_SCHEMA_VERSION,
  })

export function recordScaleDegreeMelodyMistake(
  store: ScaleDegreeMelodyMistakeStatsStore,
  record: ScaleDegreeMelodyMistakeRecord,
): void {
  if (!isValidMelodyPattern(record.pattern)) return
  scaleDegreeMelodyMistakeRecordStore.appendInMemory(store, record)
}

export function aggregateTopMelodyPatterns(
  store: ScaleDegreeMelodyMistakeStatsStore,
  limit = 10,
): ScaleDegreeMelodyPatternAggregate[] {
  if (store.length === 0) return []

  const counts = new Map<string, number>()

  for (const record of store) {
    counts.set(record.pattern, (counts.get(record.pattern) ?? 0) + 1)
  }

  const total = store.length

  return Array.from(counts.entries())
    .map(([pattern, count]) => ({ pattern, count, ratio: count / total }))
    .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern))
    .slice(0, limit)
}

export function loadScaleDegreeMelodyMistakeStats(): ScaleDegreeMelodyMistakeStatsStore {
  return scaleDegreeMelodyMistakeRecordStore.load()
}

export function saveScaleDegreeMelodyMistakeStats(
  store: ScaleDegreeMelodyMistakeStatsStore,
): void {
  scaleDegreeMelodyMistakeRecordStore.save(store)
}

export function clearScaleDegreeMelodyMistakeStats(): void {
  scaleDegreeMelodyMistakeRecordStore.clear()
}

export { formatMelodyDegrees as melodyPatternFromDegrees }

function pickWeightedMelodyMistakeRecord(
  store: ScaleDegreeMelodyMistakeStatsStore,
): ScaleDegreeMelodyMistakeRecord | null {
  if (store.length === 0) return null

  const aggregates = aggregateTopMelodyPatterns(store, store.length)
  const chosen = pickWeighted(aggregates, (item) => item.count)
  if (!chosen) return null

  const candidates = store.filter((record) => record.pattern === chosen.pattern)
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null
}

export function weightedRandomMelodyQuizFromMistakes(
  store: ScaleDegreeMelodyMistakeStatsStore,
  session: MajorKeySession,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): MelodyScaleDegreeQuiz | null {
  const maxAttempts = Math.min(store.length, 8)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const record = pickWeightedMelodyMistakeRecord(store)
    if (!record) return null

    const quiz = melodyScaleDegreeQuizFromPattern(
      session,
      record.pattern,
      rootMin,
      rootMax,
      previousNoteMidi,
    )
    if (quiz) return quiz
  }

  return null
}
