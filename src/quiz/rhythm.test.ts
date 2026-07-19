import { describe, expect, it } from 'vitest'
import {
  adaptRhythmDifficulty,
  createRhythmPattern,
  getRhythmTolerance,
  scoreRhythmTaps,
  type RhythmPattern,
} from './rhythm'

const QUARTERS: RhythmPattern = {
  steps: [0, 4, 8, 12],
  difficulty: 1,
  signature: '0-4-8-12',
}

describe('rhythm pattern generation', () => {
  it('uses the selected difficulty and avoids the previous pattern', () => {
    const pattern = createRhythmPattern(1, () => 0, '0-4-8-12')
    expect(pattern.difficulty).toBe(1)
    expect(pattern.signature).not.toBe('0-4-8-12')
  })

  it('keeps every onset inside a sixteen-step bar', () => {
    const pattern = createRhythmPattern(4, () => 0.999)
    expect(pattern.steps.every((step) => step >= 0 && step < 16)).toBe(true)
  })
})

describe('rhythm scoring', () => {
  it('awards perfect accuracy for taps on every target', () => {
    const score = scoreRhythmTaps(QUARTERS, [0, 0.5, 1, 1.5], 0.5)
    expect(score.accuracy).toBe(100)
    expect(score.perfectCount).toBe(4)
    expect(score.extraCount).toBe(0)
  })

  it('separates close, missed, and extra taps', () => {
    const score = scoreRhythmTaps(QUARTERS, [0.08, 0.5, 1.22, 1.5, 1.8], 0.5)
    expect(score.closeCount).toBe(1)
    expect(score.missedCount).toBe(1)
    expect(score.extraCount).toBe(2)
    expect(score.accuracy).toBe(54)
  })

  it('reports whether matched taps tend early or late', () => {
    const score = scoreRhythmTaps(QUARTERS, [0.03, 0.53, 1.03, 1.53], 0.5)
    expect(score.meanOffsetBeats).toBeCloseTo(0.06)
  })

  it('keeps early tolerance for the first onset', () => {
    const score = scoreRhythmTaps(QUARTERS, [-0.05, 0.5, 1, 1.5], 0.5)
    expect(score.perfectCount).toBe(4)
    expect(score.targets[0].offsetBeats).toBeCloseTo(-0.1)
  })
})

describe('rhythm tolerance', () => {
  it('caps tolerance for sparse rhythms in milliseconds', () => {
    expect(getRhythmTolerance(QUARTERS, 0.5)).toEqual({
      perfectWindowSec: 0.07,
      closeWindowSec: 0.15,
    })
  })

  it('tightens tolerance around sixteenth-note spacing', () => {
    const dense: RhythmPattern = {
      steps: [0, 1, 4, 8, 12],
      difficulty: 4,
      signature: '0-1-4-8-12',
    }
    expect(getRhythmTolerance(dense, 0.5).perfectWindowSec).toBeCloseTo(0.03125)
    expect(getRhythmTolerance(dense, 0.5).closeWindowSec).toBeCloseTo(0.05625)
  })
})

describe('adaptive rhythm difficulty', () => {
  it('moves up after ten consistently strong rounds', () => {
    expect(adaptRhythmDifficulty(2, [92, 94, 90, 91, 95, 88, 93, 90, 92, 91])).toBe(3)
  })

  it('does not move up on a short run of strong rounds', () => {
    expect(adaptRhythmDifficulty(2, [100, 100, 100, 100])).toBe(2)
  })

  it('moves down after five difficult rounds', () => {
    expect(adaptRhythmDifficulty(3, [48, 42, 51, 46, 49])).toBe(2)
  })

  it('stays inside the supported range', () => {
    expect(adaptRhythmDifficulty(4, Array.from({ length: 10 }, () => 100))).toBe(4)
    expect(adaptRhythmDifficulty(1, [0, 0, 0, 0, 0])).toBe(1)
  })
})
