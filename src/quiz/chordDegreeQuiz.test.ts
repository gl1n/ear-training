import { describe, expect, it, vi } from 'vitest'
import { createChordDegreeQuiz, createChordMidis, getChordDegreesForRange, randomChordDegreeTonicMidi } from './chordDegreeQuiz'

describe('getChordDegreesForRange', () => {
  it('provides progressive chord-degree sets', () => {
    expect(getChordDegreesForRange('primary')).toEqual([1, 4, 5])
    expect(getChordDegreesForRange('common')).toEqual([1, 4, 5, 6])
    expect(getChordDegreesForRange('all')).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('normalizes a custom chord-degree set', () => {
    expect(getChordDegreesForRange('custom', [6, 2, 3, 6, 8])).toEqual([2, 3, 6])
  })
})

describe('createChordDegreeQuiz', () => {
  it('creates a diatonic triad and applies the selected inversion', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5)
    expect(createChordDegreeQuiz()).toEqual({ degree: 1, inversion: 1, midis: [52, 55, 60] })
    vi.restoreAllMocks()
  })

  it('creates the diminished seventh-degree triad', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.999).mockReturnValueOnce(0)
    expect(createChordDegreeQuiz()).toEqual({ degree: 7, inversion: 0, midis: [59, 62, 65] })
    vi.restoreAllMocks()
  })

  it('transposes the quiz into the session key', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0)
    expect(createChordDegreeQuiz(65).midis).toEqual([53, 57, 60])
    vi.restoreAllMocks()
  })

  it('limits questions to the selected degrees and root position', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(createChordDegreeQuiz(60, [1, 4, 5], 'root')).toEqual({ degree: 5, inversion: 0, midis: [55, 59, 62] })
    vi.restoreAllMocks()
  })

  it('keeps random inversions around a shared register center', () => {
    const voicings = [1, 2, 3, 4, 5, 6, 7].flatMap((degree) =>
      ([0, 1, 2] as const).map((inversion) => createChordMidis(60, degree, inversion)),
    )
    expect(Math.min(...voicings.flat())).toBeGreaterThanOrEqual(49)
    expect(Math.max(...voicings.flat())).toBeLessThanOrEqual(69)
    const centers = voicings.map((notes) => notes.reduce((sum, note) => sum + note, 0) / 3)
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(12)
  })
})

describe('randomChordDegreeTonicMidi', () => {
  it('keeps every random tonic in the C3-B3 reference register', () => {
    expect(randomChordDegreeTonicMidi(() => 0)).toBe(48)
    expect(randomChordDegreeTonicMidi(() => 0.999)).toBe(59)
  })
})
