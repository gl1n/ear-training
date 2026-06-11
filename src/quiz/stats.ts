import { DEGREE_OPTION_IDS } from './keys'
import { getScoreForReactionMs } from './challengeScoring'

export type QuizResult = {
  correct: boolean
}

export type DegreeCount = {
  degree: number
  count: number
}

export type AnswerKeyStats = {
  correctCount: number
  totalCount: number
}

/** @deprecated Use AnswerKeyStats */
export type IntervalStats = AnswerKeyStats

export type SessionStats = {
  byKey: Record<string, AnswerKeyStats>
  totalScore: number
}

export const EMPTY_SESSION_STATS: SessionStats = {
  byKey: {},
  totalScore: 0,
}

export type ChallengeQuizResult = QuizResult & {
  reactionMs?: number
}

const EMPTY_ANSWER_KEY_STATS: AnswerKeyStats = {
  correctCount: 0,
  totalCount: 0,
}

export function recordResult(
  stats: SessionStats,
  answerKey: string,
  result: QuizResult,
): SessionStats {
  const current = stats.byKey[answerKey] ?? EMPTY_ANSWER_KEY_STATS

  return {
    ...stats,
    byKey: {
      ...stats.byKey,
      [answerKey]: {
        correctCount: current.correctCount + (result.correct ? 1 : 0),
        totalCount: current.totalCount + 1,
      },
    },
  }
}

export function getCorrectAnswerCount(stats: SessionStats): number {
  return Object.values(stats.byKey).reduce((sum, entry) => sum + entry.correctCount, 0)
}

export function recordChallengeResult(
  stats: SessionStats,
  answerKey: string,
  result: ChallengeQuizResult,
): SessionStats {
  const next = recordResult(stats, answerKey, result)

  if (!result.correct || result.reactionMs === undefined) {
    return next
  }

  return {
    ...next,
    totalScore: next.totalScore + getScoreForReactionMs(result.reactionMs),
  }
}

/** 与单音相同的速度档位，但最高 1 分（无 Excellent/Great 加成）。 */
export function getScoreForReactionMsNoBonus(ms: number): number {
  return Math.min(1, getScoreForReactionMs(ms))
}

export function recordChallengeResultNoBonus(
  stats: SessionStats,
  answerKey: string,
  result: ChallengeQuizResult,
): SessionStats {
  const next = recordResult(stats, answerKey, result)

  if (!result.correct) {
    return next
  }

  const points =
    result.reactionMs !== undefined ? getScoreForReactionMsNoBonus(result.reactionMs) : 1

  return {
    ...next,
    totalScore: next.totalScore + points,
  }
}

/** 三音旋律：一组全对得 1 分，无反应时间加成。 */
export function recordMelodyGroupResult(
  stats: SessionStats,
  patternKey: string,
  correct: boolean,
): SessionStats {
  const next = recordResult(stats, patternKey, { correct })

  if (!correct) {
    return next
  }

  return {
    ...next,
    totalScore: next.totalScore + 1,
  }
}

export function aggregateMelodySessionDegreeDistribution(stats: SessionStats): DegreeCount[] {
  const counts = new Map<number, number>()

  for (const [key, entry] of Object.entries(stats.byKey)) {
    if (!key.includes('-')) continue

    for (const id of key.split('-')) {
      const degree = Number(id)
      counts.set(degree, (counts.get(degree) ?? 0) + entry.totalCount)
    }
  }

  return DEGREE_OPTION_IDS.map((id) => ({
    degree: Number(id),
    count: counts.get(Number(id)) ?? 0,
  }))
}

export function getMelodySessionDegreeWeights(stats: SessionStats): SessionDegreeWeights {
  const distribution = aggregateMelodySessionDegreeDistribution(stats)
  const maxCount = Math.max(...distribution.map((item) => item.count), 0)

  return Object.fromEntries(
    distribution.map(({ degree, count }) => [degree, maxCount - count + 1]),
  )
}

export function aggregateSessionPatternDistribution(
  stats: SessionStats,
): { pattern: string; count: number }[] {
  return Object.entries(stats.byKey)
    .filter(([key]) => key.includes('-'))
    .map(([pattern, entry]) => ({ pattern, count: entry.totalCount }))
    .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern))
}

export function getTotalScore(stats: SessionStats): number {
  return stats.totalScore
}

function getTotalAnswerCount(stats: SessionStats): number {
  return Object.values(stats.byKey).reduce((sum, entry) => sum + entry.totalCount, 0)
}

export function hasSessionAttempts(stats: SessionStats): boolean {
  return getTotalAnswerCount(stats) > 0
}

export function aggregateSessionDegreeDistribution(stats: SessionStats): DegreeCount[] {
  return DEGREE_OPTION_IDS.map((id) => ({
    degree: Number(id),
    count: stats.byKey[id]?.totalCount ?? 0,
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
