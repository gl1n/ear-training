export const FRETBOARD_NOTE_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const

export type FretboardNoteName = (typeof FRETBOARD_NOTE_NAMES)[number]

export const C_MAJOR_NOTE_NAMES: readonly FretboardNoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export type FretboardCell = {
  stringIndex: number
  fret: number
  note: FretboardNoteName
  midi: number
}

export type FretboardRegion = {
  stringStart: number
  fretStart: number
}

export type FretboardQuestion = {
  region: FretboardRegion
  targetNote: FretboardNoteName
}

export type FretboardRegionCounts = Record<string, number>

export type FretboardStat = {
  attempts: number
  correct: number
  totalReactionMs: number
}

export type FretboardStats = {
  notes: Partial<Record<FretboardNoteName, FretboardStat>>
  regions: Record<string, FretboardStat>
  questions: Record<string, FretboardStat>
  answers: FretboardAnswerRecord[]
  mistakes: FretboardMistakeRecord[]
}

export type FretboardAnswerRecord = {
  position: Pick<FretboardCell, 'stringIndex' | 'fret'>
  correct: boolean
  recordedAt: number
}

export type FretboardWrongSelectionRecord = {
  position: Pick<FretboardCell, 'stringIndex' | 'fret'>
  selectedNote: FretboardNoteName
  targetNote: FretboardNoteName
  region: FretboardRegion
  recordedAt: number
}

export type FretboardTimeoutMistakeRecord = {
  timedOut: true
  targetNote: FretboardNoteName
  region: FretboardRegion
  recordedAt: number
}

export type FretboardMistakeRecord = FretboardWrongSelectionRecord | FretboardTimeoutMistakeRecord

export const EMPTY_FRETBOARD_STATS: FretboardStats = {
  notes: {},
  regions: {},
  questions: {},
  answers: [],
  mistakes: [],
}
export const FRETBOARD_RECORD_LIMIT = 200

// From the first (high E) string to the sixth (low E) string.
const OPEN_STRING_PITCH_CLASSES = [4, 11, 7, 2, 9, 4]
const OPEN_STRING_MIDIS = [64, 59, 55, 50, 45, 40]

export function noteAt(stringIndex: number, fret: number): FretboardNoteName {
  const pitchClass = (OPEN_STRING_PITCH_CLASSES[stringIndex] + fret) % 12
  return FRETBOARD_NOTE_NAMES[pitchClass]
}

export function midiAt(stringIndex: number, fret: number): number {
  return OPEN_STRING_MIDIS[stringIndex] + fret
}

export function fretboardCellsForNote(targetNote: FretboardNoteName): FretboardCell[] {
  return Array.from({ length: 6 }, (_, stringIndex) => (
    Array.from({ length: 13 }, (_, fret) => ({
      stringIndex,
      fret,
      note: noteAt(stringIndex, fret),
      midi: midiAt(stringIndex, fret),
    }))
  )).flat().filter((cell) => cell.note === targetNote)
}

export function randomFretboardNote(
  random: () => number = Math.random,
  allowedNotes: readonly FretboardNoteName[] = FRETBOARD_NOTE_NAMES,
): FretboardNoteName {
  const notes = allowedNotes.length > 0 ? allowedNotes : FRETBOARD_NOTE_NAMES
  return notes[Math.floor(random() * notes.length)]!
}

export function regionId(region: FretboardRegion): string {
  return `s${region.stringStart + 1}-${region.stringStart + 3}:f${region.fretStart}-${region.fretStart + 3}`
}

export function questionId(question: FretboardQuestion): string {
  return `${regionId(question.region)}:${question.targetNote}`
}

export function formatRegion(region: FretboardRegion): string {
  return `${region.stringStart + 1}–${region.stringStart + 3} 弦 · ${region.fretStart}–${region.fretStart + 3} 品`
}

const FRETBOARD_REGIONS: readonly FretboardRegion[] = Array.from(
  { length: 40 },
  (_, index) => ({ stringStart: Math.floor(index / 10), fretStart: index % 10 }),
)

