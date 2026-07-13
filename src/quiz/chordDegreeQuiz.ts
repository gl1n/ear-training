import type { Piano } from '../audio/piano'
import { delay } from '../utils/abort'
import { readStorage, writeStorage } from '../utils/storage'
import type { TrainerState } from './sequencer'
import { STORAGE_KEYS } from './storageKeys'
import type { SessionDegreeWeights, SessionStats } from './stats'
import { getSessionDegreeWeights } from './stats'
import { pickWeighted } from './weightedPick'

export const CHORD_DEGREE_IDS = ['1', '2', '3', '4', '5', '6', '7'] as const
export const PRIMARY_CHORD_DEGREES = [1, 4, 5] as const
export const COMMON_CHORD_DEGREES = [1, 4, 5, 6] as const
export const ALL_CHORD_DEGREES = [1, 2, 3, 4, 5, 6, 7] as const
export const CHORD_DEGREE_PLAYBACK_DURATION_SEC = 2.4
export const CHORD_DEGREE_RETRIGGER_GAP_MS = 70
const RANDOM_KEY_TONIC_BASE_MIDI = 48
const CHORD_VOICING_BASS_CENTER_MIDI = 55
export type ChordDegreeId = (typeof CHORD_DEGREE_IDS)[number]
export type ChordInversion = 0 | 1 | 2
export type ChordDegreeKey = 'random' | 'c-major'
export type ChordDegreeRange = 'primary' | 'common' | 'all' | 'custom'
export type ChordDegreeInversionMode = 'root' | 'random'

export type ChordDegreeQuiz = {
  degree: number
  inversion: ChordInversion
  midis: number[]
}

export type ChordDegreeAnswer = { selectedDegree: string }

export type ChordDegreeHistory = Record<ChordDegreeId, { errors: number; attempts: number }>

export function getChordDegreesForRange(
  range: ChordDegreeRange,
  customDegrees: readonly number[] = ALL_CHORD_DEGREES,
): readonly number[] {
  if (range === 'primary') return PRIMARY_CHORD_DEGREES
  if (range === 'common') return COMMON_CHORD_DEGREES
  if (range === 'all') return ALL_CHORD_DEGREES
  return [...new Set(customDegrees)]
    .filter((degree) => degree >= 1 && degree <= 7)
    .sort((a, b) => a - b)
}

export function randomChordDegreeTonicMidi(random: () => number = Math.random): number {
  return RANDOM_KEY_TONIC_BASE_MIDI + Math.floor(random() * 12)
}

export const EMPTY_CHORD_DEGREE_HISTORY: ChordDegreeHistory = Object.fromEntries(
  CHORD_DEGREE_IDS.map((id) => [id, { errors: 0, attempts: 0 }]),
) as ChordDegreeHistory

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
const STORAGE_KEY = STORAGE_KEYS.chordDegreeHistory

function triadIntervals(degree: number): [number, number, number] {
  const root = MAJOR_SCALE[degree - 1]!
  const third = MAJOR_SCALE[(degree + 1) % 7]! + (degree >= 6 ? 12 : 0)
  const fifth = MAJOR_SCALE[(degree + 3) % 7]! + (degree >= 4 ? 12 : 0)
  return [root, third, fifth]
}

export function createChordMidis(tonicMidi: number, degree: number, inversion: ChordInversion): number[] {
  const pitchClasses = triadIntervals(degree).map(
    (offset) => ((tonicMidi + offset) % 12 + 12) % 12,
  )
  const ordered = [...pitchClasses.slice(inversion), ...pitchClasses.slice(0, inversion)]
  const bassPitchClass = ordered[0]!
  const lowerCandidate = CHORD_VOICING_BASS_CENTER_MIDI -
    ((CHORD_VOICING_BASS_CENTER_MIDI - bassPitchClass + 12) % 12)
  const upperCandidate = lowerCandidate + 12
  const bass = Math.abs(lowerCandidate - CHORD_VOICING_BASS_CENTER_MIDI) <=
    Math.abs(upperCandidate - CHORD_VOICING_BASS_CENTER_MIDI)
    ? lowerCandidate
    : upperCandidate
  const notes = [bass]
  for (const pitchClass of ordered.slice(1)) {
    let midi = notes[notes.length - 1]! + 1
    while (((midi % 12) + 12) % 12 !== pitchClass) midi += 1
    notes.push(midi)
  }
  return notes
}

