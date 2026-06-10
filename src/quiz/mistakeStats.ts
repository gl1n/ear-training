import {
  getIntervalsByIds,
  randomQuiz,
  randomQuizWithRoot,
  type IntervalDirection,
  type Quiz,
} from './intervals'
import { createRecentRecordStore } from './recentRecordStore'
import { STORAGE_KEYS } from './storageKeys'
import { pickWeighted } from './weightedPick'

export type MistakeRecord = {
  root: number
  second?: number
  intervalId?: string
  direction?: IntervalDirection
}

/** Recent mistake records, oldest first; capped at MAX_RECENT_MISTAKES. */
export type MistakeStatsStore = MistakeRecord[]

const STORAGE_KEY = STORAGE_KEYS.mistakeStats
const SCHEMA_STORAGE_KEY = STORAGE_KEYS.mistakeStatsSchema

/**
 * Bump when mistake record shape changes. On mismatch, stored stats are cleared.
 */
export const MISTAKE_STATS_SCHEMA_VERSION = 2

export const MAX_RECENT_MISTAKES = 100

/** When mistakes exist: 35% weighted by distribution, 65% fully random. */
export const MISTAKE_FOCUSED_RATE = 0.35

/** One semitone in log₂(Hz) space. */
export const LOG_PITCH_BIN_WIDTH = 1 / 12

const MIN_KDE_BANDWIDTH = LOG_PITCH_BIN_WIDTH

const VALID_DIRECTIONS: IntervalDirection[] = ['ascending', 'descending', 'harmonic']

export type MistakeHistogramBin = {
  midi: number
  logPitch: number
  count: number
  lastMistakeQuiz: Quiz | null
}

export type MistakeHistogram = {
  bins: MistakeHistogramBin[]
  totalInRange: number
}

export type KdePoint = {
  logPitch: number
  count: number
}

/** log₂(Hz); linear in MIDI note number. */
export function midiToLogPitch(midi: number): number {
  return Math.log2(440) + (midi - 69) / 12
}

export function mistakeRecordToQuiz(record: MistakeRecord): Quiz | null {
  const { root, second, intervalId, direction } = record
  if (
    !Number.isInteger(root) ||
    second === undefined ||
    !Number.isInteger(second) ||
    !intervalId ||
    !direction ||
    !VALID_DIRECTIONS.includes(direction)
  ) {
    return null
  }

  const interval = getIntervalsByIds([intervalId])[0]
  if (!interval) return null

  return { root, second, interval, direction }
}

export function getLastMistakeQuizForRoot(
  store: MistakeStatsStore,
  rootMidi: number,
): Quiz | null {
  for (let i = store.length - 1; i >= 0; i--) {
    const record = store[i]!
    if (record.root !== rootMidi) continue

    const quiz = mistakeRecordToQuiz(record)
    if (quiz) return quiz
  }

  return null
}

function buildLastQuizByRoot(store: MistakeStatsStore): Map<number, Quiz> {
  const lastQuizByRoot = new Map<number, Quiz>()

  for (let i = store.length - 1; i >= 0; i--) {
    const record = store[i]!
    if (lastQuizByRoot.has(record.root)) continue

    const quiz = mistakeRecordToQuiz(record)
    if (quiz) {
      lastQuizByRoot.set(record.root, quiz)
    }
  }

  return lastQuizByRoot
}

function isMistakeRecord(value: unknown): value is MistakeRecord {
  if (typeof value !== 'object' || value === null) return false

  const record = value as MistakeRecord
  if (!Number.isInteger(record.root)) return false

  if (record.second !== undefined && !Number.isInteger(record.second)) return false
  if (record.intervalId !== undefined && typeof record.intervalId !== 'string') return false
  if (
    record.direction !== undefined &&
    !VALID_DIRECTIONS.includes(record.direction)
  ) {
    return false
  }

  return true
}

function isMistakeStatsStore(value: unknown): value is MistakeStatsStore {
  return Array.isArray(value) && value.every(isMistakeRecord)
}

const mistakeRecordStore = createRecentRecordStore<MistakeRecord>({
  storageKey: STORAGE_KEY,
  maxRecords: MAX_RECENT_MISTAKES,
  isValidRecord: isMistakeRecord,
  isValidStore: isMistakeStatsStore,
  schemaStorageKey: SCHEMA_STORAGE_KEY,
  schemaVersion: MISTAKE_STATS_SCHEMA_VERSION,
  sanitizeLoaded: (store) => store.filter((record) => mistakeRecordToQuiz(record) !== null),
  normalizeForSave: (store) => store.filter((record) => Number.isInteger(record.root)),
})