function createRandomFretboardQuestion(
  random: () => number,
  sessionRegionCounts: FretboardRegionCounts,
  allowedNotes: readonly FretboardNoteName[],
): FretboardQuestion {
  const maxCount = Math.max(
    0,
    ...FRETBOARD_REGIONS.map((region) => sessionRegionCounts[regionId(region)] ?? 0),
  )
  const weights = FRETBOARD_REGIONS.map(
    (region) => maxCount - (sessionRegionCounts[regionId(region)] ?? 0) + 1,
  )
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let pick = random() * totalWeight
  let region = FRETBOARD_REGIONS[FRETBOARD_REGIONS.length - 1]!
  for (let index = 0; index < FRETBOARD_REGIONS.length; index += 1) {
    pick -= weights[index]!
    if (pick < 0) {
      region = FRETBOARD_REGIONS[index]!
      break
    }
  }
  const regionNotes = Array.from({ length: 12 }, (_, index) => (
    noteAt(region.stringStart + Math.floor(index / 4), region.fretStart + index % 4)
  ))
  const availableNotes = regionNotes.filter((note) => allowedNotes.includes(note))
  const targetNotes = availableNotes.length > 0 ? availableNotes : regionNotes
  return {
    region,
    targetNote: targetNotes[Math.floor(random() * targetNotes.length)]!,
  }
}

export function isFretboardMistakeRecord(value: unknown): value is FretboardMistakeRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<FretboardMistakeRecord>
  const region = record.region
  const hasCommonFields = Boolean(
    FRETBOARD_NOTE_NAMES.includes(record.targetNote as FretboardNoteName)
    && region
    && Number.isInteger(region.stringStart)
    && region.stringStart >= 0
    && region.stringStart <= 3
    && Number.isInteger(region.fretStart)
    && region.fretStart >= 0
    && region.fretStart <= 9
    && typeof record.recordedAt === 'number'
    && Number.isFinite(record.recordedAt),
  )
  if (!hasCommonFields) return false
  if ('timedOut' in record) return record.timedOut === true

  const wrongSelection = record as Partial<FretboardWrongSelectionRecord>
  const position = wrongSelection.position
  return Boolean(
    position
    && Number.isInteger(position.stringIndex)
    && position.stringIndex >= 0
    && position.stringIndex <= 5
    && Number.isInteger(position.fret)
    && position.fret >= 0
    && position.fret <= 12
    && FRETBOARD_NOTE_NAMES.includes(wrongSelection.selectedNote as FretboardNoteName),
  )
}

export function recentFretboardMistakes(
  mistakes: readonly unknown[],
  _now: number = Date.now(),
): FretboardMistakeRecord[] {
  return mistakes
    .filter((mistake): mistake is FretboardMistakeRecord => isFretboardMistakeRecord(mistake))
    .slice(-FRETBOARD_RECORD_LIMIT)
}

export function recentFretboardAnswers(
  answers: readonly unknown[],
  _now: number = Date.now(),
): FretboardAnswerRecord[] {
  return answers
    .filter((value): value is FretboardAnswerRecord => {
      if (!value || typeof value !== 'object') return false
      const answer = value as Partial<FretboardAnswerRecord>
      return Boolean(
        answer.position
        && Number.isInteger(answer.position.stringIndex)
        && answer.position.stringIndex >= 0
        && answer.position.stringIndex <= 5
        && Number.isInteger(answer.position.fret)
        && answer.position.fret >= 0
        && answer.position.fret <= 12
        && typeof answer.correct === 'boolean'
        && typeof answer.recordedAt === 'number'
        && Number.isFinite(answer.recordedAt),
      )
    })
    .slice(-FRETBOARD_RECORD_LIMIT)
}

function smoothedErrorRate(stat: FretboardStat): number {
  const errors = stat.attempts - stat.correct
  return (errors + 1) / (stat.attempts + 2)
}

/**
 * Up to half of generated questions review recent mistakes. Review candidates
 * are unique note + region pairs weighted by their smoothed error rate, and the
 * review share falls as the weakest candidate's error rate improves.
 */
export function createFretboardQuestion(
  random: () => number = Math.random,
  stats: FretboardStats = EMPTY_FRETBOARD_STATS,
  now: number = Date.now(),
  sessionRegionCounts: FretboardRegionCounts = {},
  allowedNotes: readonly FretboardNoteName[] = FRETBOARD_NOTE_NAMES,
): FretboardQuestion {
  const candidates = Array.from(
    recentFretboardMistakes(stats.mistakes, now).reduce<Map<string, FretboardQuestion>>((result, mistake) => {
      const question = { region: { ...mistake.region }, targetNote: mistake.targetNote }
      if (allowedNotes.includes(question.targetNote)) result.set(questionId(question), question)
      return result
    }, new Map()),
  ).flatMap(([id, question]) => {
    const stat = stats.questions[id]
    return [{ question, weight: stat ? smoothedErrorRate(stat) : 1 }]
  })

  const maxErrorRate = Math.max(0, ...candidates.map(({ weight }) => weight))
  if (candidates.length === 0 || random() >= 0.5 * maxErrorRate) {
    return createRandomFretboardQuestion(random, sessionRegionCounts, allowedNotes)
  }

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0)
  let pick = random() * totalWeight
  for (const candidate of candidates) {
    pick -= candidate.weight
    if (pick < 0) return candidate.question
  }
  return candidates[candidates.length - 1]!.question
}

