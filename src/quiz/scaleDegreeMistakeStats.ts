import {
  scaleDegreeQuizFromMistake,
  DEGREE_OPTION_IDS,
  type MajorKeySession,
  type ScaleDegreeQuiz,
} from './keys'
import { createRecentRecordStore } from './recentRecordStore'
import { STORAGE_KEYS } from './storageKeys'
import { pickWeighted } from './weightedPick'

export type ScaleDegreeMistakeRecord = {
  previousNoteMidi: number | null
  correctDegree: number
  wrongDegree: string
}

export type ScaleDegreeMistakeStatsStore = ScaleDegreeMistakeRecord[]

export type ScaleDegreeMistakeAggregate = {
  degree: number
  count: number
}

export type ScaleDegreeMistakePairAggregate = {
  correctDegree: number
  wrongDegree: number
  count: number
  ratio: number
}

const STORAGE_KEY = STORAGE_KEYS.scaleDegreeMistakeStats
const SCHEMA_STORAGE_KEY = STORAGE_KEYS.scaleDegreeMistakeStatsSchema

/** Bump when mistake record shape changes. On mismatch, stored stats are cleared. */
export const SCALE_DEGREE_MISTAKE_STATS_SCHEMA_VERSION = 1

export const MAX_RECENT_MISTAKES = 100

function isScaleDegreeMistakeRecord(value: unknown): value is ScaleDegreeMistakeRecord {
  if (typeof value !== 'object' || value === null) return false

  const record = value as ScaleDegreeMistakeRecord
  if (
    record.previousNoteMidi !== null &&
    !Number.isInteger(record.previousNoteMidi)
  ) {
    return false
  }
  if (
    !Number.isInteger(record.correctDegree) ||
    record.correctDegree < 1 ||
    record.correctDegree > 7
  ) {
    return false
  }
  if (
    typeof record.wrongDegree !== 'string' ||
    !DEGREE_OPTION_IDS.includes(record.wrongDegree as (typeof DEGREE_OPTION_IDS)[number])
  ) {
    return false
  }

  return true
}

function isScaleDegreeMistakeStatsStore(value: unknown): value is ScaleDegreeMistakeStatsStore {
  return Array.isArray(value) && value.every(isScaleDegreeMistakeRecord)
}

const scaleDegreeMistakeRecordStore = createRecentRecordStore<ScaleDegreeMistakeRecord>({
  storageKey: STORAGE_KEY,
  maxRecords: MAX_RECENT_MISTAKES,
  isValidRecord: isScaleDegreeMistakeRecord,
  isValidStore: isScaleDegreeMistakeStatsStore,
  schemaStorageKey: SCHEMA_STORAGE_KEY,
  schemaVersion: SCALE_DEGREE_MISTAKE_STATS_SCHEMA_VERSION,
})

export function recordScaleDegreeMistake(
  store: ScaleDegreeMistakeStatsStore,
  record: ScaleDegreeMistakeRecord,
): void {
  scaleDegreeMistakeRecordStore.appendInMemory(store, record)
}

export function aggregateByCorrectDegree(
  store: ScaleDegreeMistakeStatsStore,
): ScaleDegreeMistakeAggregate[] {
  const counts = new Map<number, number>()

  for (const record of store) {
    counts.set(record.correctDegree, (counts.get(record.correctDegree) ?? 0) + 1)
  }

  return DEGREE_OPTION_IDS.map((id) => ({
    degree: Number(id),
    count: counts.get(Number(id)) ?? 0,
  }))
}

export function aggregateByDegreePair(
  store: ScaleDegreeMistakeStatsStore,
): ScaleDegreeMistakePairAggregate[] {
  if (store.length === 0) return []

  const counts = new Map<string, number>()

  for (const record of store) {
    const key = `${record.correctDegree}-${record.wrongDegree}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const total = store.length

  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [correctDegree, wrongDegree] = key.split('-').map(Number)
      return { correctDegree, wrongDegree, count, ratio: count / total }
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.correctDegree - b.correctDegree ||
        a.wrongDegree - b.wrongDegree,
    )
}

export function loadScaleDegreeMistakeStats(): ScaleDegreeMistakeStatsStore {
  return scaleDegreeMistakeRecordStore.load()
}

export function saveScaleDegreeMistakeStats(store: ScaleDegreeMistakeStatsStore): void {
  scaleDegreeMistakeRecordStore.save(store)
}

export function clearScaleDegreeMistakeStats(): void {
  scaleDegreeMistakeRecordStore.clear()
}

function pickWeightedMistakeRecord(
  store: ScaleDegreeMistakeStatsStore,
): ScaleDegreeMistakeRecord | null {
  if (store.length === 0) return null

  const aggregates = aggregateByCorrectDegree(store)
  const weighted = aggregates.filter((item) => item.count > 0)
  const chosen = pickWeighted(weighted, (item) => item.count)
  if (!chosen) return null

  const candidates = store.filter((record) => record.correctDegree === chosen.degree)
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null
}

export function weightedRandomScaleDegreeQuizFromMistakes(
  store: ScaleDegreeMistakeStatsStore,
  session: MajorKeySession,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): ScaleDegreeQuiz | null {
  const maxAttempts = Math.min(store.length, 8)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const record = pickWeightedMistakeRecord(store)
    if (!record) return null

    const quiz = scaleDegreeQuizFromMistake(
      session,
      record,
      rootMin,
      rootMax,
      previousNoteMidi,
    )
    if (quiz) return quiz
  }

  return null
}
