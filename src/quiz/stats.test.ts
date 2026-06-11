import { describe, expect, it } from 'vitest'
import {
  aggregateSessionDegreeDistribution,
  EMPTY_SESSION_STATS,
  getCorrectAnswerCount,
  getSessionDegreeWeights,
  getTotalScore,
  hasSessionAttempts,
  MAX_SESSION_DEGREE_COUNT_VARIANCE,
  populationVariance,
  recordResult,
  recordChallengeResult,
  recordChallengeResultNoBonus,
  recordMelodyGroupResult,
  getMelodySessionDegreeWeights,
} from './stats'
import { randomScaleDegreeQuiz } from './keys'

describe('getCorrectAnswerCount', () => {
  it('returns zero for an empty session', () => {
    expect(getCorrectAnswerCount(EMPTY_SESSION_STATS)).toBe(0)
  })

  it('sums correct answers across keys', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordResult(stats, 'M2', { correct: true })
    stats = recordResult(stats, 'M2', { correct: false })
    stats = recordResult(stats, 'P5', { correct: true })

    expect(getCorrectAnswerCount(stats)).toBe(2)
  })
})

describe('hasSessionAttempts', () => {
  it('is false before any answers', () => {
    expect(hasSessionAttempts(EMPTY_SESSION_STATS)).toBe(false)
  })

  it('is true after at least one answer', () => {
    const stats = recordResult(EMPTY_SESSION_STATS, '3', { correct: false })
    expect(hasSessionAttempts(stats)).toBe(true)
  })
})

describe('recordResult for interval speed', () => {
  it('tracks correct and total counts per interval id', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordResult(stats, 'M3', { correct: true })
    stats = recordResult(stats, 'M3', { correct: false })

    expect(stats.byKey.M3).toEqual({ correctCount: 1, totalCount: 2 })
  })
})

describe('aggregateSessionDegreeDistribution', () => {
  it('returns zero counts for an empty session', () => {
    expect(aggregateSessionDegreeDistribution(EMPTY_SESSION_STATS)).toEqual([
      { degree: 1, count: 0 },
      { degree: 2, count: 0 },
      { degree: 3, count: 0 },
      { degree: 4, count: 0 },
      { degree: 5, count: 0 },
      { degree: 6, count: 0 },
      { degree: 7, count: 0 },
    ])
  })

  it('counts questions per degree', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordResult(stats, '3', { correct: true })
    stats = recordResult(stats, '3', { correct: true })
    stats = recordResult(stats, '5', { correct: false })
    stats = recordResult(stats, '1', { correct: true })

    expect(aggregateSessionDegreeDistribution(stats)).toEqual([
      { degree: 1, count: 1 },
      { degree: 2, count: 0 },
      { degree: 3, count: 2 },
      { degree: 4, count: 0 },
      { degree: 5, count: 1 },
      { degree: 6, count: 0 },
      { degree: 7, count: 0 },
    ])
  })
})

describe('getSessionDegreeWeights', () => {
  it('favors degrees with fewer questions in the current session', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordResult(stats, '3', { correct: true })
    stats = recordResult(stats, '3', { correct: true })
    stats = recordResult(stats, '5', { correct: false })

    expect(getSessionDegreeWeights(stats)).toEqual({
      1: 3,
      2: 3,
      3: 1,
      4: 3,
      5: 2,
      6: 3,
      7: 3,
    })
  })
})

function simulateBalancedSessionDegreeCounts(
  trials: number,
): number[] {
  const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }
  const rootMin = 48
  const rootMax = 85
  let stats = EMPTY_SESSION_STATS
  let previousNoteMidi: number | null = null

  for (let i = 0; i < trials; i++) {
    const quiz = randomScaleDegreeQuiz(
      session,
      rootMin,
      rootMax,
      previousNoteMidi,
      getSessionDegreeWeights(stats),
    )
    stats = recordResult(stats, String(quiz.degree), { correct: true })
    previousNoteMidi = quiz.noteMidi
  }

  return aggregateSessionDegreeDistribution(stats).map((item) => item.count)
}

describe('recordChallengeResultNoBonus', () => {
  it('caps fast reaction bonus at 1 point', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordChallengeResultNoBonus(stats, '3', { correct: true, reactionMs: 500 })
    stats = recordChallengeResultNoBonus(stats, '5', { correct: true })
    stats = recordChallengeResultNoBonus(stats, '1', { correct: true, reactionMs: 2_500 })

    expect(getTotalScore(stats)).toBe(2)
  })
})

describe('recordMelodyGroupResult', () => {
  it('awards 1 point per fully correct group with no reaction bonus', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordMelodyGroupResult(stats, '1-3-5', true)
    stats = recordMelodyGroupResult(stats, '2-4-6', true)
    stats = recordMelodyGroupResult(stats, '3-5-7', false)

    expect(getCorrectAnswerCount(stats)).toBe(2)
    expect(getTotalScore(stats)).toBe(2)
  })
})

describe('getMelodySessionDegreeWeights', () => {
  it('derives degree weights from melody pattern keys', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordMelodyGroupResult(stats, '1-3-5', true)
    stats = recordMelodyGroupResult(stats, '1-3-5', true)
    stats = recordMelodyGroupResult(stats, '2-4-6', false)

    expect(getMelodySessionDegreeWeights(stats)).toEqual({
      1: 1,
      2: 2,
      3: 1,
      4: 2,
      5: 1,
      6: 2,
      7: 3,
    })
  })
})

describe('recordChallengeResult', () => {
  it('adds weighted score for correct answers with reaction time', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordChallengeResult(stats, '3', { correct: true, reactionMs: 500 })
    stats = recordChallengeResult(stats, '5', { correct: true, reactionMs: 1_500 })
    stats = recordChallengeResult(stats, '1', { correct: true, reactionMs: 2_500 })

    expect(getTotalScore(stats)).toBe(2.5)
  })

  it('does not add score for incorrect answers', () => {
    const stats = recordChallengeResult(EMPTY_SESSION_STATS, '3', {
      correct: false,
      reactionMs: 100,
    })

    expect(getTotalScore(stats)).toBe(0)
  })
})

describe('non-review note key session balancing', () => {
  it('keeps simulated session degree count variance within threshold', () => {
    const counts = simulateBalancedSessionDegreeCounts(140)
    const variance = populationVariance(counts)

    expect(variance).toBeLessThanOrEqual(MAX_SESSION_DEGREE_COUNT_VARIANCE)
  })
})
