import { describe, expect, it } from 'vitest'
import {
  PENTATONIC_REPETITIONS_PER_POSITION,
  advancePentatonicRepetition,
  createPentatonicRun,
  createPentatonicQuestion,
  midiMatchesNoteName,
  PENTATONIC_SCALES,
  questionKey,
} from './pentatonicPlay'

describe('pentatonic guitar play', () => {
  it('judges by note name instead of absolute octave', () => {
    expect(midiMatchesNoteName(40, 'E')).toBe(true)
    expect(midiMatchesNoteName(52, 'E')).toBe(true)
    expect(midiMatchesNoteName(53, 'E')).toBe(false)
  })

  it('creates a practical root and guided third-or-fifth position', () => {
    const question = createPentatonicQuestion(() => 0, 'major')

    expect(question.notes).toHaveLength(5)
    expect(PENTATONIC_SCALES.major.guideIndexes).toContain(question.guideIndex)
    expect(question.rootPosition.note).toBe(question.rootNote)
    expect(question.guidePosition.note).toBe(question.notes[question.guideIndex])
    expect(question.guidePosition.stringIndex).not.toBe(question.rootPosition.stringIndex)
    expect(Math.abs(question.guidePosition.fret - question.rootPosition.fret)).toBeLessThanOrEqual(4)
  })

  it('avoids immediately repeating the same position pair', () => {
    const first = createPentatonicQuestion(() => 0, 'minor')
    const second = createPentatonicQuestion(() => 0, 'minor', questionKey(first))

    expect(questionKey(second)).not.toBe(questionKey(first))
  })

  it('keeps the requested root note across generated rounds', () => {
    const first = createPentatonicQuestion(() => 0.25, 'major', undefined, 'A')
    const second = createPentatonicQuestion(() => 0.75, 'major', questionKey(first), 'A')

    expect(first.rootNote).toBe('A')
    expect(second.rootNote).toBe('A')
    expect(questionKey(second)).not.toBe(questionKey(first))
  })

  it('requires three completed repetitions before advancing the position', () => {
    const first = advancePentatonicRepetition(0)
    const second = advancePentatonicRepetition(first.completedRepetitions)
    const third = advancePentatonicRepetition(second.completedRepetitions)

    expect(PENTATONIC_REPETITIONS_PER_POSITION).toBe(3)
    expect(first).toEqual({ completedRepetitions: 1, positionComplete: false })
    expect(second).toEqual({ completedRepetitions: 2, positionComplete: false })
    expect(third).toEqual({ completedRepetitions: 3, positionComplete: true })
  })

  it('builds one continuous ascending and descending run', () => {
    expect(createPentatonicRun(['1', '2', '3', '5', '6'])).toEqual([
      '1', '2', '3', '5', '6', '5', '3', '2', '1',
    ])
  })

  it('rejects an incomplete scale when building a run', () => {
    expect(() => createPentatonicRun(['1', '2', '3'])).toThrow()
  })

})
