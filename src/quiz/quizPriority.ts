import {
  INTERVALS,
  randomQuiz,
  type IntervalDirection,
  type Quiz,
} from './intervals'

export type QuizPriorityStore = Record<string, number>

const STORAGE_KEY = 'ear-trainer:quiz-priorities'

export const IDLE_BOOST_MS = 1_000

const WRONG_BOOST_FACTOR = 1.5
const CORRECT_DECAY_FACTOR = 0.8
const BASELINE_MASS = 1

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

export function recordWrongBoost(store: QuizPriorityStore, key: string): void {
  store[key] = (store[key] ?? BASELINE_MASS) * WRONG_BOOST_FACTOR
}

export function recordCorrectDecay(store: QuizPriorityStore, key: string): void {
  const next = Math.max(BASELINE_MASS, (store[key] ?? BASELINE_MASS) * CORRECT_DECAY_FACTOR)
  if (next <= BASELINE_MASS) {
    delete store[key]
  } else {
    store[key] = next
  }
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
    recordWrongBoost(store, key)
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
  const boosted = Object.entries(store).filter(([, priority]) => priority > 1)

  if (boosted.length === 0) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  const validBoosted = boosted
    .map(([key, priority]) => ({
      key,
      priority,
      quiz: quizFromPitchKey(key, direction, enabledIds),
    }))
    .filter((entry): entry is { key: string; priority: number; quiz: Quiz } => entry.quiz !== null)

  if (validBoosted.length === 0) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  const boostedWeight = validBoosted.reduce((sum, entry) => sum + entry.priority, 0)
  const total = boostedWeight + BASELINE_MASS

  if (Math.random() * total >= boostedWeight) {
    return randomQuiz(enabledIds, direction, rootMin, rootMax)
  }

  let pick = Math.random() * boostedWeight
  for (const entry of validBoosted) {
    pick -= entry.priority
    if (pick <= 0) {
      return entry.quiz
    }
  }

  return validBoosted[validBoosted.length - 1]!.quiz
}

function isQuizPriorityStore(value: unknown): value is QuizPriorityStore {
  if (typeof value !== 'object' || value === null) return false

  return Object.entries(value).every(
    ([key, priority]) => key.length > 0 && typeof priority === 'number' && priority > 1,
  )
}

export function loadQuizPriorities(): QuizPriorityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    return isQuizPriorityStore(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveQuizPriorities(store: QuizPriorityStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Ignore quota / private mode errors.
  }
}
