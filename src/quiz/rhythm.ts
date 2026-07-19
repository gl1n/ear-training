export const RHYTHM_STEPS_PER_BAR = 16
export const RHYTHM_BEATS_PER_BAR = 4

export type RhythmDifficulty = 1 | 2 | 3 | 4

export type RhythmPattern = {
  steps: number[]
  difficulty: RhythmDifficulty
  signature: string
}

export type RhythmHitGrade = 'perfect' | 'close' | 'miss'

export type RhythmTargetResult = {
  step: number
  grade: RhythmHitGrade
  offsetBeats: number | null
}

export type RhythmScore = {
  accuracy: number
  perfectCount: number
  closeCount: number
  missedCount: number
  extraCount: number
  meanOffsetBeats: number | null
  targets: RhythmTargetResult[]
}

export type RhythmTolerance = {
  perfectWindowSec: number
  closeWindowSec: number
}

const PATTERN_BANK: Record<RhythmDifficulty, number[][]> = {
  1: [
    [0, 4, 8, 12],
    [0, 4, 8],
    [0, 8, 12],
    [0, 4, 12],
    [0, 8],
  ],
  2: [
    [0, 2, 4, 8, 12],
    [0, 4, 6, 8, 12],
    [0, 4, 8, 10, 12],
    [0, 4, 8, 12, 14],
    [0, 2, 4, 8, 10, 12],
  ],
  3: [
    [0, 2, 6, 8, 12],
    [0, 4, 6, 10, 12],
    [0, 4, 10, 14],
    [0, 2, 8, 10, 14],
    [0, 6, 8, 12, 14],
  ],
  4: [
    [0, 1, 2, 4, 6, 8, 9, 10, 12, 14],
    [0, 2, 3, 4, 7, 8, 10, 12, 13, 14],
    [0, 1, 4, 5, 6, 8, 10, 11, 12, 14],
    [0, 2, 5, 6, 8, 9, 12, 13, 15],
    [0, 3, 4, 6, 7, 8, 10, 12, 14, 15],
  ],
}

export function createRhythmPattern(
  difficulty: RhythmDifficulty,
  random = Math.random,
  previousSignature?: string,
): RhythmPattern {
  const candidates = PATTERN_BANK[difficulty]
  const available = candidates.filter((steps) => steps.join('-') !== previousSignature)
  const pool = available.length > 0 ? available : candidates
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))
  const steps = [...pool[index]]
  return { steps, difficulty, signature: steps.join('-') }
}

export function getRhythmTolerance(
  pattern: RhythmPattern,
  beatDurationSec: number,
): RhythmTolerance {
  const sortedSteps = [...pattern.steps].sort((a, b) => a - b)
  const stepGaps = sortedSteps.slice(1).map((step, index) => step - sortedSteps[index])
  const smallestStepGap = stepGaps.length > 0 ? Math.min(...stepGaps) : 4
  const smallestIntervalSec = smallestStepGap * beatDurationSec / 4
  return {
    perfectWindowSec: Math.min(0.07, smallestIntervalSec * 0.25),
    closeWindowSec: Math.min(0.15, smallestIntervalSec * 0.45),
  }
}

export function scoreRhythmTaps(
  pattern: RhythmPattern,
  tapTimesSec: number[],
  beatDurationSec: number,
): RhythmScore {
  const targetsSec = pattern.steps.map((step) => step * beatDurationSec / 4)
  const tolerance = getRhythmTolerance(pattern, beatDurationSec)
  const pairs = targetsSec.flatMap((target, targetIndex) =>
    tapTimesSec.map((tap, tapIndex) => ({
      targetIndex,
      tapIndex,
      distanceSec: Math.abs(tap - target),
      offsetBeats: (tap - target) / beatDurationSec,
    })),
  ).filter((pair) => pair.distanceSec <= tolerance.closeWindowSec)
    .sort((a, b) => a.distanceSec - b.distanceSec)

  const matchedTargets = new Map<number, { tapIndex: number; offsetBeats: number }>()
  const matchedTaps = new Set<number>()

  for (const pair of pairs) {
    if (matchedTargets.has(pair.targetIndex) || matchedTaps.has(pair.tapIndex)) continue
    matchedTargets.set(pair.targetIndex, {
      tapIndex: pair.tapIndex,
      offsetBeats: pair.offsetBeats,
    })
    matchedTaps.add(pair.tapIndex)
  }

  const targets = pattern.steps.map((step, targetIndex): RhythmTargetResult => {
    const match = matchedTargets.get(targetIndex)
    if (!match) return { step, grade: 'miss', offsetBeats: null }
    const grade: RhythmHitGrade = Math.abs(match.offsetBeats * beatDurationSec) <= tolerance.perfectWindowSec
      ? 'perfect'
      : 'close'
    return { step, grade, offsetBeats: match.offsetBeats }
  })

  const perfectCount = targets.filter((target) => target.grade === 'perfect').length
  const closeCount = targets.filter((target) => target.grade === 'close').length
  const missedCount = targets.length - perfectCount - closeCount
  const extraCount = tapTimesSec.length - matchedTaps.size
  const earned = perfectCount + closeCount * 0.65 - extraCount * 0.25
  const accuracy = Math.round(Math.max(0, Math.min(1, earned / targets.length)) * 100)
  const offsets = targets.flatMap((target) =>
    target.offsetBeats === null ? [] : [target.offsetBeats],
  )
  const meanOffsetBeats = offsets.length === 0
    ? null
    : offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length

  return {
    accuracy,
    perfectCount,
    closeCount,
    missedCount,
    extraCount,
    meanOffsetBeats,
    targets,
  }
}

export function adaptRhythmDifficulty(
  current: RhythmDifficulty,
  recentScores: number[],
): RhythmDifficulty {
  const lastTen = recentScores.slice(-10)
  if (
    lastTen.length === 10 &&
    lastTen.every((score) => score >= 75) &&
    lastTen.reduce((sum, score) => sum + score, 0) / 10 >= 90
  ) {
    return Math.min(4, current + 1) as RhythmDifficulty
  }

  const lastFive = recentScores.slice(-5)
  if (
    lastFive.length === 5 &&
    lastFive.reduce((sum, score) => sum + score, 0) / 5 < 50
  ) {
    return Math.max(1, current - 1) as RhythmDifficulty
  }

  return current
}
