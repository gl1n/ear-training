export type QuizResult = {
  correct: boolean
  responseTimeMs: number
}

export type IntervalStats = {
  correctCount: number
  totalCount: number
  totalResponseTimeMs: number
}

export type SessionStats = {
  byInterval: Record<string, IntervalStats>
}

export const EMPTY_SESSION_STATS: SessionStats = {
  byInterval: {},
}

const EMPTY_INTERVAL_STATS: IntervalStats = {
  correctCount: 0,
  totalCount: 0,
  totalResponseTimeMs: 0,
}

export function recordResult(
  stats: SessionStats,
  intervalId: string,
  result: QuizResult,
): SessionStats {
  const current = stats.byInterval[intervalId] ?? EMPTY_INTERVAL_STATS

  return {
    byInterval: {
      ...stats.byInterval,
      [intervalId]: {
        correctCount: current.correctCount + (result.correct ? 1 : 0),
        totalCount: current.totalCount + 1,
        totalResponseTimeMs: current.totalResponseTimeMs + result.responseTimeMs,
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

export function getAverageResponseTimeMs(stats: SessionStats): number | null {
  const totalMs = Object.values(stats.byInterval).reduce(
    (sum, interval) => sum + interval.totalResponseTimeMs,
    0,
  )
  const count = getTotalAnswerCount(stats)
  if (count === 0) return null
  return totalMs / count
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function getTotalAnswerCount(stats: SessionStats): number {
  return Object.values(stats.byInterval).reduce((sum, interval) => sum + interval.totalCount, 0)
}

export function hasSessionAttempts(stats: SessionStats): boolean {
  return getTotalAnswerCount(stats) > 0
}
