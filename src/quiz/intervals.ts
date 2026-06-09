type Interval = {
  id: string
  semitones: number
  name: string
  short: string
}

export const INTERVALS: Interval[] = [
  { id: 'm2', semitones: 1, name: '小二度', short: '小二' },
  { id: 'M2', semitones: 2, name: '大二度', short: '大二' },
  { id: 'm3', semitones: 3, name: '小三度', short: '小三' },
  { id: 'M3', semitones: 4, name: '大三度', short: '大三' },
  { id: 'P4', semitones: 5, name: '纯四度', short: '纯四' },
  { id: 'A4', semitones: 6, name: '增四度', short: '增四' },
  { id: 'P5', semitones: 7, name: '纯五度', short: '纯五' },
  { id: 'm6', semitones: 8, name: '小六度', short: '小六' },
  { id: 'M6', semitones: 9, name: '大六度', short: '大六' },
  { id: 'm7', semitones: 10, name: '小七度', short: '小七' },
  { id: 'M7', semitones: 11, name: '大七度', short: '大七' },
  { id: 'P8', semitones: 12, name: '纯八度', short: '纯八' },
]

export const ALL_INTERVAL_IDS = INTERVALS.map((interval) => interval.id)

export type IntervalDirection = 'ascending' | 'descending' | 'harmonic'

export const DIRECTION_OPTIONS: {
  value: IntervalDirection
  label: string
  description: string
}[] = [
  { value: 'ascending', label: '上行', description: '低音 → 高音' },
  { value: 'descending', label: '下行', description: '高音 → 低音' },
  { value: 'harmonic', label: '和弦', description: '两音同时' },
]

export const DIRECTION_SELECT_OPTIONS = DIRECTION_OPTIONS.map(({ value, label }) => ({
  value,
  label,
}))

export type Quiz = {
  root: number
  second: number
  interval: Interval
  direction: IntervalDirection
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const name = NOTE_NAMES[midi % 12]
  return `${name}${octave}`
}

export function getIntervalsByIds(ids: string[]): Interval[] {
  const idSet = new Set(ids)
  return INTERVALS.filter((interval) => idSet.has(interval.id))
}

export function isRootValidForInterval(
  root: number,
  interval: Interval,
  direction: IntervalDirection,
  rootMin: number,
  rootMax: number,
): boolean {
  if (direction === 'descending') {
    const minRoot = rootMin + interval.semitones
    const maxRoot = Math.min(rootMax, 127)
    return root >= minRoot && root <= maxRoot
  }

  const maxRoot = Math.min(rootMax, 127 - interval.semitones)
  return root >= rootMin && root <= maxRoot
}

export function getValidIntervalsAtRoot(
  root: number,
  enabledIds: string[],
  direction: IntervalDirection,
  rootMin: number,
  rootMax: number,
): Interval[] {
  const pool = INTERVALS.filter((interval) => enabledIds.includes(interval.id))
  return pool.filter((interval) =>
    isRootValidForInterval(root, interval, direction, rootMin, rootMax),
  )
}

export function randomQuizWithRoot(
  root: number,
  enabledIds: string[],
  direction: IntervalDirection,
  rootMin = 48,
  rootMax = 85,
): Quiz | null {
  const valid = getValidIntervalsAtRoot(root, enabledIds, direction, rootMin, rootMax)
  if (valid.length === 0) return null

  const interval = valid[Math.floor(Math.random() * valid.length)]!

  if (direction === 'descending') {
    return { root, second: root - interval.semitones, interval, direction }
  }

  return { root, second: root + interval.semitones, interval, direction }
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

export function randomQuiz(
  enabledIds: string[],
  direction: IntervalDirection,
  rootMin = 48,
  rootMax = 85,
): Quiz {
  const pool = INTERVALS.filter((interval) => enabledIds.includes(interval.id))
  if (pool.length === 0) {
    throw new Error('至少选择一个音程')
  }

  const interval = pool[Math.floor(Math.random() * pool.length)]!

  if (direction === 'descending') {
    const minRoot = rootMin + interval.semitones
    const maxRoot = Math.min(rootMax, 127)
    const root = minRoot + Math.floor(Math.random() * (maxRoot - minRoot + 1))
    return { root, second: root - interval.semitones, interval, direction }
  }

  const maxRoot = Math.min(rootMax, 127 - interval.semitones)
  const root = rootMin + Math.floor(Math.random() * (maxRoot - rootMin + 1))
  return { root, second: root + interval.semitones, interval, direction }
}
