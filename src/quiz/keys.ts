import { midiToNoteName } from './intervals'
import type { SessionDegreeWeights } from './stats'
import { pickUniform, pickWeighted } from './weightedPick'

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const

export const DEGREE_OPTION_IDS = ['1', '2', '3', '4', '5', '6', '7'] as const

export const DEGREE_SOLFEGE_LABELS: Record<(typeof DEGREE_OPTION_IDS)[number], string> = {
  '1': 'do',
  '2': 're',
  '3': 'mi',
  '4': 'fa',
  '5': 'sol',
  '6': 'la',
  '7': 'si',
}

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

export const MELODY_NOTE_COUNT = 3

export type ScaleDegreeQuiz = {
  tonicMidi: number
  noteMidi: number
  degree: number
  keyLabel: string
  previousNoteMidi: number | null
}

export type MelodyScaleDegreeQuiz = ScaleDegreeQuiz & {
  noteMidis: readonly [number, number, number]
  degrees: readonly [number, number, number]
}

export function isMelodyScaleDegreeQuiz(
  quiz: ScaleDegreeQuiz,
): quiz is MelodyScaleDegreeQuiz {
  return 'noteMidis' in quiz && Array.isArray(quiz.noteMidis)
}

export function formatMelodyDegrees(degrees: readonly number[]): string {
  return degrees.join('-')
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

function listAvailableDegrees(midis: number[], tonicPitchClass: number): number[] {
  const degrees = new Set<number>()

  for (const midi of midis) {
    const degree = midiToDegree(tonicPitchClass, midi)
    if (degree !== null) {
      degrees.add(degree)
    }
  }

  return [...degrees]
}

function pickRandomDegree(
  midis: number[],
  tonicPitchClass: number,
  sessionDegreeWeights?: SessionDegreeWeights,
): number {
  const availableDegrees = listAvailableDegrees(midis, tonicPitchClass)
  if (availableDegrees.length === 0) {
    throw new Error('音域内没有可用的调内音级数')
  }

  return pickWeighted(availableDegrees, (degree) => sessionDegreeWeights?.[degree] ?? 1)!
}

/** 选定音级后，八度选择的理想跳距（半音）与高斯标准差。 */
const REGISTER_GAUSSIAN_IDEAL_DISTANCE = 5
const REGISTER_GAUSSIAN_SIGMA = 3

function gaussianJumpWeight(distance: number): number {
  const delta = Math.abs(distance) - REGISTER_GAUSSIAN_IDEAL_DISTANCE
  return Math.exp(-(delta * delta) / (2 * REGISTER_GAUSSIAN_SIGMA * REGISTER_GAUSSIAN_SIGMA))
}

function pickRegisterAmongMidis(midis: number[], previousNoteMidi: number | null): number {
  if (midis.length === 0) {
    throw new Error('没有可用的调内音')
  }

  if (previousNoteMidi === null) {
    return pickUniform(midis)!
  }

  const withoutSameMidi = midis.filter((midi) => midi !== previousNoteMidi)
  const pool = withoutSameMidi.length > 0 ? withoutSameMidi : midis

  return pickWeighted(pool, (midi) => gaussianJumpWeight(midi - previousNoteMidi))!
}

function pickRandomNoteMidi(
  midis: number[],
  tonicPitchClass: number,
  previousNoteMidi: number | null,
  sessionDegreeWeights?: SessionDegreeWeights,
  fixedDegree?: number,
): number {
  const degree =
    fixedDegree ?? pickRandomDegree(midis, tonicPitchClass, sessionDegreeWeights)
  const degreeMidis = midis.filter((midi) => midiToDegree(tonicPitchClass, midi) === degree)

  return pickRegisterAmongMidis(
    degreeMidis.length > 0 ? degreeMidis : midis,
    previousNoteMidi,
  )
}

export function randomScaleDegreeQuiz(
  session: MajorKeySession,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
  sessionDegreeWeights?: SessionDegreeWeights,
): ScaleDegreeQuiz {
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax)
  const noteMidi = pickRandomNoteMidi(
    midis,
    session.tonicPitchClass,
    previousNoteMidi ?? null,
    sessionDegreeWeights,
  )
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

function buildMelodyQuiz(
  session: MajorKeySession,
  noteMidis: [number, number, number],
  previousNoteMidi: number | null,
): MelodyScaleDegreeQuiz {
  const degrees = noteMidis.map(
    (midi) => midiToDegree(session.tonicPitchClass, midi)!,
  ) as [number, number, number]

  return {
    tonicMidi: session.tonicMidi,
    noteMidi: noteMidis[2],
    degree: degrees[2],
    noteMidis,
    degrees,
    keyLabel: session.label,
    previousNoteMidi,
  }
}

export function randomMelodyScaleDegreeQuiz(
  session: MajorKeySession,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
  sessionDegreeWeights?: SessionDegreeWeights,
): MelodyScaleDegreeQuiz {
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax)
  const noteMidis: [number, number, number] = [0, 0, 0]
  let prev = previousNoteMidi ?? null

  for (let i = 0; i < MELODY_NOTE_COUNT; i++) {
    const noteMidi = pickRandomNoteMidi(
      midis,
      session.tonicPitchClass,
      prev,
      sessionDegreeWeights,
    )
    const degree = midiToDegree(session.tonicPitchClass, noteMidi)

    if (degree === null) {
      throw new Error('随机调内音不在大调音阶内')
    }

    noteMidis[i] = noteMidi
    prev = noteMidi
  }

  return buildMelodyQuiz(session, noteMidis, previousNoteMidi ?? null)
}

