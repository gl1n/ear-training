import { describe, expect, it } from 'vitest'
import { chordToneMelody } from './chordProgression'

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
