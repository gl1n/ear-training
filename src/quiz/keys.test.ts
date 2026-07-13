import { describe, expect, it, vi } from 'vitest'
import {
  EMPTY_SESSION_STATS,
  getSessionDegreeWeights,
  recordResult,
} from './stats'
import {
  DEGREE_OPTION_IDS,
  NOTE_KEY_QUIZ_SPAN_SEMITONES,
  createMajorKeySession,
  getDiatonicSpanInRange,
  getTonicChordRootRange,
  getTonicMajorTriadMidis,
  listDiatonicMidisInRange,
  midiToDegree,
  scaleDegreeQuizFromMistake,
  randomScaleDegreeQuiz,
  randomMelodyScaleDegreeQuiz,
  melodyScaleDegreeQuizFromMistake,
  formatMelodyDegrees,
  formatMajorKeyLabel,
  isMelodyScaleDegreeQuiz,
  MELODY_NOTE_COUNT,
} from './keys'

describe('getTonicChordRootRange', () => {
  it('centers chord roots in the middle of the playable range', () => {
    expect(getTonicChordRootRange(48, 85)).toEqual({ min: 56, max: 70 })
  })
})

describe('getDiatonicSpanInRange', () => {
  it('covers three octaves for every major key in the default range', () => {
    const rootMin = 48
    const rootMax = 85

    for (let tonicPitchClass = 0; tonicPitchClass < 12; tonicPitchClass++) {
      expect(getDiatonicSpanInRange(tonicPitchClass, rootMin, rootMax)).toBeGreaterThanOrEqual(
        NOTE_KEY_QUIZ_SPAN_SEMITONES,
      )
    }
  })

  it('spans C#3 to C#6 for A major', () => {
    const midis = listDiatonicMidisInRange(9, 48, 85)
    expect(midis[0]).toBe(49)
    expect(midis[midis.length - 1]).toBe(85)
    expect(getDiatonicSpanInRange(9, 48, 85)).toBe(NOTE_KEY_QUIZ_SPAN_SEMITONES)
  })
})

describe('createMajorKeySession', () => {
  it('places the tonic triad in the middle register', () => {
    const rootMin = 48
    const rootMax = 85
    const { min, max } = getTonicChordRootRange(rootMin, rootMax)

    for (let i = 0; i < 50; i++) {
      const session = createMajorKeySession(rootMin, rootMax)
      const [root, , fifth] = getTonicMajorTriadMidis(session.tonicMidi)

      expect(root).toBeGreaterThanOrEqual(min)
      expect(root).toBeLessThanOrEqual(max)
      expect(fifth).toBeLessThanOrEqual(rootMax)
      expect(session.tonicPitchClass).toBe(session.tonicMidi % 12)
    }
  })

})

describe('getTonicMajorTriadMidis', () => {
  it('returns root, major third, and perfect fifth', () => {
    expect(getTonicMajorTriadMidis(60)).toEqual([60, 64, 67])
    expect(getTonicMajorTriadMidis(67)).toEqual([67, 71, 74])
  })
})

describe('formatMajorKeyLabel', () => {
  it('formats tonic as major key label', () => {
    expect(formatMajorKeyLabel(67)).toBe('G 大调')
    expect(formatMajorKeyLabel(60)).toBe('C 大调')
  })
})

describe('midiToDegree', () => {
  it('maps G major scale degrees', () => {
    const tonicPc = 7

    expect(midiToDegree(tonicPc, 67)).toBe(1)
    expect(midiToDegree(tonicPc, 69)).toBe(2)
    expect(midiToDegree(tonicPc, 71)).toBe(3)
    expect(midiToDegree(tonicPc, 72)).toBe(4)
    expect(midiToDegree(tonicPc, 74)).toBe(5)
    expect(midiToDegree(tonicPc, 76)).toBe(6)
    expect(midiToDegree(tonicPc, 78)).toBe(7)
    expect(midiToDegree(tonicPc, 68)).toBeNull()
  })
})

describe('listDiatonicMidisInRange', () => {
  it('lists only diatonic notes in range for C major', () => {
    const midis = listDiatonicMidisInRange(0, 60, 64)
    expect(midis).toEqual([60, 62, 64])
  })
})

function consecutiveSameDegreeRate(
  session: Parameters<typeof randomScaleDegreeQuiz>[0],
  rootMin: number,
  rootMax: number,
  trials: number,
  useSessionWeighting: boolean,
): number {
  let sameDegreeCount = 0
  let stats = EMPTY_SESSION_STATS
  let previousNoteMidi: number | null = null

  for (let i = 0; i < trials; i++) {
    const quiz = randomScaleDegreeQuiz(
      session,
      rootMin,
      rootMax,
      previousNoteMidi,
      useSessionWeighting ? getSessionDegreeWeights(stats) : undefined,
    )
    if (
      previousNoteMidi !== null &&
      midiToDegree(session.tonicPitchClass, quiz.noteMidi) ===
        midiToDegree(session.tonicPitchClass, previousNoteMidi)
    ) {
      sameDegreeCount++
    }
    stats = recordResult(stats, String(quiz.degree), { correct: true })
    previousNoteMidi = quiz.noteMidi
  }

  return sameDegreeCount / (trials - 1)
}

function withSeededRandom<T>(seed: number, run: () => T): T {
  let state = seed >>> 0
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 2 ** 32
  })

  try {
    return run()
  } finally {
    random.mockRestore()
  }
}

