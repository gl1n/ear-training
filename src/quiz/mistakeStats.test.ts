import { describe, expect, it } from 'vitest'
import {
  LOG_PITCH_BIN_WIDTH,
  MAX_RECENT_MISTAKES,
  buildHistogram,
  buildKdeCurve,
  midiToLogPitch,
  recordMistake,
  silvermanBandwidth,
  type MistakeStatsStore,
} from './mistakeStats'

describe('midiToLogPitch', () => {
  it('maps A4 (MIDI 69) to log2(440)', () => {
    expect(midiToLogPitch(69)).toBeCloseTo(Math.log2(440), 10)
  })

  it('increases by 1/12 per semitone', () => {
    expect(midiToLogPitch(70) - midiToLogPitch(69)).toBeCloseTo(1 / 12, 10)
  })
})

describe('buildHistogram', () => {
  it('bins root mistakes by semitone within range', () => {
    const store: MistakeStatsStore = [60, 60, 62, 80, 80, 80, 80, 80]
    const { bins, totalInRange } = buildHistogram(store, 60, 63)

    expect(totalInRange).toBe(3)
    expect(bins).toHaveLength(4)
    expect(bins[0]).toMatchObject({ midi: 60, count: 2 })
    expect(bins[1]).toMatchObject({ midi: 61, count: 0 })
    expect(bins[2]).toMatchObject({ midi: 62, count: 1 })
    expect(bins[3]).toMatchObject({ midi: 63, count: 0 })
  })
})

describe('recordMistake', () => {
  it('appends each mistake', () => {
    const store: MistakeStatsStore = []
    recordMistake(store, 60)
    recordMistake(store, 60)
    expect(store).toEqual([60, 60])
  })

  it('keeps only the most recent mistakes', () => {
    const store: MistakeStatsStore = []

    for (let i = 0; i < MAX_RECENT_MISTAKES + 5; i++) {
      recordMistake(store, 60 + (i % 12))
    }

    expect(store).toHaveLength(MAX_RECENT_MISTAKES)
    expect(store[0]).toBe(60 + (5 % 12))
    expect(store.at(-1)).toBe(60 + ((MAX_RECENT_MISTAKES + 4) % 12))
  })
})

describe('silvermanBandwidth', () => {
  it('clamps to at least one semitone for tiny samples', () => {
    expect(silvermanBandwidth([midiToLogPitch(60)])).toBe(LOG_PITCH_BIN_WIDTH)
    expect(silvermanBandwidth([midiToLogPitch(60), midiToLogPitch(60)])).toBe(
      LOG_PITCH_BIN_WIDTH,
    )
  })

  it('grows with spread for larger samples', () => {
    const tight = [60, 61, 62].map(midiToLogPitch)
    const wide = [48, 60, 72].map(midiToLogPitch)
    expect(silvermanBandwidth(wide)).toBeGreaterThan(silvermanBandwidth(tight))
  })
})

describe('buildKdeCurve', () => {
  it('peaks near the densest mistake cluster', () => {
    const store: MistakeStatsStore = [60, 60, 60, 60, 60, 72]
    const curve = buildKdeCurve(store, 60, 72)
    expect(curve.length).toBeGreaterThan(0)

    const peak = curve.reduce((best, point) => (point.count > best.count ? point : best))
    expect(peak.logPitch).toBeCloseTo(midiToLogPitch(60), 1)
    expect(peak.count).toBeGreaterThan(
      curve.find((point) => Math.abs(point.logPitch - midiToLogPitch(72)) < 0.01)!.count,
    )
  })

  it('returns empty curve when there are no in-range mistakes', () => {
    expect(buildKdeCurve([40, 40, 40], 60, 72)).toEqual([])
  })
})
