import { MAJOR_SCALE_INTERVALS, type MelodyScaleDegreeQuiz } from './keys'
import { readStorage, writeStorage } from '../utils/storage'

const STORAGE_KEY = 'ear-trainer:melody-favorites:v1'

export function isSavedMelody(value: unknown): value is MelodyScaleDegreeQuiz {
  if (!value || typeof value !== 'object') return false
  const quiz = value as MelodyScaleDegreeQuiz
  return quiz.sequenceType === 'melody' && Number.isInteger(quiz.tonicMidi) && quiz.tonicMidi >= 0 && quiz.tonicMidi <= 127 &&
    typeof quiz.keyLabel === 'string' && Array.isArray(quiz.noteMidis) && [3, 5, 7].includes(quiz.noteMidis.length) &&
    Array.isArray(quiz.degrees) && quiz.degrees.length === quiz.noteMidis.length &&
    quiz.noteMidis.every((midi, i) => Number.isInteger(midi) && midi >= 0 && midi <= 127 &&
      Number.isInteger(quiz.degrees[i]) && quiz.degrees[i]! >= 1 && quiz.degrees[i]! <= 7 &&
      ((midi - quiz.tonicMidi) % 12 + 12) % 12 === MAJOR_SCALE_INTERVALS[quiz.degrees[i]! - 1]) &&
    quiz.noteMidi === quiz.noteMidis.at(-1) && quiz.degree === quiz.degrees.at(-1) &&
    (quiz.noteBeats === undefined || (Array.isArray(quiz.noteBeats) && quiz.noteBeats.length === quiz.noteMidis.length &&
      quiz.noteBeats.every((beat) => [0.5, 1, 1.5, 2].includes(beat)))) &&
    (quiz.playbackTiming === undefined || (quiz.playbackTiming !== null &&
      Number.isFinite(quiz.playbackTiming.noteDurationMs) && quiz.playbackTiming.noteDurationMs >= 50 && quiz.playbackTiming.noteDurationMs <= 10000 &&
      Number.isFinite(quiz.playbackTiming.gapMs) && quiz.playbackTiming.gapMs >= 0 && quiz.playbackTiming.gapMs <= 10000))
}

export function melodyFavoriteId(quiz: MelodyScaleDegreeQuiz): string {
  return JSON.stringify([quiz.tonicMidi, quiz.noteMidis, quiz.noteBeats, quiz.playbackTiming])
}

export function loadMelodyFavorites(): MelodyScaleDegreeQuiz[] {
  try {
    const value: unknown = JSON.parse(readStorage(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter(isSavedMelody) : []
  } catch { return [] }
}

export function saveMelodyFavorite(quiz: MelodyScaleDegreeQuiz): boolean {
  if (!isSavedMelody(quiz)) return false
  const favorites = loadMelodyFavorites()
  if (favorites.some((saved) => melodyFavoriteId(saved) === melodyFavoriteId(quiz))) return true
  return writeStorage(STORAGE_KEY, JSON.stringify([...favorites, quiz]))
}

export function removeMelodyFavorite(quiz: MelodyScaleDegreeQuiz): boolean {
  return writeStorage(STORAGE_KEY, JSON.stringify(loadMelodyFavorites().filter((saved) => melodyFavoriteId(saved) !== melodyFavoriteId(quiz))))
}

export function melodyOctaveLabel(quiz: MelodyScaleDegreeQuiz, index: number): string {
  const octave = Math.floor((quiz.noteMidis[index]! - quiz.tonicMidi) / 12)
  return octave === 0 ? '中八度' : `${octave > 0 ? '高' : '低'} ${Math.abs(octave)} 个八度`
}
