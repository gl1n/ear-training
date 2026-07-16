import { describe, expect, it } from 'vitest'
import {
  EMPTY_FRETBOARD_STATS,
  FRETBOARD_MISTAKE_RETENTION_MS,
  createFretboardQuestion,
  fretboardMistakeHeatmap,
  midiAt,
  noteAt,
  recordFretboardAnswer,
  recentFretboardMistakes,
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
    const cell = { stringIndex: 0, fret: 1, note: noteAt(0, 1), midi: midiAt(0, 1) }
    const next = recordFretboardAnswer(EMPTY_FRETBOARD_STATS, question, cell, true, 420)

    expect(next.notes[question.targetNote]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(next.regions[regionId(question.region)]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(EMPTY_FRETBOARD_STATS.notes[question.targetNote]).toBeUndefined()
  })

  it('records every mistake with its position, selected note, target note, and region', () => {
    const question = { region: { stringStart: 1, fretStart: 4 }, targetNote: 'A' as const }
    const cell = { stringIndex: 2, fret: 5, note: noteAt(2, 5), midi: midiAt(2, 5) }
    const next = recordFretboardAnswer(EMPTY_FRETBOARD_STATS, question, cell, false, 700, 1234)

    expect(next.mistakes).toEqual([{
      position: { stringIndex: 2, fret: 5 },
      selectedNote: cell.note,
      targetNote: 'A',
      region: question.region,
      recordedAt: 1234,
    }])
    expect(fretboardMistakeHeatmap(next.mistakes, 1234)).toEqual({ '2:5': 1 })
  })

  it('uses half random questions and half note-plus-region weighted mistake questions', () => {
    const mistakes = [
      { position: { stringIndex: 0, fret: 1 }, selectedNote: 'F' as const, targetNote: 'A' as const, region: { stringStart: 0, fretStart: 1 }, recordedAt: 1 },
      { position: { stringIndex: 1, fret: 2 }, selectedNote: 'C♯' as const, targetNote: 'D' as const, region: { stringStart: 2, fretStart: 6 }, recordedAt: 2 },
      { position: { stringIndex: 1, fret: 3 }, selectedNote: 'D' as const, targetNote: 'D' as const, region: { stringStart: 2, fretStart: 6 }, recordedAt: 3 },
    ]

    const weightedValues = [0.75, 0.99]
    expect(createFretboardQuestion(() => weightedValues.shift() ?? 0, mistakes, 3)).toEqual({
      region: { stringStart: 2, fretStart: 6 },
      targetNote: 'D',
    })

    const randomValues = [0.49, 0, 0, 0]
    expect(createFretboardQuestion(() => randomValues.shift() ?? 0, mistakes, 3)).toEqual({
      region: { stringStart: 0, fretStart: 1 },
      targetNote: 'F',
    })
  })

  it('only keeps mistakes from the latest 48 hours', () => {
    const now = 200_000_000
    const recent = { position: { stringIndex: 0, fret: 1 }, selectedNote: 'F' as const, targetNote: 'A' as const, region: { stringStart: 0, fretStart: 1 }, recordedAt: now - FRETBOARD_MISTAKE_RETENTION_MS }
    const expired = { ...recent, recordedAt: recent.recordedAt - 1 }

    expect(recentFretboardMistakes([expired, recent], now)).toEqual([recent])
    expect(fretboardMistakeHeatmap([expired, recent], now)).toEqual({ '0:1': 1 })
  })
})
