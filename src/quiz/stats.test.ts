import { describe, expect, it } from 'vitest'
import {
  aggregateSessionDegreeDistribution,
  EMPTY_SESSION_STATS,
  getSessionDegreeWeights,
  getTotalScore,
  MAX_SESSION_DEGREE_COUNT_VARIANCE,
  populationVariance,
  recordNoteKeyResult,
  recordResult,
} from './stats'
import { randomNoteKeyQuiz } from './keys'

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
    const quiz = randomNoteKeyQuiz(
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

describe('recordNoteKeyResult', () => {
  it('adds weighted score for correct answers with reaction time', () => {
    let stats = EMPTY_SESSION_STATS
    stats = recordNoteKeyResult(stats, '3', { correct: true, reactionMs: 500 })
    stats = recordNoteKeyResult(stats, '5', { correct: true, reactionMs: 1_500 })
    stats = recordNoteKeyResult(stats, '1', { correct: true, reactionMs: 2_500 })

    expect(getTotalScore(stats)).toBe(2.5)
  })

  it('does not add score for incorrect answers', () => {
    const stats = recordNoteKeyResult(EMPTY_SESSION_STATS, '3', {
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
