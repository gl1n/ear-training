import { describe, expect, it } from 'vitest'
import { bpmFromTapTimes, clampBpm } from './metronome'

describe('metronome helpers', () => {
  it('clamps and rounds bpm', () => {
    expect(clampBpm(30)).toBe(40)
    expect(clampBpm(120.6)).toBe(121)
    expect(clampBpm(300)).toBe(220)
  })

  it('calculates bpm from recent taps', () => {
    expect(bpmFromTapTimes([0])).toBeNull()
    expect(bpmFromTapTimes([0, 500, 1000, 1500])).toBe(120)
  })
})
