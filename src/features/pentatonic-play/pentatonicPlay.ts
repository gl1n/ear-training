import {
  FRETBOARD_NOTE_NAMES,
  midiAt,
  noteAt,
  type FretboardCell,
  type FretboardNoteName,
} from '../fretboard/fretboard'

export type PentatonicScaleId = 'major' | 'minor'
export const PENTATONIC_REPETITIONS_PER_POSITION = 3

export type PentatonicQuestion = {
  rootNote: FretboardNoteName
  notes: FretboardNoteName[]
  degreeLabels: string[]
  rootPosition: FretboardCell
  guidePosition: FretboardCell
  guideIndex: number
}

export const PENTATONIC_SCALES = {
  major: {
    label: '大调五声音阶',
    intervals: [0, 2, 4, 7, 9],
    degrees: ['1', '2', '3', '5', '6'],
    guideIndexes: [2, 3],
  },
  minor: {
    label: '小调五声音阶',
    intervals: [0, 3, 5, 7, 10],
    degrees: ['1', '♭3', '4', '5', '♭7'],
    guideIndexes: [1, 3],
  },
} as const

function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

export function noteNameForPitchClass(value: number): FretboardNoteName {
  return FRETBOARD_NOTE_NAMES[((value % 12) + 12) % 12]!
}

export function midiMatchesNoteName(midi: number, note: FretboardNoteName): boolean {
  return noteNameForPitchClass(midi) === note
}

export function advancePentatonicRepetition(completedRepetitions: number): {
  completedRepetitions: number
  positionComplete: boolean
} {
  const nextCompleted = Math.min(
    Math.max(0, completedRepetitions) + 1,
    PENTATONIC_REPETITIONS_PER_POSITION,
  )
  return {
    completedRepetitions: nextCompleted,
    positionComplete: nextCompleted === PENTATONIC_REPETITIONS_PER_POSITION,
  }
}

function allFretboardCells(): FretboardCell[] {
  return Array.from({ length: 6 }, (_, stringIndex) => (
    Array.from({ length: 13 }, (_, fret) => ({
      stringIndex,
      fret,
      note: noteAt(stringIndex, fret),
      midi: midiAt(stringIndex, fret),
    }))
  )).flat()
}

export function questionKey(question: Pick<PentatonicQuestion, 'rootPosition' | 'guidePosition'>): string {
  return `${question.rootPosition.stringIndex}:${question.rootPosition.fret}-${question.guidePosition.stringIndex}:${question.guidePosition.fret}`
}

export function createPentatonicQuestion(
  random: () => number = Math.random,
  scaleId: PentatonicScaleId = 'minor',
  previousKey?: string,
  fixedRootNote?: FretboardNoteName,
): PentatonicQuestion {
  const cells = allFretboardCells()
  const scale = PENTATONIC_SCALES[scaleId]
  const guideIndex = scale.guideIndexes[Math.floor(Math.max(0, random()) * scale.guideIndexes.length) % scale.guideIndexes.length]!
  const candidates = cells.flatMap((rootPosition) => {
    if (rootPosition.fret > 9 || (fixedRootNote && rootPosition.note !== fixedRootNote)) return []
    const guideNote = noteNameForPitchClass(pitchClass(rootPosition.midi) + scale.intervals[guideIndex]!)
    return cells
      .filter((guidePosition) => (
        guidePosition.note === guideNote
        && guidePosition.stringIndex !== rootPosition.stringIndex
        && Math.abs(guidePosition.stringIndex - rootPosition.stringIndex) <= 3
        && Math.abs(guidePosition.fret - rootPosition.fret) <= 4
      ))
      .map((guidePosition) => ({ rootPosition, guidePosition }))
  })
  const freshCandidates = candidates.filter((candidate) => (
    `${candidate.rootPosition.stringIndex}:${candidate.rootPosition.fret}-${candidate.guidePosition.stringIndex}:${candidate.guidePosition.fret}` !== previousKey
  ))
  const pool = freshCandidates.length > 0 ? freshCandidates : candidates
  const picked = pool[Math.floor(Math.max(0, random()) * pool.length) % pool.length]!
  const rootPitchClass = pitchClass(picked.rootPosition.midi)

  return {
    rootNote: noteNameForPitchClass(rootPitchClass),
    notes: scale.intervals.map((interval) => noteNameForPitchClass(rootPitchClass + interval)),
    degreeLabels: [...scale.degrees],
    rootPosition: picked.rootPosition,
    guidePosition: picked.guidePosition,
    guideIndex,
  }
}
