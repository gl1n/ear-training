import { MAJOR_SCALE_INTERVALS, type MajorKeySession, type MelodyScaleDegreeQuiz } from './keys'
import { readStorage, writeStorage } from '../utils/storage'

export type MelodyFavorite = MelodyScaleDegreeQuiz & {
  answerDegrees?: number[]
  mastered?: boolean
  reviewStats?: { attempts: number; incorrect: number }
}

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

export function loadMelodyFavorites(): MelodyFavorite[] {
  try {
    const value: unknown = JSON.parse(readStorage(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter(isSavedMelody).map((quiz: MelodyFavorite) => {
      const { answerDegrees, mastered, reviewStats, ...original } = quiz
      return {
        ...original,
        ...(Array.isArray(answerDegrees) && answerDegrees.length === quiz.degrees.length && answerDegrees.every((degree) => Number.isInteger(degree) && degree >= 1 && degree <= 7) ? { answerDegrees } : {}),
        ...(typeof mastered === 'boolean' ? { mastered } : {}),
        ...(reviewStats && Number.isSafeInteger(reviewStats.attempts) && reviewStats.attempts > 0 &&
          Number.isSafeInteger(reviewStats.incorrect) && reviewStats.incorrect >= 0 && reviewStats.incorrect <= reviewStats.attempts
          ? { reviewStats } : {}),
      }
    }) : []
  } catch { return [] }
}

export function saveMelodyFavorite(quiz: MelodyFavorite): boolean {
  if (!isSavedMelody(quiz)) return false
  const favorites = loadMelodyFavorites()
  const index = favorites.findIndex((saved) => melodyFavoriteId(saved) === melodyFavoriteId(quiz))
  if (index >= 0) favorites[index] = { ...favorites[index], ...quiz }
  else favorites.push(quiz)
  return writeStorage(STORAGE_KEY, JSON.stringify(favorites))
}

export function removeMelodyFavorite(quiz: MelodyScaleDegreeQuiz): boolean {
  return writeStorage(STORAGE_KEY, JSON.stringify(loadMelodyFavorites().filter((saved) => melodyFavoriteId(saved) !== melodyFavoriteId(quiz))))
}

/** Keep the saved intervals and rhythm while aligning every note to the session tonic. */
export function randomMelodyFavoriteQuiz(
  favorites: MelodyFavorite[],
  session: MajorKeySession,
  previousNoteMidi: number | null = null,
): (MelodyScaleDegreeQuiz & { sourceFavoriteId: string }) | null {
  const favorite = favorites[Math.floor(Math.random() * favorites.length)]
  if (!favorite) return null
  const shift = session.tonicMidi - favorite.tonicMidi
  const aligned = favorite.noteMidis.map((midi) => midi + shift)
  const minOctave = Math.ceil(-Math.min(...aligned) / 12)
  const maxOctave = Math.floor((127 - Math.max(...aligned)) / 12)
  const octaveShift = Math.max(minOctave, Math.min(0, maxOctave)) * 12
  const noteMidis = aligned.map((midi) => midi + octaveShift)
  return {
    sourceFavoriteId: melodyFavoriteId(favorite),
    sequenceType: 'melody', tonicMidi: session.tonicMidi, keyLabel: session.label,
    previousNoteMidi, noteMidis, noteMidi: noteMidis.at(-1)!,
    degrees: [...favorite.degrees], degree: favorite.degree,
    ...(favorite.noteBeats ? { noteBeats: [...favorite.noteBeats] } : {}),
  }
}

export function recordMelodyFavoriteReview(id: string, correct: boolean): boolean {
  const favorites = loadMelodyFavorites()
  const favorite = favorites.find((item) => melodyFavoriteId(item) === id)
  if (!favorite) return true
  favorite.reviewStats = {
    attempts: (favorite.reviewStats?.attempts ?? 0) + 1,
    incorrect: (favorite.reviewStats?.incorrect ?? 0) + (correct ? 0 : 1),
  }
  return writeStorage(STORAGE_KEY, JSON.stringify(favorites))
}

export function melodyFavoriteErrorRate(favorite: MelodyFavorite): number | null {
  return favorite.reviewStats ? favorite.reviewStats.incorrect / favorite.reviewStats.attempts : null
}

export function sortMelodyFavoritesByErrorRate(favorites: MelodyFavorite[]): MelodyFavorite[] {
  return [...favorites].reverse().sort((a, b) =>
    (melodyFavoriteErrorRate(b) ?? -1) - (melodyFavoriteErrorRate(a) ?? -1))
}
