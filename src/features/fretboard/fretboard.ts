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

export type FretboardStat = {
  attempts: number
  correct: number
  totalReactionMs: number
}

export type FretboardStats = {
  notes: Partial<Record<FretboardNoteName, FretboardStat>>
  regions: Record<string, FretboardStat>
  mistakes: FretboardMistakeRecord[]
}

export type FretboardMistakeRecord = {
  position: Pick<FretboardCell, 'stringIndex' | 'fret'>
  selectedNote: FretboardNoteName
  targetNote: FretboardNoteName
  region: FretboardRegion
  recordedAt: number
}

export const EMPTY_FRETBOARD_STATS: FretboardStats = { notes: {}, regions: {}, mistakes: [] }
export const FRETBOARD_MISTAKE_RETENTION_MS = 48 * 60 * 60 * 1000

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

export function regionId(region: FretboardRegion): string {
  return `s${region.stringStart + 1}-${region.stringStart + 3}:f${region.fretStart}-${region.fretStart + 3}`
}

export function formatRegion(region: FretboardRegion): string {
  return `${region.stringStart + 1}–${region.stringStart + 3} 弦 · ${region.fretStart}–${region.fretStart + 3} 品`
}

function createRandomFretboardQuestion(random: () => number): FretboardQuestion {
  const region: FretboardRegion = {
    stringStart: Math.floor(random() * 4),
    fretStart: Math.floor(random() * 9) + 1,
  }
  const targetIndex = Math.floor(random() * 12)
  const targetString = region.stringStart + Math.floor(targetIndex / 4)
  const targetFret = region.fretStart + targetIndex % 4
  return { region, targetNote: noteAt(targetString, targetFret) }
}

export function isFretboardMistakeRecord(value: unknown): value is FretboardMistakeRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<FretboardMistakeRecord>
  const position = record.position
  const region = record.region
  return Boolean(
    position
    && Number.isInteger(position.stringIndex)
    && position.stringIndex >= 0
    && position.stringIndex <= 5
    && Number.isInteger(position.fret)
    && position.fret >= 1
    && position.fret <= 12
    && FRETBOARD_NOTE_NAMES.includes(record.selectedNote as FretboardNoteName)
    && FRETBOARD_NOTE_NAMES.includes(record.targetNote as FretboardNoteName)
    && region
    && Number.isInteger(region.stringStart)
    && region.stringStart >= 0
    && region.stringStart <= 3
    && Number.isInteger(region.fretStart)
    && region.fretStart >= 1
    && region.fretStart <= 9
    && typeof record.recordedAt === 'number'
    && Number.isFinite(record.recordedAt),
  )
}

export function recentFretboardMistakes(
  mistakes: readonly unknown[],
  now: number = Date.now(),
): FretboardMistakeRecord[] {
  const cutoff = now - FRETBOARD_MISTAKE_RETENTION_MS
  return mistakes.filter((mistake): mistake is FretboardMistakeRecord => (
    isFretboardMistakeRecord(mistake) && mistake.recordedAt >= cutoff
  ))
}

/**
 * Half of generated questions are uniform random. The other half samples a
 * previous mistake event, which naturally weights the joint note + region pair
 * by its recorded mistake frequency.
 */
export function createFretboardQuestion(
  random: () => number = Math.random,
  mistakes: readonly FretboardMistakeRecord[] = [],
  now: number = Date.now(),
): FretboardQuestion {
  const usableMistakes = recentFretboardMistakes(mistakes, now)
  if (usableMistakes.length === 0 || random() < 0.5) {
    return createRandomFretboardQuestion(random)
  }

  const picked = usableMistakes[Math.floor(random() * usableMistakes.length)]!
  return { region: { ...picked.region }, targetNote: picked.targetNote }
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
  const recentMistakes = recentFretboardMistakes(stats.mistakes, recordedAt)
  return {
    notes: {
      ...stats.notes,
      [question.targetNote]: updateStat(stats.notes[question.targetNote], correct, reactionMs),
    },
    regions: {
      ...stats.regions,
      [id]: updateStat(stats.regions[id], correct, reactionMs),
    },
    mistakes: correct ? recentMistakes : [
      ...recentMistakes,
      {
        position: { stringIndex: selectedCell.stringIndex, fret: selectedCell.fret },
        selectedNote: selectedCell.note,
        targetNote: question.targetNote,
        region: { ...question.region },
        recordedAt,
      },
    ],
  }
}

export function fretboardMistakeHeatmap(
  mistakes: readonly FretboardMistakeRecord[],
  now: number = Date.now(),
): Record<string, number> {
  return recentFretboardMistakes(mistakes, now).reduce<Record<string, number>>((distribution, mistake) => {
    const key = `${mistake.position.stringIndex}:${mistake.position.fret}`
    distribution[key] = (distribution[key] ?? 0) + 1
    return distribution
  }, {})
}

export function accuracy(stat: FretboardStat): number {
  return stat.attempts === 0 ? 0 : stat.correct / stat.attempts
}

export function averageReactionMs(stat: FretboardStat): number {
  return stat.attempts === 0 ? 0 : stat.totalReactionMs / stat.attempts
}
