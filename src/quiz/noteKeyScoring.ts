const FAST_MS = 600
const QUICK_MS = 1_000
const NORMAL_MS = 1_500
const SLOW_MS = 2_000

export function getScoreForReactionMs(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) return 0
  if (ms < FAST_MS) return 2
  if (ms < QUICK_MS) return 1.5
  if (ms < NORMAL_MS) return 1
  if (ms < SLOW_MS) return 0.5
  return 0
}

export function getEncouragementForReactionMs(ms: number): string | null {
  const score = getScoreForReactionMs(ms)
  if (score <= 1) return null
  if (ms < FAST_MS) return 'Excellent!'
  if (ms < QUICK_MS) return 'Great!'
  return null
}
