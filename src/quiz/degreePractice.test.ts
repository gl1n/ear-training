import { afterEach, describe, expect, it, vi } from 'vitest'
import { arcadePlaybackSettings, degreeAnswer, degreeOptions, degreeSession, degreeTonicChord, gradeMelody, randomFlavorQuiz, updateArcadeSpeedPoints } from './degreePractice'
import { melodyScaleDegreeQuizFromPattern, randomMelodyScaleDegreeQuiz, type ScaleFlavor } from './keys'
import { EMPTY_SESSION_STATS, getTotalAnswerCount, recordMelodyGroupResult } from './stats'
import { isValidMelodyPattern, weightedRandomMelodyQuizFromMistakes } from './scaleDegreeMelodyMistakeStats'

const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }
afterEach(() => vi.restoreAllMocks())

describe('extended single-note practice', () => {
  it('uses a minor triad and tonic-based minor label', () => {
    expect(degreeSession(session, 'minor').label).toBe('C 自然小调')
    expect(degreeTonicChord(60, 'minor')).toEqual([60, 63, 67])
    expect(degreeTonicChord(60, 'chromatic')).toEqual([60, 64, 67])
  })

  it.each<ScaleFlavor>(['minor', 'chromatic'])('maps every %s answer to its actual semitone in all keys', (flavor) => {
    const offsets: Record<string, number> = { '1': 0, '2': 2, '♭3': 3, '3': 4, '4': 5, '♯4': 6, '5': 7, '♭6': 8, '6': 9, '♭7': 10, '7': 11 }
    // Stable sampling across the entire option pool, independently of runtime randomness.
    const random = vi.spyOn(Math, 'random')
    for (let tonic = 0; tonic < 12; tonic++) {
      const options = degreeOptions(flavor)
      for (let index = 0; index < options.length; index++) {
        random.mockReturnValue((index + 0.5) / options.length)
        const quiz = randomFlavorQuiz({ ...session, tonicMidi: 60 + tonic, tonicPitchClass: tonic }, flavor, 48, 95, null)
        expect(degreeAnswer(quiz)).toBe(options[index])
        expect((quiz.noteMidi - tonic + 12) % 12).toBe(offsets[degreeAnswer(quiz)])
        expect(quiz.noteMidi).toBeGreaterThanOrEqual(48)
        expect(quiz.noteMidi).toBeLessThanOrEqual(95)
      }
    }
  })
})

describe('whole-phrase dictation', () => {
  it('adjusts tempo gradually while preserving articulation across speed presets', () => {
    expect(updateArcadeSpeedPoints(0, true)).toBe(1)
    expect(updateArcadeSpeedPoints(5, false)).toBe(3.5)
    expect(updateArcadeSpeedPoints(-7, false)).toBe(-8)
    expect(updateArcadeSpeedPoints(24, true)).toBe(24)
    for (const settings of [{ noteDurationMs: 800, gapMs: 300 }, { noteDurationMs: 300, gapMs: 80 }]) {
      for (let points = -8; points <= 24; points++) {
        const current = arcadePlaybackSettings(settings, points)
        const slower = arcadePlaybackSettings(settings, updateArcadeSpeedPoints(points, false))
        const faster = arcadePlaybackSettings(settings, updateArcadeSpeedPoints(points, true))
        expect(slower.noteDurationMs / current.noteDurationMs).toBeGreaterThanOrEqual(1)
        expect(slower.noteDurationMs / current.noteDurationMs).toBeLessThan(1.031)
        expect(faster.noteDurationMs / current.noteDurationMs).toBeGreaterThan(0.98)
        expect(faster.noteDurationMs).toBeLessThanOrEqual(current.noteDurationMs)
        expect(slower.noteDurationMs / slower.gapMs).toBeCloseTo(settings.noteDurationMs / settings.gapMs)
      }
    }
  })

  it.each([3, 5, 7] as const)('generates and restores %i-note phrases', (length) => {
    const quiz = randomMelodyScaleDegreeQuiz(session, 48, 84, null, undefined, length)
    expect(quiz.noteMidis).toHaveLength(length)
    expect(quiz.degrees).toHaveLength(length)
    expect(quiz.noteMidi).toBe(quiz.noteMidis[length - 1])
    expect(quiz.degree).toBe(quiz.degrees[length - 1])
    const pattern = quiz.degrees.join('-')
    expect(isValidMelodyPattern(pattern)).toBe(true)
    expect(melodyScaleDegreeQuizFromPattern(session, pattern, 48, 84)?.degrees).toEqual(quiz.degrees)
    expect(weightedRandomMelodyQuizFromMistakes([{ pattern }], session, 48, 84)?.degrees).toEqual(quiz.degrees)
  })

  it('rejects incomplete or malformed submissions and grades every position', () => {
    expect(gradeMelody([1, 3, 5, 6, 7], '1-3-5')).toBeNull()
    expect(gradeMelody([1, 3, 5], '1--5')).toBeNull()
    expect(gradeMelody([1, 3, 5], '1-03-5')).toBeNull()
    expect(gradeMelody([1, 3, 5, 6, 7], '1-4-5-2-7')).toEqual([true, false, true, false, true])
    expect(melodyScaleDegreeQuizFromPattern(session, '1-NaN-5', 48, 84)).toBeNull()
  })

  it('counts each phrase once and distinguishes first-listen and replay results', () => {
    let stats = recordMelodyGroupResult(EMPTY_SESSION_STATS, '1-3-5', true, false)
    stats = recordMelodyGroupResult(stats, '1-3-5', true, true)
    stats = recordMelodyGroupResult(stats, '1-3-5', false, true)
    stats = recordMelodyGroupResult(stats, '1-3-5', false, false)
    expect(getTotalAnswerCount(stats)).toBe(4)
    expect(stats.totalScore).toBe(2)
    expect(stats.listening).toEqual({ firstCorrect: 1, replayCorrect: 1, firstAttempts: 2, replayAttempts: 2 })
    expect(recordMelodyGroupResult(EMPTY_SESSION_STATS, '1-5', true).listening).toBeUndefined()
  })
})