export function createChordDegreeQuiz(
  tonicMidi = 60,
  degrees: readonly number[] = ALL_CHORD_DEGREES,
  inversionMode: ChordDegreeInversionMode = 'random',
  degreeWeights?: SessionDegreeWeights,
): ChordDegreeQuiz {
  const degree = pickWeighted(degrees, (candidate) => degreeWeights?.[candidate] ?? 1) ?? 1
  const inversion = inversionMode === 'root' ? 0 : Math.floor(Math.random() * 3) as ChordInversion
  const notes = createChordMidis(tonicMidi, degree, inversion)
  return { degree, inversion, midis: notes }
}

export function loadChordDegreeHistory(): ChordDegreeHistory {
  try {
    const raw = readStorage(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY_CHORD_DEGREE_HISTORY)
    const parsed = JSON.parse(raw) as Partial<ChordDegreeHistory>
    return Object.fromEntries(CHORD_DEGREE_IDS.map((id) => {
      const value = parsed[id]
      return [id, {
        errors: Number.isInteger(value?.errors) && value!.errors >= 0 ? value!.errors : 0,
        attempts: Number.isInteger(value?.attempts) && value!.attempts >= 0 ? value!.attempts : 0,
      }]
    })) as ChordDegreeHistory
  } catch {
    return structuredClone(EMPTY_CHORD_DEGREE_HISTORY)
  }
}

export function recordChordDegreeHistory(
  history: ChordDegreeHistory,
  degree: ChordDegreeId,
  correct: boolean,
): ChordDegreeHistory {
  const current = history[degree]
  const next = {
    ...history,
    [degree]: { attempts: current.attempts + 1, errors: current.errors + (correct ? 0 : 1) },
  }
  writeStorage(STORAGE_KEY, JSON.stringify(next))
  return next
}

type ChordDegreeCallbacks = {
  onStateChange: (state: TrainerState) => void
  onQuiz: (quiz: ChordDegreeQuiz) => void
  waitForAnswer: (signal: AbortSignal) => Promise<ChordDegreeAnswer>
  onAnswerCorrectionStart?: (wrongSelection: string) => void
  onAnswerSubmitted: (quiz: ChordDegreeQuiz, selected: string, correct: boolean) => boolean
  getSessionStats?: () => SessionStats
}

export async function runChordDegreeLoop(
  piano: Piano,
  callbacks: ChordDegreeCallbacks,
  signal: AbortSignal,
  tonicMidi = 60,
  degrees: readonly number[] = ALL_CHORD_DEGREES,
  inversionMode: ChordDegreeInversionMode = 'random',
): Promise<void> {
  callbacks.onStateChange('playing_note')
  for (const offset of [0, 2, 4, 5, 7]) {
    await piano.playNote(tonicMidi + offset, 0.42)
    await delay(470, signal)
  }
  callbacks.onStateChange('playing_tonic_chord')
  await piano.playNotes(
    [tonicMidi, tonicMidi + 4, tonicMidi + 7],
    CHORD_DEGREE_PLAYBACK_DURATION_SEC,
  )
  await delay(1_600, signal)

  while (!signal.aborted) {
    const degreeWeights = callbacks.getSessionStats
      ? getSessionDegreeWeights(callbacks.getSessionStats())
      : undefined
    const quiz = createChordDegreeQuiz(tonicMidi, degrees, inversionMode, degreeWeights)
    callbacks.onQuiz(quiz)
    callbacks.onStateChange('playing_harmonic')
    const firstAnswer = callbacks.waitForAnswer(signal)
    piano.stop()
    await delay(CHORD_DEGREE_RETRIGGER_GAP_MS, signal)
    await piano.playNotes(quiz.midis, CHORD_DEGREE_PLAYBACK_DURATION_SEC)
    callbacks.onStateChange('awaiting_answer')

    const first = await firstAnswer
    const correct = first.selectedDegree === String(quiz.degree)
    const sessionComplete = callbacks.onAnswerSubmitted(quiz, first.selectedDegree, correct)
    if (!correct) {
      callbacks.onAnswerCorrectionStart?.(first.selectedDegree)
      callbacks.onStateChange('answer_correction')
      while (!signal.aborted) {
        const retry = await callbacks.waitForAnswer(signal)
        if (retry.selectedDegree === String(quiz.degree)) break
        callbacks.onAnswerCorrectionStart?.(retry.selectedDegree)
      }
      callbacks.onStateChange('feedback_incorrect')
      await delay(650, signal)
    }
    if (sessionComplete) return
    callbacks.onStateChange('gap')
    await delay(350, signal)
  }
}
