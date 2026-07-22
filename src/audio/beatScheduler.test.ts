import { describe, expect, it } from 'vitest'
import { getBeatPosition, stepDurationSec } from './beatScheduler'

describe('beat scheduler timing', () => {
  it('calculates subdivision duration from bpm', () => {
    expect(stepDurationSec(120)).toBe(0.5)
    expect(stepDurationSec(120, 2)).toBe(0.25)
  })

  it('maps eighth-note steps onto a 4/4 bar', () => {
    expect(getBeatPosition(0, 4, 2, 1)).toMatchObject({ bar: 0, beat: 0, subdivision: 0 })
    expect(getBeatPosition(7, 4, 2, 2.75)).toMatchObject({ bar: 0, beat: 3, subdivision: 1 })
    expect(getBeatPosition(8, 4, 2, 3)).toMatchObject({ bar: 1, beat: 0, subdivision: 0 })
  })
})
