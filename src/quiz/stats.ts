import { DEGREE_OPTION_IDS } from './keys'
import { getScoreForReactionMs } from './scaleDegreeScoring'

export type QuizResult = {
  correct: boolean
}

export type DegreeCount = {
  degree: number
  count: number
}

export type IntervalStats = {
  correctCount: number
  totalCount: number
}

export type SessionStats = {
  byInterval: Record<string, IntervalStats>
  totalScore: number
}

export const EMPTY_SESSION_STATS: SessionStats = {
  byInterval: {},
  totalScore: 0,
}

export type ScaleDegreeQuizResult = QuizResult & {
  reactionMs?: number
}

const EMPTY_INTERVAL_STATS: IntervalStats = {
  correctCount: 0,
  totalCount: 0,
}

export function recordResult(
  stats: SessionStats,
  intervalId: string,
  result: QuizResult,
): SessionStats {
  const current = stats.byInterval[intervalId] ?? EMPTY_INTERVAL_STATS

  return {
    ...stats,
    byInterval: {
      ...stats.byInterval,
      [intervalId]: {
        correctCount: current.correctCount + (result.correct ? 1 : 0),
        totalCount: current.totalCount + 1,
      },
    },
  }
}

export function getCorrectAnswerCount(stats: SessionStats): number {
  return Object.values(stats.byInterval).reduce(
    (sum, interval) => sum + interval.correctCount,
    0,
  )
}

export function recordScaleDegreeResult(
  stats: SessionStats,
  degree: string,
  result: ScaleDegreeQuizResult,
): SessionStats {
  const next = recordResult(stats, degree, result)

  if (!result.correct || result.reactionMs === undefined) {
    return next
  }

  return {
    ...next,
    totalScore: next.totalScore + getScoreForReactionMs(result.reactionMs),
  }
}

export function getTotalScore(stats: SessionStats): number {
  return stats.totalScore
}

function getTotalAnswerCount(stats: SessionStats): number {
  return Object.values(stats.byInterval).reduce((sum, interval) => sum + interval.totalCount, 0)
}

export function hasSessionAttempts(stats: SessionStats): boolean {
  return getTotalAnswerCount(stats) > 0
}

export function aggregateSessionDegreeDistribution(stats: SessionStats): DegreeCount[] {
  return DEGREE_OPTION_IDS.map((id) => ({
    degree: Number(id),
    count: stats.byInterval[id]?.totalCount ?? 0,
  }))
}

export type SessionDegreeWeights = Record<number, number>

/** 出题次数越少的音级权重越高，用于非复习模式均衡本局分布。 */
export function getSessionDegreeWeights(stats: SessionStats): SessionDegreeWeights {
  const distribution = aggregateSessionDegreeDistribution(stats)
  const maxCount = Math.max(...distribution.map((item) => item.count), 0)

  return Object.fromEntries(
    distribution.map(({ degree, count }) => [degree, maxCount - count + 1]),
  )
}

export function populationVariance(counts: number[]): number {
  if (counts.length === 0) return 0

  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length
  return counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length
}

/** 非复习模式模拟测试中，各音级出题次数的总体方差上限。 */
export const MAX_SESSION_DEGREE_COUNT_VARIANCE = 4
