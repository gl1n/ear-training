import { describe, expect, it } from 'vitest'
import { initialPattern, migratePattern, noteMidi, randomTonic, isPattern, putNote, resizePattern } from './pattern'

describe('melody patterns', () => {
  it('preserves bar-relative positions and clips notes when changing meter', () => {
    const result = resizePattern(initialPattern, 3, 2)
    expect(result.notes.map((n) => n.step)).toEqual([0, 4, 8, 12, 16, 20])
    expect(isPattern(result)).toBe(true)
    expect(resizePattern(result, 3, 1).notes).toHaveLength(3)
  })
  it('preserves the preceding note and clamps at the pattern end', () => {
    const result = putNote(initialPattern, { step: 30, degree: 1, accidental: 0, octave: 1, length: 8 })
    expect(result.notes.at(-1)).toEqual({ step: 30, degree: 1, accidental: 0, octave: 1, length: 2 })
    expect(result.notes.find((n) => n.step === 28)?.length).toBe(2)
    expect(isPattern(result)).toBe(true)
  })
  it('rejects corrupt saved data including overlaps and invalid tempos', () => {
    expect(isPattern(initialPattern)).toBe(true)
    expect(isPattern({ ...initialPattern, bpm: 0 })).toBe(false)
    expect(isPattern({ ...initialPattern, notes: [{ step: 0, degree: 1, accidental: 0, octave: 0, length: 5 }, { step: 4, degree: 2, accidental: 0, octave: 0, length: 1 }] })).toBe(false)
    expect(isPattern({ ...initialPattern, notes: [null] })).toBe(false)
  })

})

it('transposes degrees, accidentals and octaves relative to do', () => {
  expect(noteMidi({ degree: 3, accidental: -1, octave: 1 }, 62)).toBe(77)
  expect(noteMidi({ degree: 7, accidental: 1, octave: -1 }, 60)).toBe(60)
  expect(noteMidi({ degree: 1, accidental: 0, octave: 0 }, 65)).toBe(65)
})
it('chooses all twelve tonics and excludes the previous tonic', () => {
  expect(randomTonic(undefined, () => 0)).toBe(60)
  expect(randomTonic(undefined, () => 0.999)).toBe(71)
  for (let previous = 60; previous <= 71; previous++) {
    for (let i = 0; i < 11; i++) expect(randomTonic(previous, () => i / 11)).not.toBe(previous)
  }
})
it('migrates saved absolute notes without changing their pitches', () => {
  const old = { ...initialPattern, notes: [{ step: 0, midi: 61, length: 4 }, { step: 4, midi: 48, length: 4 }, { step: 8, midi: 84, length: 4 }] }
  const migrated = migratePattern(old)!
  expect(isPattern(migrated)).toBe(true)
  expect(migrated.notes.map((n) => noteMidi(n, 60))).toEqual([61, 48, 84])
})
it('inserting in the second cell preserves the first cell and later notes', () => {
  const result = putNote(initialPattern, { step: 1, degree: 2, accidental: 0, octave: 0, length: 4 })
  expect(result.notes[0]).toEqual({ ...initialPattern.notes[0], length: 1 })
  expect(result.notes[1]).toEqual({ step: 1, degree: 2, accidental: 0, octave: 0, length: 3 })
  expect(result.notes.slice(2)).toEqual(initialPattern.notes.slice(1))
  expect(isPattern(result)).toBe(true)
  expect(initialPattern.notes[0].length).toBe(4)
})
it('replaces an onset without deleting adjacent notes', () => {
  const result = putNote(initialPattern, { step: 4, degree: 7, accidental: -1, octave: 1, length: 16 })
  expect(result.notes[0]).toEqual(initialPattern.notes[0])
  expect(result.notes[1]).toEqual({ step: 4, degree: 7, accidental: -1, octave: 1, length: 4 })
  expect(result.notes.slice(2)).toEqual(initialPattern.notes.slice(2))
  expect(isPattern(result)).toBe(true)
})
it('clamps inserted notes to the bar boundary', () => {
  const result = putNote({ ...initialPattern, notes: [] }, { step: 15, degree: 1, accidental: 0, octave: 0, length: 8 })
  expect(result.notes[0].length).toBe(1)
})