function updateStat(stat: FretboardStat | undefined, correct: boolean, reactionMs: number) {
  return {
    attempts: (stat?.attempts ?? 0) + 1,
    correct: (stat?.correct ?? 0) + (correct ? 1 : 0),
    totalReactionMs: (stat?.totalReactionMs ?? 0) + reactionMs,
  }
}

export function recordFretboardAnswer(
  stats: FretboardStats,
  question: FretboardQuestion,
  selectedCell: FretboardCell,
  correct: boolean,
  reactionMs: number,
  recordedAt: number = Date.now(),
): FretboardStats {
  const id = regionId(question.region)
  const exactQuestionId = questionId(question)
  const recentMistakes = recentFretboardMistakes(stats.mistakes, recordedAt)
  const recentAnswers = recentFretboardAnswers(stats.answers, recordedAt)
  return {
    notes: {
      ...stats.notes,
      [question.targetNote]: updateStat(stats.notes[question.targetNote], correct, reactionMs),
    },
    regions: {
      ...stats.regions,
      [id]: updateStat(stats.regions[id], correct, reactionMs),
    },
    questions: {
      ...stats.questions,
      [exactQuestionId]: updateStat(stats.questions[exactQuestionId], correct, reactionMs),
    },
    answers: recentFretboardAnswers([
      ...recentAnswers,
      {
        position: { stringIndex: selectedCell.stringIndex, fret: selectedCell.fret },
        correct,
        recordedAt,
      },
    ]),
    mistakes: correct ? recentMistakes : recentFretboardMistakes([
      ...recentMistakes,
      {
        position: { stringIndex: selectedCell.stringIndex, fret: selectedCell.fret },
        selectedNote: selectedCell.note,
        targetNote: question.targetNote,
        region: { ...question.region },
        recordedAt,
      },
    ]),
  }
}

export function recordFretboardTimeout(
  stats: FretboardStats,
  question: FretboardQuestion,
  reactionMs: number,
  recordedAt: number = Date.now(),
  wholeBoard: boolean = false,
): FretboardStats {
  const id = regionId(question.region)
  const exactQuestionId = questionId(question)
  const recentAnswers = recentFretboardAnswers(stats.answers, recordedAt)
  const targetCells = fretboardCellsForNote(question.targetNote).filter((cell) => (
    wholeBoard || (
      cell.stringIndex >= question.region.stringStart
      && cell.stringIndex <= question.region.stringStart + 2
      && cell.fret >= question.region.fretStart
      && cell.fret <= question.region.fretStart + 3
    )
  ))

  return {
    notes: {
      ...stats.notes,
      [question.targetNote]: updateStat(stats.notes[question.targetNote], false, reactionMs),
    },
    regions: {
      ...stats.regions,
      [id]: updateStat(stats.regions[id], false, reactionMs),
    },
    questions: {
      ...stats.questions,
      [exactQuestionId]: updateStat(stats.questions[exactQuestionId], false, reactionMs),
    },
    answers: recentFretboardAnswers([
      ...recentAnswers,
      ...targetCells.map((cell) => ({
        position: { stringIndex: cell.stringIndex, fret: cell.fret },
        correct: false,
        recordedAt,
      })),
    ]),
    mistakes: recentFretboardMistakes([
      ...recentFretboardMistakes(stats.mistakes, recordedAt),
      {
        timedOut: true,
        targetNote: question.targetNote,
        region: { ...question.region },
        recordedAt,
      },
    ]),
  }
}

export function fretboardMistakeHeatmap(
  answers: readonly FretboardAnswerRecord[],
  now: number = Date.now(),
): Record<string, number> {
  const totals = recentFretboardAnswers(answers, now).reduce<Record<string, { attempts: number; errors: number }>>(
    (distribution, answer) => {
      const key = `${answer.position.stringIndex}:${answer.position.fret}`
      const current = distribution[key] ?? { attempts: 0, errors: 0 }
      distribution[key] = {
        attempts: current.attempts + 1,
        errors: current.errors + (answer.correct ? 0 : 1),
      }
      return distribution
    },
    {},
  )
  return Object.fromEntries(
    Object.entries(totals).map(([key, stat]) => [key, stat.errors / stat.attempts]),
  )
}

export function accuracy(stat: FretboardStat): number {
  return stat.attempts === 0 ? 0 : stat.correct / stat.attempts
}

export function averageReactionMs(stat: FretboardStat): number {
  return stat.attempts === 0 ? 0 : stat.totalReactionMs / stat.attempts
}
