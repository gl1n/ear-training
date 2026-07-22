import { describe, expect, it } from 'vitest'
import {
  MODAL_SCALE_IDS,
  SCALE_TONIC_MAX_MIDI,
  SCALE_TONIC_MIN_MIDI,
  createScalePhrase,
  shuffleTonicPitchClasses,
  tonicMidiForPitchClass,
} from './modalScale'

describe('createScalePhrase', () => {
  it.each(MODAL_SCALE_IDS)('builds a two-bar %s round trip without repeating the upper tonic', (scaleId) => {
    const phrase = createScalePhrase(60, scaleId)
    expect(phrase).toHaveLength(15)
    expect(phrase.map((note) => note.step)).toEqual(Array.from({ length: 15 }, (_, index) => index))
    expect(phrase[0]?.midi).toBe(60)
    expect(phrase[7]?.midi).toBe(72)
    expect(phrase[8]?.midi).toBeLessThan(72)
    expect(phrase[14]).toMatchObject({ midi: 60, durationSteps: 2, degreeLabel: 'do' })
  })
})

describe('shuffleTonicPitchClasses', () => {
  it('covers every pitch class once and avoids the previous tonic first', () => {
    const bag = shuffleTonicPitchClasses(() => 0, 1)
    expect(new Set(bag)).toEqual(new Set(Array.from({ length: 12 }, (_, index) => index)))
    expect(bag[0]).not.toBe(1)
  })
})

describe('tonicMidiForPitchClass', () => {
  it('keeps all tonics in the middle register', () => {
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      const midi = tonicMidiForPitchClass(pitchClass)
      expect(midi).toBeGreaterThanOrEqual(SCALE_TONIC_MIN_MIDI)
      expect(midi).toBeLessThanOrEqual(SCALE_TONIC_MAX_MIDI)
      expect(midi % 12).toBe(pitchClass)
    }
  })
})
