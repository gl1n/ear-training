import {
  scaleDegreeQuizFromMistake,
  DEGREE_OPTION_IDS,
  type MajorKeySession,
  type ScaleDegreeQuiz,
} from './keys'

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

const STORAGE_KEY = 'ear-trainer:note-key-mistake-stats'

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

export function recordScaleDegreeMistake(
  store: ScaleDegreeMistakeStatsStore,
  record: ScaleDegreeMistakeRecord,
): void {
  if (!isScaleDegreeMistakeRecord(record)) return

  store.push(record)

  if (store.length > MAX_RECENT_MISTAKES) {
    store.splice(0, store.length - MAX_RECENT_MISTAKES)
  }
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

export function getTotalScaleDegreeMistakeCount(store: ScaleDegreeMistakeStatsStore): number {
  return store.length
}

export function loadScaleDegreeMistakeStats(): ScaleDegreeMistakeStatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (isScaleDegreeMistakeStatsStore(parsed)) {
      return parsed.slice(-MAX_RECENT_MISTAKES)
    }

    return []
  } catch {
    return []
  }
}

export function saveScaleDegreeMistakeStats(store: ScaleDegreeMistakeStatsStore): void {
  const normalized = store
    .filter(isScaleDegreeMistakeRecord)
    .slice(-MAX_RECENT_MISTAKES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearScaleDegreeMistakeStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}

function pickWeightedMistakeRecord(
  store: ScaleDegreeMistakeStatsStore,
): ScaleDegreeMistakeRecord | null {
  if (store.length === 0) return null

  const aggregates = aggregateByCorrectDegree(store)
  const weighted = aggregates.filter((item) => item.count > 0)
  if (weighted.length === 0) return null

  const totalWeight = weighted.reduce((sum, item) => sum + item.count, 0)
  let pick = Math.random() * totalWeight

  let chosenDegree = weighted[weighted.length - 1]!.degree
  for (const item of weighted) {
    pick -= item.count
    if (pick <= 0) {
      chosenDegree = item.degree
      break
    }
  }

  const candidates = store.filter((record) => record.correctDegree === chosenDegree)
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
