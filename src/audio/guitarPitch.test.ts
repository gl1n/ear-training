import { describe, expect, it } from 'vitest'
import {
  GUITAR_MIN_RMS,
  GuitarPitchGate,
  frequencyToGuitarPitch,
  frequencyToMidi,
  guitarDetectionThresholds,
  type GuitarPitchReading,
} from './guitarPitch'

function reading(midi: number): GuitarPitchReading {
  return {
    frequency: 440 * 2 ** ((midi - 69) / 12),
    midi,
    cents: 0,
    clarity: 0.99,
    rms: 0.1,
  }
}

describe('guitar pitch detection', () => {
  it('converts standard guitar pitches to MIDI notes', () => {
    expect(frequencyToMidi(440)).toBe(69)
    expect(frequencyToMidi(82.4069)).toBeCloseTo(40, 3)
  })

  it('rejects noisy, quiet, and badly out-of-tune readings', () => {
    expect(frequencyToGuitarPitch(440, 0.5, 0.1)).toBeNull()
    expect(frequencyToGuitarPitch(440, 0.99, 0.001)).toBeNull()
    expect(frequencyToGuitarPitch(440 * 2 ** (0.45 / 12), 0.99, 0.1)).toBeNull()
  })

  it('accepts a stable lower-string reading with moderate clarity', () => {
    expect(frequencyToGuitarPitch(146.832, 0.86, 0.05)?.midi).toBe(50)
  })

  it('uses more sensitive thresholds for the first and second strings', () => {
    const lowStringThresholds = guitarDetectionThresholds(146.832)
    const secondStringThresholds = guitarDetectionThresholds(246.942)
    const firstStringThresholds = guitarDetectionThresholds(329.628)

    expect(secondStringThresholds.minRms).toBeLessThan(lowStringThresholds.minRms)
    expect(firstStringThresholds.minRms).toBeLessThan(secondStringThresholds.minRms)
    expect(frequencyToGuitarPitch(329.628, 0.8, 0.0045)?.midi).toBe(64)
    expect(frequencyToGuitarPitch(146.832, 0.8, 0.0045)).toBeNull()
  })

  it('still rejects very quiet or unclear high-frequency noise', () => {
    expect(frequencyToGuitarPitch(329.628, 0.7, 0.02)).toBeNull()
    expect(frequencyToGuitarPitch(329.628, 0.99, 0.002)).toBeNull()
  })

  it('emits a stable pluck once and rearms after release', () => {
    const gate = new GuitarPitchGate()
    const pitch = reading(64)

    expect(gate.update(pitch, pitch.rms)).toBeNull()
    expect(gate.update(pitch, pitch.rms)).toBeNull()
    expect(gate.update(pitch, pitch.rms)).toEqual(pitch)
    expect(gate.update(pitch, pitch.rms)).toBeNull()

    for (let frame = 0; frame < 4; frame += 1) {
      expect(gate.update(null, GUITAR_MIN_RMS / 4)).toBeNull()
    }
    expect(gate.update(pitch, pitch.rms)).toBeNull()
    expect(gate.update(pitch, pitch.rms)).toBeNull()
    expect(gate.update(pitch, pitch.rms)).toEqual(pitch)
  })

  it('can emit a newly played MIDI note without a silent gap', () => {
    const gate = new GuitarPitchGate()
    const first = reading(64)
    const second = reading(65)

    gate.update(first, first.rms)
    gate.update(first, first.rms)
    expect(gate.update(first, first.rms)).toEqual(first)
    gate.update(second, second.rms)
    gate.update(second, second.rms)
    expect(gate.update(second, second.rms)).toEqual(second)
  })

  it('treats octave-jumping high notes as one stable note name', () => {
    const gate = new GuitarPitchGate()
    const b4 = reading(71)
    const b5 = reading(83)

    expect(gate.update(b4, b4.rms)).toBeNull()
    expect(gate.update(b5, b5.rms)).toBeNull()
    expect(gate.update(b4, b4.rms)).toEqual(b4)
    expect(gate.update(b5, b5.rms)).toBeNull()
  })

})