export function recordMistake(store: MistakeStatsStore, quiz: Quiz): void {
  if (!Number.isInteger(quiz.root)) return

  mistakeRecordStore.appendInMemory(store, {
    root: quiz.root,
    second: quiz.second,
    intervalId: quiz.interval.id,
    direction: quiz.direction,
  })
}

export function getTotalMistakeCount(store: MistakeStatsStore): number {
  return store.length
}

export function loadMistakeStats(): MistakeStatsStore {
  return mistakeRecordStore.load()
}

export function saveMistakeStats(store: MistakeStatsStore): void {
  mistakeRecordStore.save(store)
}

export function clearMistakeStats(): void {
  mistakeRecordStore.clear()
}

export function buildHistogram(
  store: MistakeStatsStore,
  rootMin: number,
  rootMax: number,
): MistakeHistogram {
  const counts = new Map<number, number>()
  const lastQuizByRoot = buildLastQuizByRoot(store)

  for (const record of store) {
    const { root } = record
    if (root < rootMin || root > rootMax) continue
    counts.set(root, (counts.get(root) ?? 0) + 1)
  }

  const bins: MistakeHistogramBin[] = []
  let totalInRange = 0

  for (let midi = rootMin; midi <= rootMax; midi++) {
    const count = counts.get(midi) ?? 0
    totalInRange += count
    bins.push({
      midi,
      logPitch: midiToLogPitch(midi),
      count,
      lastMistakeQuiz: lastQuizByRoot.get(midi) ?? null,
    })
  }

  return { bins, totalInRange }
}

function collectLogPitchEvents(
  store: MistakeStatsStore,
  rootMin: number,
  rootMax: number,
): number[] {
  const events: number[] = []

  for (const record of store) {
    if (record.root < rootMin || record.root > rootMax) continue
    events.push(midiToLogPitch(record.root))
  }

  return events
}

function sampleStandardDeviation(samples: number[]): number {
  const n = samples.length
  if (n === 0) return 0

  const mean = samples.reduce((sum, value) => sum + value, 0) / n
  const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n
  return Math.sqrt(variance)
}

/** Silverman bandwidth with a semitone floor for sparse samples. */
export function silvermanBandwidth(samples: number[]): number {
  const n = samples.length
  if (n <= 1) return MIN_KDE_BANDWIDTH

  const sigma = sampleStandardDeviation(samples)
  const h = 1.06 * sigma * n ** (-1 / 5)
  return Math.max(h, MIN_KDE_BANDWIDTH)
}

function standardNormalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
}

function kdeDensityAt(x: number, samples: number[], bandwidth: number): number {
  const n = samples.length
  if (n === 0 || bandwidth <= 0) return 0

  let sum = 0
  for (const sample of samples) {
    sum += standardNormalPdf((x - sample) / bandwidth)
  }

  return sum / (n * bandwidth)
}

export function buildKdeCurve(
  store: MistakeStatsStore,
  rootMin: number,
  rootMax: number,
  sampleStep = LOG_PITCH_BIN_WIDTH / 2,
): KdePoint[] {
  const events = collectLogPitchEvents(store, rootMin, rootMax)
  if (events.length === 0) return []

  const bandwidth = silvermanBandwidth(events)
  const xMin = midiToLogPitch(rootMin)
  const xMax = midiToLogPitch(rootMax)
  const points: KdePoint[] = []

  for (let x = xMin; x <= xMax + sampleStep / 2; x += sampleStep) {
    const density = kdeDensityAt(x, events, bandwidth)
    points.push({
      logPitch: x,
      count: density * events.length * LOG_PITCH_BIN_WIDTH,
    })
  }

  return points
}

export function weightedRandomQuizFromMistakes(
  store: MistakeStatsStore,
  enabledIds: string[],
  direction: IntervalDirection,
  rootMin: number,
  rootMax: number,
): Quiz {
  const histogram = buildHistogram(store, rootMin, rootMax)

  if (histogram.totalInRange === 0 || Math.random() >= MISTAKE_FOCUSED_RATE) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  const root =
    pickWeighted(
      histogram.bins.filter((bin) => bin.count > 0),
      (bin) => bin.count,
    )?.midi ?? null
  if (root === null) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  const quiz = randomQuizWithRoot(root, enabledIds, direction, rootMin, rootMax)
  return quiz ?? randomQuiz(enabledIds, direction, rootMin, rootMax)
}
