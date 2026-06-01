import { describe, expect, it } from 'vitest'
import {
  getQuizPitchKey,
  getValidIntervalsAtRoot,
  isRootValidForInterval,
  randomQuizWithRoot,
} from './intervals'

describe('isRootValidForInterval', () => {
  it('accepts ascending root within range', () => {
    const interval = { id: 'M2', semitones: 2, name: '大二度', short: '大二' }
    expect(isRootValidForInterval(60, interval, 'ascending', 48, 72)).toBe(true)
    expect(isRootValidForInterval(47, interval, 'ascending', 48, 72)).toBe(false)
    expect(isRootValidForInterval(73, interval, 'ascending', 48, 72)).toBe(false)
  })

  it('accepts descending root with enough headroom below', () => {
    const interval = { id: 'M2', semitones: 2, name: '大二度', short: '大二' }
    expect(isRootValidForInterval(62, interval, 'descending', 48, 72)).toBe(true)
    expect(isRootValidForInterval(49, interval, 'descending', 48, 72)).toBe(false)
  })
})

describe('randomQuizWithRoot', () => {
  it('returns quiz with fixed root for ascending', () => {
    const quiz = randomQuizWithRoot(60, ['M2', 'M3'], 'ascending', 48, 72)
    expect(quiz).not.toBeNull()
    expect(quiz!.root).toBe(60)
    expect(quiz!.direction).toBe('ascending')
  })

  it('returns null when root cannot fit any enabled interval', () => {
    expect(randomQuizWithRoot(72, ['P8'], 'ascending', 48, 71)).toBeNull()
  })

  it('returns descending quiz with lower second', () => {
    const quiz = randomQuizWithRoot(65, ['M2'], 'descending', 48, 72)
    expect(quiz).toMatchObject({ root: 65, second: 63, direction: 'descending' })
  })
})

describe('getQuizPitchKey', () => {
  it('orders ascending pitches low to high', () => {
    const quiz = randomQuizWithRoot(60, ['M2'], 'ascending', 48, 72)!
    expect(getQuizPitchKey(quiz)).toBe('60,62')
  })
})

describe('getValidIntervalsAtRoot', () => {
  it('filters intervals that do not fit at root', () => {
    const valid = getValidIntervalsAtRoot(116, ['M2', 'P8'], 'ascending', 48, 116)
    expect(valid.map((i) => i.id)).toEqual(['M2'])
  })
})
