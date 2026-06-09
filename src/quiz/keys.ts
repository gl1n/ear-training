import { midiToNoteName } from './intervals'

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const

export const DEGREE_OPTION_IDS = ['1', '2', '3', '4', '5', '6', '7'] as const

const MIN_DIATONIC_NOTES_IN_RANGE = 3
/** 答题音最低到最高须覆盖的半音跨度（3 个八度） */
export const NOTE_KEY_QUIZ_SPAN_SEMITONES = 36
/** 根音到五音的跨度（I 级大三和弦） */
const TRIAD_SPAN_TO_FIFTH = 7

export type MajorKeySession = {
  tonicMidi: number
  tonicPitchClass: number
  label: string
}

export type NoteKeyQuiz = {
  tonicMidi: number
  noteMidi: number
  degree: number
  keyLabel: string
  previousNoteMidi: number | null
}

export function formatMajorKeyLabel(tonicMidi: number): string {
  const pitchName = midiToNoteName(tonicMidi).replace(/\d+$/, '')
  return `${pitchName} 大调`
}

export function isDiatonicInMajorKey(tonicPitchClass: number, midi: number): boolean {
  const interval = ((midi % 12) - tonicPitchClass + 12) % 12
  return MAJOR_SCALE_INTERVALS.includes(interval as (typeof MAJOR_SCALE_INTERVALS)[number])
}

export function listDiatonicMidisInRange(
  tonicPitchClass: number,
  rootMin: number,
  rootMax: number,
): number[] {
  const midis: number[] = []

  for (let midi = rootMin; midi <= rootMax; midi++) {
    if (isDiatonicInMajorKey(tonicPitchClass, midi)) {
      midis.push(midi)
    }
  }

  return midis
}

export function getDiatonicSpanInRange(
  tonicPitchClass: number,
  rootMin: number,
  rootMax: number,
): number {
  const midis = listDiatonicMidisInRange(tonicPitchClass, rootMin, rootMax)
  if (midis.length === 0) return 0
  return midis[midis.length - 1]! - midis[0]!
}

export function midiToDegree(tonicPitchClass: number, midi: number): number | null {
  const interval = ((midi % 12) - tonicPitchClass + 12) % 12
  const index = MAJOR_SCALE_INTERVALS.indexOf(interval as (typeof MAJOR_SCALE_INTERVALS)[number])
  return index === -1 ? null : index + 1
}

export function getTonicChordRootRange(
  rootMin: number,
  rootMax: number,
): { min: number; max: number } {
  const validMin = rootMin
  const validMax = rootMax - TRIAD_SPAN_TO_FIFTH
  const center = (validMin + validMax) / 2
  const halfSpan = (validMax - validMin) / 4

  return {
    min: Math.ceil(center - halfSpan),
    max: Math.floor(center + halfSpan),
  }
}

function pickMiddleRegisterTonicMidi(
  tonicPitchClass: number,
  rootMin: number,
  rootMax: number,
): number {
  const { min, max } = getTonicChordRootRange(rootMin, rootMax)
  const center = (min + max) / 2
  const candidates: number[] = []

  for (let midi = min; midi <= max; midi++) {
    if (midi % 12 === tonicPitchClass) {
      candidates.push(midi)
    }
  }

  if (candidates.length === 0) {
    for (let midi = rootMin; midi <= rootMax - TRIAD_SPAN_TO_FIFTH; midi++) {
      if (midi % 12 === tonicPitchClass) {
        candidates.push(midi)
      }
    }
  }

  candidates.sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b,
  )
  return candidates[0] ?? rootMin + ((tonicPitchClass - (rootMin % 12) + 12) % 12)
}

export function randomMajorKey(rootMin: number, rootMax: number): MajorKeySession {
  const pitchClasses: number[] = []

  for (let tonicPitchClass = 0; tonicPitchClass < 12; tonicPitchClass++) {
    const diatonicMidis = listDiatonicMidisInRange(tonicPitchClass, rootMin, rootMax)
    if (diatonicMidis.length >= MIN_DIATONIC_NOTES_IN_RANGE) {
      pitchClasses.push(tonicPitchClass)
    }
  }

  if (pitchClasses.length === 0) {
    const tonicMidi = 60
    return {
      tonicMidi,
      tonicPitchClass: tonicMidi % 12,
      label: formatMajorKeyLabel(tonicMidi),
    }
  }

  const tonicPitchClass =
    pitchClasses[Math.floor(Math.random() * pitchClasses.length)]!
  const tonicMidi = pickMiddleRegisterTonicMidi(tonicPitchClass, rootMin, rootMax)

  return {
    tonicMidi,
    tonicPitchClass,
    label: formatMajorKeyLabel(tonicMidi),
  }
}

export function createMajorKeySession(rootMin: number, rootMax: number): MajorKeySession {
  return randomMajorKey(rootMin, rootMax)
}

/** I 级大三和弦：根音、大三度、纯五度 */
export function getTonicMajorTriadMidis(tonicMidi: number): [number, number, number] {
  return [tonicMidi, tonicMidi + 4, tonicMidi + 7]
}

function pickWeightedByDistance(midis: number[], previousNoteMidi: number): number {
  const weights = midis.map((midi) => Math.abs(midi - previousNoteMidi))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  if (totalWeight === 0) {
    return midis[Math.floor(Math.random() * midis.length)]!
  }

  let pick = Math.random() * totalWeight
  for (let i = 0; i < midis.length; i++) {
    pick -= weights[i]!
    if (pick <= 0) {
      return midis[i]!
    }
  }

  return midis[midis.length - 1]!
}

export function randomNoteKeyQuiz(
  session: MajorKeySession,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): NoteKeyQuiz {
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax)
  const noteMidi =
    previousNoteMidi == null
      ? midis[Math.floor(Math.random() * midis.length)]!
      : pickWeightedByDistance(midis, previousNoteMidi)
  const degree = midiToDegree(session.tonicPitchClass, noteMidi)

  if (degree === null) {
    throw new Error('随机调内音不在大调音阶内')
  }

  return {
    tonicMidi: session.tonicMidi,
    noteMidi,
    degree,
    keyLabel: session.label,
    previousNoteMidi: previousNoteMidi ?? null,
  }
}

export function noteKeyQuizFromMistake(
  session: MajorKeySession,
  record: { correctDegree: number },
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): NoteKeyQuiz | null {
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax).filter(
    (midi) => midiToDegree(session.tonicPitchClass, midi) === record.correctDegree,
  )

  if (midis.length === 0) return null

  const noteMidi =
    previousNoteMidi == null
      ? midis[Math.floor(Math.random() * midis.length)]!
      : pickWeightedByDistance(midis, previousNoteMidi)

  return {
    tonicMidi: session.tonicMidi,
    noteMidi,
    degree: record.correctDegree,
    keyLabel: session.label,
    previousNoteMidi: previousNoteMidi ?? null,
  }
}
