import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isSavedMelody, recordMelodyFavoriteReview, melodyFavoriteId, melodyFavoriteErrorRate, sortMelodyFavoritesByErrorRate, randomMelodyFavoriteQuiz, loadMelodyFavorites, removeMelodyFavorite, saveMelodyFavorite } from './melodyFavorites'
import { randomMelodyRhythm, type MelodyScaleDegreeQuiz } from './keys'
import { loadScaleDegreeMelodyMistakeStats, saveScaleDegreeMelodyMistakeStats, weightedRandomMelodyQuizFromMistakes } from './scaleDegreeMelodyMistakeStats'

const quiz: MelodyScaleDegreeQuiz = {
  tonicMidi: 60, noteMidi: 79, degree: 5, keyLabel: 'C 大调', previousNoteMidi: null,
  sequenceType: 'melody', noteMidis: [48, 64, 79], degrees: [1, 3, 5],
  noteBeats: [0.5, 1.5, 1], playbackTiming: { noteDurationMs: 700, gapMs: 150 },
}
beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('saved melody fidelity', () => {
  it('round trips absolute pitches, octaves, rhythm and tempo, deduplicates and removes', () => {
    expect(saveMelodyFavorite(quiz)).toBe(true)
    expect(saveMelodyFavorite(structuredClone(quiz))).toBe(true)
    expect(loadMelodyFavorites()).toEqual([quiz])
    const differentOctave = { ...quiz, noteMidis: [60, 64, 79] }
    expect(saveMelodyFavorite(differentOctave)).toBe(true)
    expect(loadMelodyFavorites()).toHaveLength(2)
    expect(removeMelodyFavorite(quiz)).toBe(true)
    expect(loadMelodyFavorites()).toEqual([differentOctave])
  })

  it('preserves the submitted answer through mastery changes and removal undo', () => {
    const favorite = { ...quiz, answerDegrees: [2, 3, 4], mastered: false }
    expect(saveMelodyFavorite(favorite)).toBe(true)
    expect(loadMelodyFavorites()).toEqual([favorite])
    expect(saveMelodyFavorite({ ...favorite, mastered: true })).toBe(true)
    const saved = loadMelodyFavorites()[0]!
    expect(saved.answerDegrees).toEqual([2, 3, 4])
    expect(saved.mastered).toBe(true)
    expect(removeMelodyFavorite(saved)).toBe(true)
    expect(loadMelodyFavorites()).toEqual([])
    expect(saveMelodyFavorite(saved)).toBe(true)
    expect(loadMelodyFavorites()).toEqual([saved])
  })

  it('updates a repeated favorite with the current attempt without adding a duplicate', () => {
    saveMelodyFavorite({ ...quiz, answerDegrees: [2, 3, 4], mastered: true })
    saveMelodyFavorite({ ...quiz, answerDegrees: [1, 2, 5], mastered: false })
    expect(loadMelodyFavorites()).toEqual([{ ...quiz, answerDegrees: [1, 2, 5], mastered: false }])
  })

  it('retains legacy favorites and ignores malformed answer metadata', () => {
    localStorage.setItem('ear-trainer:melody-favorites:v1', JSON.stringify([
      quiz, { ...quiz, answerDegrees: [1], mastered: 'yes' },
      { ...quiz, answerDegrees: [1, 8, 5] },
    ]))
    expect(loadMelodyFavorites()).toEqual([quiz, quiz, quiz])
  })

  it('reports storage failures without pretending a melody was saved', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('quota') } })
    expect(saveMelodyFavorite(quiz)).toBe(false)
    expect(loadMelodyFavorites()).toEqual([])
  })

  it('rejects corrupted pitches, rhythm, and tempo', () => {
    expect(isSavedMelody({ ...quiz, noteMidis: [49, 64, 79] })).toBe(false)
    expect(isSavedMelody({ ...quiz, noteBeats: [1] })).toBe(false)
    expect(isSavedMelody({ ...quiz, playbackTiming: { noteDurationMs: -1, gapMs: 0 } })).toBe(false)
  })

  it('aligns a random favorite to the session key without changing its intervals or rhythm', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const result = randomMelodyFavoriteQuiz([quiz, { ...quiz, mastered: true, answerDegrees: [2, 3, 4] }],
      { tonicMidi: 62, tonicPitchClass: 2, label: 'D 大调' }, 65)
    expect(result).toMatchObject({ tonicMidi: 62, keyLabel: 'D 大调', noteMidis: [50, 66, 81],
      noteMidi: 81, degree: 5, degrees: [1, 3, 5], noteBeats: quiz.noteBeats, previousNoteMidi: 65 })
    expect(result).not.toHaveProperty('answerDegrees')
    expect(result).not.toHaveProperty('mastered')
    expect(quiz.noteMidis).toEqual([48, 64, 79])
    expect(randomMelodyFavoriteQuiz([], { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' })).toBeNull()
  })

  it('records transposed reviews on the original favorite and preserves totals through mastery updates', () => {
    saveMelodyFavorite(quiz)
    const review = randomMelodyFavoriteQuiz(loadMelodyFavorites(), { tonicMidi: 62, tonicPitchClass: 2, label: 'D 大调' })!
    expect(recordMelodyFavoriteReview(review.sourceFavoriteId, false)).toBe(true)
    expect(recordMelodyFavoriteReview(review.sourceFavoriteId, true)).toBe(true)
    saveMelodyFavorite({ ...quiz, mastered: true })
    const saved = loadMelodyFavorites()
    expect(saved).toHaveLength(1)
    expect(saved[0]?.reviewStats).toEqual({ attempts: 2, incorrect: 1 })
    expect(melodyFavoriteErrorRate(saved[0]!)).toBe(0.5)
    expect(saved[0]?.noteMidis).toEqual(quiz.noteMidis)
    removeMelodyFavorite(quiz)
    recordMelodyFavoriteReview(melodyFavoriteId(quiz), false)
    expect(loadMelodyFavorites()).toEqual([])
  })

  it('sorts by review error rate, then recency, and puts unreviewed melodies last', () => {
    const unknown = { ...quiz }
    const correct = { ...quiz, reviewStats: { attempts: 2, incorrect: 0 } }
    const half = { ...quiz, reviewStats: { attempts: 2, incorrect: 1 } }
    const newerHalf = { ...quiz, reviewStats: { attempts: 4, incorrect: 2 } }
    const wrong = { ...quiz, reviewStats: { attempts: 1, incorrect: 1 } }
    const favorites = [half, wrong, correct, newerHalf, unknown]
    expect(sortMelodyFavoritesByErrorRate(favorites)).toEqual([wrong, newerHalf, half, correct, unknown])
    expect(favorites[0]).toBe(half)
    expect(melodyFavoriteErrorRate(unknown)).toBeNull()
  })

  it('ignores invalid review counters in stored favorites', () => {
    localStorage.setItem('ear-trainer:melody-favorites:v1', JSON.stringify([
      { ...quiz, reviewStats: { attempts: 0, incorrect: 0 } },
      { ...quiz, reviewStats: { attempts: 2, incorrect: 3 } },
      { ...quiz, reviewStats: { attempts: 2, incorrect: -1 } },
      { ...quiz, reviewStats: { attempts: 1.5, incorrect: 1 } },
    ]))
    expect(loadMelodyFavorites()).toEqual([quiz, quiz, quiz, quiz])
  })

  it('keeps new mistakes exact and transposes all pitches together for review', () => {
    const records = [{ pattern: '1-3-5', quiz }, { pattern: '2-4-6' }]
    loadScaleDegreeMelodyMistakeStats() // Initialize the schema, as the app does on mount.
    saveScaleDegreeMelodyMistakeStats(records)
    expect(loadScaleDegreeMelodyMistakeStats()).toEqual(records)
    const review = weightedRandomMelodyQuizFromMistakes([records[0]!], { tonicMidi: 62, tonicPitchClass: 2, label: 'D 大调' }, 48, 84)
    expect(review?.noteMidis).toEqual([50, 66, 81])
    expect(review?.noteBeats).toEqual(quiz.noteBeats)
    expect(review?.degrees).toEqual(quiz.degrees)
    expect(weightedRandomMelodyQuizFromMistakes([records[0]!], { tonicMidi: 72, tonicPitchClass: 0, label: 'C 大调' }, 60, 80)).toBeNull()
  })

  it.each([3, 5, 7])('generates varied rhythms for %i notes even with repeated random picks', (length) => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const beats = randomMelodyRhythm(length)
    expect(beats).toHaveLength(length)
    expect(new Set(beats).size).toBeGreaterThan(1)
    expect(beats.every((beat) => [0.5, 1, 1.5, 2].includes(beat))).toBe(true)
  })
})
