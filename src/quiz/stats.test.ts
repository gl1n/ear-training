import { describe, expect, it } from 'vitest'
import {
  aggregateSessionDegreeDistribution,
  EMPTY_SESSION_STATS,
  recordResult,
} from './stats'

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
