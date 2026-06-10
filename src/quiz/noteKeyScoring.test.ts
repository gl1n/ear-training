import { describe, expect, it } from 'vitest'
import { getScoreForReactionMs } from './noteKeyScoring'

describe('getScoreForReactionMs', () => {
  it('awards top tier below 600ms', () => {
    expect(getScoreForReactionMs(0)).toBe(2)
    expect(getScoreForReactionMs(599)).toBe(2)
  })

  it('awards quick tier from 600ms to 999ms', () => {
    expect(getScoreForReactionMs(600)).toBe(1.5)
    expect(getScoreForReactionMs(999)).toBe(1.5)
  })

  it('awards normal tier from 1000ms to 1499ms', () => {
    expect(getScoreForReactionMs(1_000)).toBe(1)
    expect(getScoreForReactionMs(1_499)).toBe(1)
  })

  it('awards slow tier from 1500ms to 1999ms', () => {
    expect(getScoreForReactionMs(1_500)).toBe(0.5)
    expect(getScoreForReactionMs(1_999)).toBe(0.5)
  })

  it('awards zero from 2000ms onward', () => {
    expect(getScoreForReactionMs(2_000)).toBe(0)
    expect(getScoreForReactionMs(5_000)).toBe(0)
  })

  it('returns zero for invalid input', () => {
    expect(getScoreForReactionMs(Number.NaN)).toBe(0)
    expect(getScoreForReactionMs(-1)).toBe(0)
  })
})
