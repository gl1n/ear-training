import { describe, expect, it } from 'vitest'
import {
  EMPTY_FRETBOARD_STATS,
  createFretboardQuestion,
  midiAt,
  noteAt,
  recordFretboardAnswer,
  regionId,
} from './fretboard'

describe('fretboard quiz', () => {
  it('uses standard guitar tuning', () => {
    expect(noteAt(0, 1)).toBe('F')
    expect(noteAt(1, 1)).toBe('C')
    expect(noteAt(5, 12)).toBe('E')
    expect(midiAt(0, 1)).toBe(65)
    expect(midiAt(5, 12)).toBe(52)
  })

  it('creates a 3 string by 4 fret question inside the 12-fret board', () => {
    const values = [0.99, 0.99, 0.5]
    const question = createFretboardQuestion(() => values.shift() ?? 0)

    expect(question.region).toEqual({ stringStart: 3, fretStart: 9 })
    const regionNotes = Array.from({ length: 12 }, (_, index) => noteAt(
      question.region.stringStart + Math.floor(index / 4),
      question.region.fretStart + index % 4,
    ))
    expect(regionNotes).toContain(question.targetNote)
  })

  it('records note and region performance without mutating previous stats', () => {
    const question = createFretboardQuestion(() => 0)
    const next = recordFretboardAnswer(EMPTY_FRETBOARD_STATS, question, true, 420)

    expect(next.notes[question.targetNote]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(next.regions[regionId(question.region)]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(EMPTY_FRETBOARD_STATS.notes[question.targetNote]).toBeUndefined()
  })
})