export function randomMelodyScaleDegreeQuizWithTargetDegree(
  session: MajorKeySession,
  targetDegree: number,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
  targetNoteMidi?: number,
): MelodyScaleDegreeQuiz | null {
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax)
  const targetPosition = Math.floor(Math.random() * MELODY_NOTE_COUNT)
  const noteMidis: [number, number, number] = [0, 0, 0]
  let prev = previousNoteMidi ?? null

  for (let i = 0; i < MELODY_NOTE_COUNT; i++) {
    if (i === targetPosition) {
      if (targetNoteMidi !== undefined) {
        noteMidis[i] = targetNoteMidi
      } else {
        const degreeMidis = midis.filter(
          (midi) => midiToDegree(session.tonicPitchClass, midi) === targetDegree,
        )
        if (degreeMidis.length === 0) return null
        noteMidis[i] = pickRegisterAmongMidis(degreeMidis, prev)
      }
    } else {
      noteMidis[i] = pickRandomNoteMidi(midis, session.tonicPitchClass, prev)
    }
    prev = noteMidis[i]
  }

  return buildMelodyQuiz(session, noteMidis, previousNoteMidi ?? null)
}

export function melodyScaleDegreeQuizFromMistake(
  session: MajorKeySession,
  record: { correctDegree: number },
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): MelodyScaleDegreeQuiz | null {
  const targetQuiz = scaleDegreeQuizFromMistake(
    session,
    record,
    rootMin,
    rootMax,
    previousNoteMidi,
  )

  if (!targetQuiz) return null

  return randomMelodyScaleDegreeQuizWithTargetDegree(
    session,
    targetQuiz.degree,
    rootMin,
    rootMax,
    previousNoteMidi,
    targetQuiz.noteMidi,
  )
}

export function melodyScaleDegreeQuizFromPattern(
  session: MajorKeySession,
  pattern: string,
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): MelodyScaleDegreeQuiz | null {
  const parts = pattern.split('-').map(Number)
  if (parts.length !== 3 || parts.some((degree) => degree < 1 || degree > 7)) {
    return null
  }

  const degrees = parts as [number, number, number]
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax)
  const noteMidis: [number, number, number] = [0, 0, 0]
  let prev = previousNoteMidi ?? null

  for (let i = 0; i < MELODY_NOTE_COUNT; i++) {
    const degree = degrees[i]!
    const degreeMidis = midis.filter(
      (midi) => midiToDegree(session.tonicPitchClass, midi) === degree,
    )
    if (degreeMidis.length === 0) return null

    noteMidis[i] = pickRegisterAmongMidis(degreeMidis, prev)
    prev = noteMidis[i]
  }

  return buildMelodyQuiz(session, noteMidis, previousNoteMidi ?? null)
}

export function scaleDegreeQuizFromMistake(
  session: MajorKeySession,
  record: { correctDegree: number },
  rootMin: number,
  rootMax: number,
  previousNoteMidi?: number | null,
): ScaleDegreeQuiz | null {
  const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax).filter(
    (midi) => midiToDegree(session.tonicPitchClass, midi) === record.correctDegree,
  )

  if (midis.length === 0) return null

  const noteMidi = pickRandomNoteMidi(
    midis,
    session.tonicPitchClass,
    previousNoteMidi ?? null,
    undefined,
    record.correctDegree,
  )

  return {
    tonicMidi: session.tonicMidi,
    noteMidi,
    degree: record.correctDegree,
    keyLabel: session.label,
    previousNoteMidi: previousNoteMidi ?? null,
  }
}
