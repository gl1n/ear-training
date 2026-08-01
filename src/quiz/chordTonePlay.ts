export const CHORD_TONE_QUALITIES = ['maj7', '7', 'm7', 'm7b5'] as const

export type ChordToneQuality = (typeof CHORD_TONE_QUALITIES)[number]
export type ChordToneDegree = '1' | '3' | '5' | '7'
export type TargetChordToneDegree = '3' | '7'

type RootOption = {
  name: string
  pitchClass: number
}

type QualityDefinition = {
  symbol: string
  label: string
  intervals: Record<ChordToneDegree, number>
  degreeLabels: Record<ChordToneDegree, string>
}

export type ChordTone = {
  degree: ChordToneDegree
  degreeLabel: string
  noteName: string
  pitchClass: number
}

export type ChordToneQuestion = {
  id: string
  symbol: string
  quality: ChordToneQuality
  qualityLabel: string
  rootName: string
  rootPitchClass: number
  midis: number[]
  tones: Record<ChordToneDegree, ChordTone>
  targetDegrees: readonly ['3', '7']
}

export type ChordToneAnswerClassification =
  | { kind: 'target'; tone: ChordTone }
  | { kind: 'other-chord-tone'; tone: ChordTone }
  | { kind: 'outside'; pitchClass: number }

export const CHORD_TONE_ROOTS: readonly RootOption[] = [
  { name: 'C', pitchClass: 0 },
  { name: 'C♯', pitchClass: 1 },
  { name: 'D', pitchClass: 2 },
  { name: 'E♭', pitchClass: 3 },
  { name: 'E', pitchClass: 4 },
  { name: 'F', pitchClass: 5 },
  { name: 'F♯', pitchClass: 6 },
  { name: 'G', pitchClass: 7 },
  { name: 'A♭', pitchClass: 8 },
  { name: 'A', pitchClass: 9 },
  { name: 'B♭', pitchClass: 10 },
  { name: 'B', pitchClass: 11 },
]

const QUALITY_DEFINITIONS: Record<ChordToneQuality, QualityDefinition> = {
  maj7: {
    symbol: 'maj7',
    label: '大七和弦',
    intervals: { 1: 0, 3: 4, 5: 7, 7: 11 },
    degreeLabels: { 1: '根音', 3: '3 音', 5: '5 音', 7: '7 音' },
  },
  7: {
    symbol: '7',
    label: '属七和弦',
    intervals: { 1: 0, 3: 4, 5: 7, 7: 10 },
    degreeLabels: { 1: '根音', 3: '3 音', 5: '5 音', 7: '♭7 音' },
  },
  m7: {
    symbol: 'm7',
    label: '小七和弦',
    intervals: { 1: 0, 3: 3, 5: 7, 7: 10 },
    degreeLabels: { 1: '根音', 3: '♭3 音', 5: '5 音', 7: '♭7 音' },
  },
  m7b5: {
    symbol: 'm7♭5',
    label: '半减七和弦',
    intervals: { 1: 0, 3: 3, 5: 6, 7: 10 },
    degreeLabels: { 1: '根音', 3: '♭3 音', 5: '♭5 音', 7: '♭7 音' },
  },
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const NATURAL_PITCH_CLASSES: Record<(typeof LETTERS)[number], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}
const DEGREES: readonly ChordToneDegree[] = ['1', '3', '5', '7']

function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12
}

function spellDegree(rootName: string, degree: ChordToneDegree, pitchClass: number): string {
  const rootLetterIndex = LETTERS.indexOf(rootName[0] as (typeof LETTERS)[number])
  const letterOffset = Number(degree) - 1
  const letter = LETTERS[(rootLetterIndex + letterOffset) % LETTERS.length]!
  let accidentalOffset = normalizePitchClass(pitchClass - NATURAL_PITCH_CLASSES[letter])
  if (accidentalOffset > 6) accidentalOffset -= 12
  const accidental = accidentalOffset > 0
    ? '♯'.repeat(accidentalOffset)
    : '♭'.repeat(Math.abs(accidentalOffset))
  return `${letter}${accidental}`
}

export function buildChordToneQuestion(
  root: RootOption,
  quality: ChordToneQuality,
): ChordToneQuestion {
  const definition = QUALITY_DEFINITIONS[quality]
  const tones = Object.fromEntries(DEGREES.map((degree) => {
    const pitchClass = normalizePitchClass(root.pitchClass + definition.intervals[degree])
    return [degree, {
      degree,
      degreeLabel: definition.degreeLabels[degree],
      noteName: spellDegree(root.name, degree, pitchClass),
      pitchClass,
    }]
  })) as Record<ChordToneDegree, ChordTone>
  const rootMidi = 48 + root.pitchClass

  return {
    id: `${root.pitchClass}:${quality}`,
    symbol: `${root.name}${definition.symbol}`,
    quality,
    qualityLabel: definition.label,
    rootName: root.name,
    rootPitchClass: root.pitchClass,
    midis: DEGREES.map((degree) => rootMidi + definition.intervals[degree]),
    tones,
    targetDegrees: ['3', '7'],
  }
}

export function createChordToneQuestion(
  random: () => number = Math.random,
  previousQuestionId?: string,
): ChordToneQuestion {
  const questionCount = CHORD_TONE_ROOTS.length * CHORD_TONE_QUALITIES.length
  let index = Math.floor(random() * questionCount)
  let root = CHORD_TONE_ROOTS[Math.floor(index / CHORD_TONE_QUALITIES.length)]!
  let quality = CHORD_TONE_QUALITIES[index % CHORD_TONE_QUALITIES.length]!
  let question = buildChordToneQuestion(root, quality)

  if (question.id === previousQuestionId) {
    index = (index + 1) % questionCount
    root = CHORD_TONE_ROOTS[Math.floor(index / CHORD_TONE_QUALITIES.length)]!
    quality = CHORD_TONE_QUALITIES[index % CHORD_TONE_QUALITIES.length]!
    question = buildChordToneQuestion(root, quality)
  }

  return question
}

export function classifyChordToneAnswer(
  question: ChordToneQuestion,
  midi: number,
): ChordToneAnswerClassification {
  const pitchClass = normalizePitchClass(midi)
  const tone = DEGREES.map((degree) => question.tones[degree])
    .find((candidate) => candidate.pitchClass === pitchClass)

  if (!tone) return { kind: 'outside', pitchClass }
  if (tone.degree === '3' || tone.degree === '7') return { kind: 'target', tone }
  return { kind: 'other-chord-tone', tone }
}

export function chromaticNoteName(pitchClass: number): string {
  return ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][
    normalizePitchClass(pitchClass)
  ]!
}

export function formatChordToneReactionMs(reactionMs: number | null): string {
  if (reactionMs === null || !Number.isFinite(reactionMs) || reactionMs < 0) return '—'
  return `${(reactionMs / 1000).toFixed(1)}s`
}
