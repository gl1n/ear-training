import {
  INTERVALS,
  randomQuiz,
  type IntervalDirection,
  type Quiz,
} from './intervals'

/** Stored value is weak score 1..MAX_LEVEL; absent key = baseline (score 0). */
export type QuizPriorityStore = Record<string, number>

const STORAGE_KEY = 'ear-trainer:quiz-priorities'

export const IDLE_BOOST_MS = 1_000

export const MIN_LEVEL = 1
export const MAX_LEVEL = 5
export const MISTAKE_SCORE_DELTA = 2
export const CORRECT_SCORE_DELTA = 1
/** 有薄弱项时：35% 从薄弱库按分加权抽，65% 全随机。 */
export const WEAK_POOL_RATE = 0.35
export const RANDOM_POOL_RATE = 1 - WEAK_POOL_RATE
const BASELINE_MASS = 1
const LEGACY_BOOST_RATIO = 1.5
export function levelToWeight(level: number): number {
  return BASELINE_MASS + level
}

export function migrateLegacyPriority(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (Number.isInteger(value) && value >= MIN_LEVEL && value <= MAX_LEVEL) {
    return value
  }
  if (value <= 1) return 0
  const legacyLevel = Math.round(Math.log(value) / Math.log(LEGACY_BOOST_RATIO))
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, legacyLevel * MISTAKE_SCORE_DELTA))
}

export function getStoredLevel(store: QuizPriorityStore, key: string): number {
  const value = store[key]
  if (value === undefined) return 0
  return Math.min(MAX_LEVEL, Math.max(0, migrateLegacyPriority(value)))
}

/** 失误（答错、发呆等）：薄弱分 +2，封顶 5。 */
export function bumpLevel(store: QuizPriorityStore, key: string): void {
  const next = Math.min(MAX_LEVEL, getStoredLevel(store, key) + MISTAKE_SCORE_DELTA)
  if (next < MIN_LEVEL) return
  store[key] = next
}

/** 答对：薄弱分 -1，降至 0 则从加权库移除。 */
export function decayLevel(store: QuizPriorityStore, key: string): void {
  const current = getStoredLevel(store, key)
  const next = current - CORRECT_SCORE_DELTA
  if (next < MIN_LEVEL) {
    delete store[key]
    return
  }
  store[key] = next
}

/** @deprecated Use bumpLevel */
export function recordWrongBoost(store: QuizPriorityStore, key: string): void {
  bumpLevel(store, key)
}

/** @deprecated Use decayLevel */
export function recordCorrectDecay(store: QuizPriorityStore, key: string): void {
  decayLevel(store, key)
}

export type BoostedQuizEntry = {
  key: string
  level: number
  weight: number
  quiz: Quiz
}

export type WeakPriorityItem = {
  key: string
  level: number
  quiz: Quiz
}

/** Boosted pitch keys for UI, strongest first. */
export function listWeakPriorityItems(
  store: QuizPriorityStore,
  direction: IntervalDirection,
  enabledIds: string[],
): WeakPriorityItem[] {
  return getBoostedEntries(store, direction, enabledIds)
    .map(({ key, level, quiz }) => ({ key, level, quiz }))
    .sort((a, b) => b.level - a.level || a.key.localeCompare(b.key))
}

export function getBoostedEntries(
  store: QuizPriorityStore,
  direction: IntervalDirection,
  enabledIds: string[],
): BoostedQuizEntry[] {
  return Object.entries(store)
    .map(([key, rawLevel]) => {
      const level = migrateLegacyPriority(rawLevel)
      if (level < 1) return null
      const quiz = quizFromPitchKey(key, direction, enabledIds)
      if (!quiz) return null
      return { key, level, weight: levelToWeight(level), quiz }
    })
    .filter((entry): entry is BoostedQuizEntry => entry !== null)
}

