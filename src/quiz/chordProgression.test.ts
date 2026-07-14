import { describe, expect, it } from 'vitest'
import { chordToneMelody, randomEarTrainingChord } from './chordProgression'

describe('chordToneMelody', () => {
  it('uses only chord tones above the played chord', () => {
    const chord = [48, 52, 55, 59]
    const melody = chordToneMelody(chord, 3)

    expect(melody).toHaveLength(3)
    expect(melody.every((midi) => midi > Math.max(...chord))).toBe(true)
    expect(melody.every((midi) => chord.slice(0, 3).some((tone) => tone % 12 === midi % 12))).toBe(true)
    expect(melody.slice(1).every((midi, index) => Math.abs(midi - melody[index]) <= 7)).toBe(true)
    expect(melody).toEqual([...melody].sort((a, b) => a - b))
  })

  it('does not use seventh or added tones in the melody', () => {
    const melody = chordToneMelody([48, 52, 55, 59, 62], 6)
    expect(melody.every((midi) => ![11, 2].includes(midi % 12))).toBe(true)
  })

  it('returns no notes when there are no melody beats', () => {
    expect(chordToneMelody([48, 52, 55], 0)).toEqual([])
  })
})

describe('randomEarTrainingChord', () => {
  it('keeps the theoretical root when the chord is inverted', () => {
    const chord = randomEarTrainingChord(
      { qualities: ['triad'], inversions: [2] },
      48,
      () => 0,
    )

    expect(chord.degree).toBe(1)
    expect(chord.midis).toEqual([55, 60, 64])
    expect(chord.rootMidi).toBe(48)
    expect(chord.inversion).toBe(2)
  })

  it('supports third-inversion seventh chords', () => {
    const chord = randomEarTrainingChord(
      { qualities: ['seventh'], inversions: [3] },
      48,
      () => 0,
    )

    expect(chord.midis).toEqual([59, 60, 64, 67])
    expect(chord.rootMidi).toBe(48)
    expect(chord.quality).toBe('seventh')
    expect(chord.inversion).toBe(3)
  })

  it('never applies third inversion to a triad', () => {
    const chord = randomEarTrainingChord(
      { qualities: ['triad', 'seventh'], inversions: [3] },
      48,
      () => 0,
    )

    expect(chord.quality).toBe('seventh')
    expect(chord.inversion).toBe(3)
  })
})