function averageDistanceFromPrevious(
  session: Parameters<typeof randomScaleDegreeQuiz>[0],
  rootMin: number,
  rootMax: number,
  previousNoteMidi: number,
  trials: number,
): number {
  let totalDistance = 0

  for (let i = 0; i < trials; i++) {
    const quiz = randomScaleDegreeQuiz(session, rootMin, rootMax, previousNoteMidi)
    totalDistance += Math.abs(quiz.noteMidi - previousNoteMidi)
  }

  return totalDistance / trials
}

describe('randomScaleDegreeQuiz', () => {
  it('produces a valid degree for each quiz', () => {
    const session = { tonicMidi: 67, tonicPitchClass: 7, label: 'G 大调' }

    for (let i = 0; i < 20; i++) {
      const quiz = randomScaleDegreeQuiz(session, 60, 72)
      expect(quiz.degree).toBeGreaterThanOrEqual(1)
      expect(quiz.degree).toBeLessThanOrEqual(7)
      expect(DEGREE_OPTION_IDS).toContain(String(quiz.degree))
      expect(midiToDegree(session.tonicPitchClass, quiz.noteMidi)).toBe(quiz.degree)
      expect(quiz.keyLabel).toBe('G 大调')
    }
  })

  it('reduces consecutive scale-degree repeats with session weighting', () => {
    const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }
    const rootMin = 48
    const rootMax = 85
    const seeds = [0x1234_5678, 0x9abc_def0, 0xdead_beef]
    const trials = 2_000
    const averageRate = (useSessionWeighting: boolean) => seeds.reduce(
      (total, seed) => total + withSeededRandom(
        seed,
        () => consecutiveSameDegreeRate(
          session,
          rootMin,
          rootMax,
          trials,
          useSessionWeighting,
        ),
      ),
      0,
    ) / seeds.length

    expect(averageRate(true)).toBeLessThan(averageRate(false))
  })

  it('prefers moderate jumps from the previous note after picking a degree', () => {
    const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }
    const rootMin = 48
    const rootMax = 85
    const previousNoteMidi = 60
    const midis = listDiatonicMidisInRange(session.tonicPitchClass, rootMin, rootMax)
    const uniformAverageDistance =
      midis.reduce((sum, midi) => sum + Math.abs(midi - previousNoteMidi), 0) / midis.length

    const gaussianAverageDistance = averageDistanceFromPrevious(
      session,
      rootMin,
      rootMax,
      previousNoteMidi,
      400,
    )

    expect(gaussianAverageDistance).toBeLessThan(uniformAverageDistance)
    expect(gaussianAverageDistance).toBeGreaterThan(2)
    expect(gaussianAverageDistance).toBeLessThan(10)
  })
})

describe('randomMelodyScaleDegreeQuiz', () => {
  it('produces three valid diatonic degrees in sequence', () => {
    const session = { tonicMidi: 67, tonicPitchClass: 7, label: 'G 大调' }

    for (let i = 0; i < 20; i++) {
      const quiz = randomMelodyScaleDegreeQuiz(session, 60, 72)
      expect(isMelodyScaleDegreeQuiz(quiz)).toBe(true)
      expect(quiz.noteMidis).toHaveLength(MELODY_NOTE_COUNT)
      expect(quiz.degrees).toHaveLength(MELODY_NOTE_COUNT)
      expect(quiz.noteMidi).toBe(quiz.noteMidis[MELODY_NOTE_COUNT - 1])
      expect(quiz.degree).toBe(quiz.degrees[MELODY_NOTE_COUNT - 1])
      expect(formatMelodyDegrees(quiz.degrees)).toBe(quiz.degrees.join('-'))

      for (let noteIndex = 0; noteIndex < MELODY_NOTE_COUNT; noteIndex++) {
        expect(midiToDegree(session.tonicPitchClass, quiz.noteMidis[noteIndex]!)).toBe(
          quiz.degrees[noteIndex],
        )
      }
    }
  })
})

describe('melodyScaleDegreeQuizFromMistake', () => {
  it('includes the requested degree somewhere in the melody', () => {
    const session = { tonicMidi: 67, tonicPitchClass: 7, label: 'G 大调' }
    const quiz = melodyScaleDegreeQuizFromMistake(
      session,
      { correctDegree: 5 },
      60,
      72,
      67,
    )

    expect(quiz).not.toBeNull()
    expect(quiz!.degrees).toContain(5)
  })
})

describe('scaleDegreeQuizFromMistake', () => {
  it('generates a quiz with the requested degree in the current key', () => {
    const session = { tonicMidi: 67, tonicPitchClass: 7, label: 'G 大调' }
    const quiz = scaleDegreeQuizFromMistake(
      session,
      { correctDegree: 5 },
      60,
      72,
      67,
    )

    expect(quiz).not.toBeNull()
    expect(quiz!.degree).toBe(5)
    expect(quiz!.previousNoteMidi).toBe(67)
    expect(midiToDegree(session.tonicPitchClass, quiz!.noteMidi)).toBe(5)
  })

  it('returns null when the degree is unavailable in range', () => {
    const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }
    const quiz = scaleDegreeQuizFromMistake(session, { correctDegree: 5 }, 60, 60, null)

    expect(quiz).toBeNull()
  })
})
