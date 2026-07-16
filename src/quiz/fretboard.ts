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

type FretboardNoteName = (typeof FRETBOARD_NOTE_NAMES)[number]

export type FretboardCell = {
  stringIndex: number
  fret: number
  note: FretboardNoteName
  midi: number
}

type FretboardRegion = {
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
}

export const EMPTY_FRETBOARD_STATS: FretboardStats = { notes: {}, regions: {} }

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

export function createFretboardQuestion(random: () => number = Math.random): FretboardQuestion {
  const region: FretboardRegion = {
    stringStart: Math.floor(random() * 4),
    fretStart: Math.floor(random() * 9) + 1,
  }
  const targetIndex = Math.floor(random() * 12)
  const targetString = region.stringStart + Math.floor(targetIndex / 4)
  const targetFret = region.fretStart + targetIndex % 4
  return { region, targetNote: noteAt(targetString, targetFret) }
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
  correct: boolean,
  reactionMs: number,
): FretboardStats {
  const id = regionId(question.region)
  return {
    notes: {
      ...stats.notes,
      [question.targetNote]: updateStat(stats.notes[question.targetNote], correct, reactionMs),
    },
    regions: {
      ...stats.regions,
      [id]: updateStat(stats.regions[id], correct, reactionMs),
    },
  }
}

export function accuracy(stat: FretboardStat): number {
  return stat.attempts === 0 ? 0 : stat.correct / stat.attempts
}

export function averageReactionMs(stat: FretboardStat): number {
  return stat.attempts === 0 ? 0 : stat.totalReactionMs / stat.attempts
}