export function getQuizPitchKey(quiz: Quiz): string {
  if (quiz.direction === 'harmonic') {
    const lower = Math.min(quiz.root, quiz.second)
    const higher = Math.max(quiz.root, quiz.second)
    return `${lower},${higher}`
  }

  const [first, second] =
    quiz.direction === 'ascending'
      ? [Math.min(quiz.root, quiz.second), Math.max(quiz.root, quiz.second)]
      : [Math.max(quiz.root, quiz.second), Math.min(quiz.root, quiz.second)]

  return `${first},${second}`
}

export function quizFromPitchKey(
  key: string,
  direction: IntervalDirection,
  enabledIds: string[],
): Quiz | null {
  const parts = key.split(',')
  if (parts.length !== 2) return null

  const first = Number(parts[0])
  const second = Number(parts[1])
  if (!Number.isInteger(first) || !Number.isInteger(second)) return null

  const semitones = Math.abs(second - first)
  const interval = INTERVALS.find(
    (item) => item.semitones === semitones && enabledIds.includes(item.id),
  )
  if (!interval) return null

  if (direction === 'harmonic') {
    const lower = Math.min(first, second)
    const higher = Math.max(first, second)
    return { root: lower, second: higher, interval, direction }
  }

  if (direction === 'ascending') {
    if (first >= second) return null
    return { root: first, second, interval, direction }
  }

  if (direction === 'descending') {
    if (first <= second) return null
    return { root: first, second, interval, direction }
  }

  return null
}

export function ensureIdleBoostIfEligible(
  store: QuizPriorityStore,
  key: string,
  answerWindowStartMs: number | null,
  playerAnswered: boolean,
  idleBoosted: boolean,
  onUpdated?: () => void,
): boolean {
  if (playerAnswered || idleBoosted || answerWindowStartMs === null) {
    return idleBoosted
  }

  if (performance.now() - answerWindowStartMs >= IDLE_BOOST_MS) {
    bumpLevel(store, key)
    onUpdated?.()
    return true
  }

  return false
}

export function weightedRandomQuiz(
  enabledIds: string[],
  direction: IntervalDirection,
  rootMin: number,
  rootMax: number,
  store: QuizPriorityStore,
): Quiz {
  const validBoosted = getBoostedEntries(store, direction, enabledIds)

  if (validBoosted.length === 0) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  const boostedWeight = validBoosted.reduce((sum, entry) => sum + entry.weight, 0)

  if (Math.random() >= WEAK_POOL_RATE) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  let pick = Math.random() * boostedWeight
  for (const entry of validBoosted) {
    pick -= entry.weight
    if (pick <= 0) {
      return entry.quiz
    }
  }

  return validBoosted[validBoosted.length - 1]!.quiz
}

function isQuizPriorityStore(value: unknown): value is QuizPriorityStore {
  if (typeof value !== 'object' || value === null) return false

  return Object.entries(value).every(([key, level]) => {
    return (
      key.length > 0 &&
      typeof level === 'number' &&
      Number.isInteger(level) &&
      level >= MIN_LEVEL &&
      level <= MAX_LEVEL
    )
  })
}

function normalizeLoadedStore(parsed: Record<string, unknown>): QuizPriorityStore {
  const store: QuizPriorityStore = {}

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'number' || key.length === 0) continue
    const level = migrateLegacyPriority(value)
    if (level >= 1) {
      store[key] = level
    }
  }

  return store
}

/** Shallow copy for a fixed in-session weight snapshot (e.g. arcade round). */
export function cloneQuizPriorityStore(store: QuizPriorityStore): QuizPriorityStore {
  return { ...store }
}

export function loadQuizPriorities(): QuizPriorityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    if (isQuizPriorityStore(parsed)) {
      return { ...parsed }
    }

    return normalizeLoadedStore(parsed as Record<string, unknown>)
  } catch {
    return {}
  }
}

export function saveQuizPriorities(store: QuizPriorityStore): void {
  const normalized: QuizPriorityStore = {}

  for (const [key] of Object.entries(store)) {
    const level = getStoredLevel(store, key)
    if (level >= 1) {
      normalized[key] = level
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearQuizPriorities(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore private mode errors.
  }
}
