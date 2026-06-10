import { describe, expect, it, vi } from 'vitest'
import { pickUniform, pickWeighted } from './weightedPick'

describe('pickUniform', () => {
  it('returns null for an empty array', () => {
    expect(pickUniform([])).toBeNull()
  })

  it('returns the only item in a single-element array', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(pickUniform(['only'])).toBe('only')
    vi.restoreAllMocks()
  })
})

describe('pickWeighted', () => {
  it('returns null when all weights are zero', () => {
    expect(pickWeighted([{ id: 'a' }, { id: 'b' }], () => 0)).toBeNull()
  })

  it('returns null for an empty array', () => {
    expect(pickWeighted([], () => 1)).toBeNull()
  })

  it('returns the only positive-weight item', () => {
    expect(
      pickWeighted(
        [
          { id: 'a', weight: 0 },
          { id: 'b', weight: 3 },
        ],
        (item) => item.weight,
      ),
    ).toEqual({ id: 'b', weight: 3 })
  })

  it('picks the first bucket when random is near zero', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(
      pickWeighted(
        [
          { id: 'a', weight: 2 },
          { id: 'b', weight: 8 },
        ],
        (item) => item.weight,
      ),
    ).toEqual({ id: 'a', weight: 2 })

    vi.restoreAllMocks()
  })
})
