import {
  randomQuiz,
  randomQuizWithRoot,
  type IntervalDirection,
  type Quiz,
} from './intervals'

/** Recent mistake root MIDI values, oldest first; capped at MAX_RECENT_MISTAKES. */
export type MistakeStatsStore = number[]

const STORAGE_KEY = 'ear-trainer:mistake-stats'

export const MAX_RECENT_MISTAKES = 100

/** When mistakes exist: 35% weighted by distribution, 65% fully random. */
export const MISTAKE_FOCUSED_RATE = 0.35
export const RANDOM_POOL_RATE = 1 - MISTAKE_FOCUSED_RATE

/** One semitone in log₂(Hz) space. */
export const LOG_PITCH_BIN_WIDTH = 1 / 12

const MIN_KDE_BANDWIDTH = LOG_PITCH_BIN_WIDTH

export type MistakeHistogramBin = {
  midi: number
  logPitch: number
  count: number
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

export function recordMistake(store: MistakeStatsStore, midi: number): void {
  if (!Number.isInteger(midi)) return
  store.push(midi)
  if (store.length > MAX_RECENT_MISTAKES) {
    store.splice(0, store.length - MAX_RECENT_MISTAKES)
  }
}

export function getTotalMistakeCount(store: MistakeStatsStore): number {
  return store.length
}

function isMistakeStatsStore(value: unknown): value is MistakeStatsStore {
  return Array.isArray(value) && value.every((midi) => Number.isInteger(midi))
}

function isLegacyMistakeStatsStore(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  return Object.entries(value).every(([key, count]) => {
    return (
      key.length > 0 &&
      Number.isInteger(Number(key)) &&
      typeof count === 'number' &&
      Number.isInteger(count) &&
      count > 0
    )
  })
}

function migrateLegacyStore(legacy: Record<string, number>): MistakeStatsStore {
  const recent: number[] = []

  for (const [key, count] of Object.entries(legacy)) {
    const midi = Number(key)
    if (!Number.isInteger(midi) || !Number.isInteger(count) || count <= 0) continue

    for (let i = 0; i < count; i++) {
      recent.push(midi)
    }
  }

  return recent.slice(-MAX_RECENT_MISTAKES)
}

export function loadMistakeStats(): MistakeStatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (isMistakeStatsStore(parsed)) {
      return parsed.slice(-MAX_RECENT_MISTAKES)
    }
    if (isLegacyMistakeStatsStore(parsed)) {
      return migrateLegacyStore(parsed)
    }

    return []
  } catch {
    return []
  }
}

export function saveMistakeStats(store: MistakeStatsStore): void {
  const normalized = store
    .filter((midi) => Number.isInteger(midi))
    .slice(-MAX_RECENT_MISTAKES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearMistakeStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}

export function buildHistogram(
  store: MistakeStatsStore,
  rootMin: number,
  rootMax: number,
): MistakeHistogram {
  const counts = new Map<number, number>()

  for (const midi of store) {
    if (midi < rootMin || midi > rootMax) continue
    counts.set(midi, (counts.get(midi) ?? 0) + 1)
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

  for (const midi of store) {
    if (midi < rootMin || midi > rootMax) continue
    events.push(midiToLogPitch(midi))
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

function pickWeightedRoot(histogram: MistakeHistogram): number | null {
  const weighted = histogram.bins.filter((bin) => bin.count > 0)
  if (weighted.length === 0) return null

  const totalWeight = weighted.reduce((sum, bin) => sum + bin.count, 0)
  let pick = Math.random() * totalWeight

  for (const bin of weighted) {
    pick -= bin.count
    if (pick <= 0) {
      return bin.midi
    }
  }

  return weighted[weighted.length - 1]!.midi
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

  const root = pickWeightedRoot(histogram)
  if (root === null) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  const quiz = randomQuizWithRoot(root, enabledIds, direction, rootMin, rootMax)
  return quiz ?? randomQuiz(enabledIds, direction, rootMin, rootMax)
}
