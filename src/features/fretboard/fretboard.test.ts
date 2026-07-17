import { describe, expect, it } from 'vitest'
import {
  EMPTY_FRETBOARD_STATS,
  FRETBOARD_MISTAKE_RETENTION_MS,
  createFretboardQuestion,
  fretboardCellsForNote,
  fretboardMistakeHeatmap,
  midiAt,
  noteAt,
  randomFretboardNote,
  recordFretboardAnswer,
  recordFretboardTimeout,
  recentFretboardMistakes,
  regionId,
  questionId,
} from './fretboard'

describe('fretboard quiz', () => {
  it('uses standard guitar tuning', () => {
    expect(noteAt(0, 0)).toBe('E')
    expect(noteAt(0, 1)).toBe('F')
    expect(noteAt(1, 1)).toBe('C')
    expect(noteAt(5, 12)).toBe('E')
    expect(midiAt(0, 0)).toBe(64)
    expect(midiAt(0, 1)).toBe(65)
    expect(midiAt(5, 12)).toBe(52)
  })

  it('finds every position for a target note across the full fretboard', () => {
    const positions = fretboardCellsForNote('C')

    expect(positions).toHaveLength(6)
    expect(positions).toContainEqual({ stringIndex: 0, fret: 8, note: 'C', midi: 72 })
    expect(positions).toContainEqual({ stringIndex: 1, fret: 1, note: 'C', midi: 60 })
    expect(positions.every((cell) => noteAt(cell.stringIndex, cell.fret) === 'C')).toBe(true)
  })

  it('picks a target note from all twelve pitch classes', () => {
    expect(randomFretboardNote(() => 0)).toBe('C')
    expect(randomFretboardNote(() => 0.999)).toBe('B')
  })

  it('creates a 3 string by 4 fret question inside the 0–12 fret board', () => {
    const values = [0.99, 0.99, 0.5]
    const question = createFretboardQuestion(() => values.shift() ?? 0)

    expect(question.region).toEqual({ stringStart: 3, fretStart: 9 })
    const regionNotes = Array.from({ length: 12 }, (_, index) => noteAt(
      question.region.stringStart + Math.floor(index / 4),
      question.region.fretStart + index % 4,
    ))
    expect(regionNotes).toContain(question.targetNote)
  })

  it('includes open strings in generated questions', () => {
    const question = createFretboardQuestion(() => 0)

    expect(question).toEqual({
      region: { stringStart: 0, fretStart: 0 },
      targetNote: 'E',
    })
  })

  it('favors less-used regions in the random half of a session', () => {
    const counts = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => {
        const region = { stringStart: Math.floor(index / 10), fretStart: index % 10 }
        return [regionId(region), index === 39 ? 0 : 10]
      }),
    )
    const values = [0.79, 0]

    expect(createFretboardQuestion(
      () => values.shift() ?? 0,
      EMPTY_FRETBOARD_STATS,
      0,
      counts,
    )).toEqual({
      region: { stringStart: 3, fretStart: 9 },
      targetNote: 'B',
    })
  })

  it('records note and region performance without mutating previous stats', () => {
    const question = createFretboardQuestion(() => 0)
    const cell = { stringIndex: 0, fret: 1, note: noteAt(0, 1), midi: midiAt(0, 1) }
    const next = recordFretboardAnswer(EMPTY_FRETBOARD_STATS, question, cell, true, 420)

    expect(next.notes[question.targetNote]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(next.regions[regionId(question.region)]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(next.questions[questionId(question)]).toEqual({ attempts: 1, correct: 1, totalReactionMs: 420 })
    expect(next.answers).toEqual([{ position: { stringIndex: 0, fret: 1 }, correct: true, recordedAt: expect.any(Number) }])
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
    expect(fretboardMistakeHeatmap(next.answers, 1234)).toEqual({ '2:5': 1 })
  })

  it('records a timeout as an incorrect attempt without requiring a selected cell', () => {
    const question = { region: { stringStart: 1, fretStart: 4 }, targetNote: 'A' as const }
    const next = recordFretboardTimeout(EMPTY_FRETBOARD_STATS, question, 5000, 1234)

    expect(next.mistakes).toEqual([{
      timedOut: true,
      targetNote: 'A',
      region: question.region,
      recordedAt: 1234,
    }])
    expect(next.notes.A).toEqual({ attempts: 1, correct: 0, totalReactionMs: 5000 })
    expect(next.regions[regionId(question.region)]).toEqual({ attempts: 1, correct: 0, totalReactionMs: 5000 })
    expect(next.questions[questionId(question)]).toEqual({ attempts: 1, correct: 0, totalReactionMs: 5000 })
    expect(next.answers).toEqual([{
      position: { stringIndex: 3, fret: 7 },
      correct: false,
      recordedAt: 1234,
    }])
    expect(fretboardMistakeHeatmap(next.answers, 1234)).toEqual({ '3:7': 1 })
  })

  it('can review a timeout based on its incorrect answer statistics', () => {
    const question = { region: { stringStart: 1, fretStart: 4 }, targetNote: 'A' as const }
    const stats = recordFretboardTimeout(EMPTY_FRETBOARD_STATS, question, 5000, 1234)
    const values = [0, 0]

    expect(createFretboardQuestion(() => values.shift() ?? 0, stats, 1234)).toEqual(question)
  })

  it('marks every matching position when a full-fretboard question times out', () => {
    const question = { region: { stringStart: 0, fretStart: 0 }, targetNote: 'C' as const }
    const next = recordFretboardTimeout(EMPTY_FRETBOARD_STATS, question, 5000, 1234, true)

    expect(next.answers).toHaveLength(6)
    expect(next.answers.every((answer) => answer.correct === false)).toBe(true)
    expect(fretboardMistakeHeatmap(next.answers, 1234)).toEqual({
      '0:8': 1,
      '1:1': 1,
      '2:5': 1,
      '3:10': 1,
      '4:3': 1,
      '5:8': 1,
    })
  })

  it('weights unique note-plus-region mistakes by smoothed error rate', () => {
    const mistakes = [
      { position: { stringIndex: 0, fret: 1 }, selectedNote: 'F' as const, targetNote: 'A' as const, region: { stringStart: 0, fretStart: 1 }, recordedAt: 1 },
      { position: { stringIndex: 1, fret: 2 }, selectedNote: 'C♯' as const, targetNote: 'D' as const, region: { stringStart: 2, fretStart: 6 }, recordedAt: 2 },
      { position: { stringIndex: 1, fret: 3 }, selectedNote: 'D' as const, targetNote: 'D' as const, region: { stringStart: 2, fretStart: 6 }, recordedAt: 3 },
    ]

    const stats = {
      ...EMPTY_FRETBOARD_STATS,
      questions: {
        's1-3:f1-4:A': { attempts: 10, correct: 9, totalReactionMs: 0 },
        's3-5:f6-9:D': { attempts: 2, correct: 0, totalReactionMs: 0 },
      },
      mistakes,
    }

    const weightedValues = [0.3, 0.99]
    expect(createFretboardQuestion(() => weightedValues.shift() ?? 0, stats, 3)).toEqual({
      region: { stringStart: 2, fretStart: 6 },
      targetNote: 'D',
    })

    const randomValues = [0.49, 0, 0, 0]
    expect(createFretboardQuestion(() => randomValues.shift() ?? 0, stats, 3)).toEqual({
      region: { stringStart: 0, fretStart: 0 },
      targetNote: 'E',
    })
  })

  it('reduces review frequency after correct answers', () => {
    const question = { region: { stringStart: 0, fretStart: 1 }, targetNote: 'A' as const }
    const wrongCell = { stringIndex: 0, fret: 1, note: 'F' as const, midi: 65 }
    const correctCell = { stringIndex: 0, fret: 5, note: 'A' as const, midi: 69 }
    const afterMistake = recordFretboardAnswer(EMPTY_FRETBOARD_STATS, question, wrongCell, false, 500, 1)
    const afterCorrection = recordFretboardAnswer(afterMistake, question, correctCell, true, 400, 2)

    const reviewValues = [0.3, 0]
    expect(createFretboardQuestion(() => reviewValues.shift() ?? 0, afterMistake, 2)).toEqual(question)

    const randomValues = [0.3, 0, 0, 0]
    expect(createFretboardQuestion(() => randomValues.shift() ?? 0, afterCorrection, 2)).toEqual({
      region: { stringStart: 0, fretStart: 0 },
      targetNote: 'E',
    })
  })

  it('only keeps mistakes from the latest 48 hours', () => {
    const now = 200_000_000
    const recent = { position: { stringIndex: 0, fret: 0 }, selectedNote: 'E' as const, targetNote: 'A' as const, region: { stringStart: 0, fretStart: 0 }, recordedAt: now - FRETBOARD_MISTAKE_RETENTION_MS }
    const expired = { ...recent, recordedAt: recent.recordedAt - 1 }

    expect(recentFretboardMistakes([expired, recent], now)).toEqual([recent])
  })

  it('builds the 48-hour heatmap from position error rates', () => {
    const now = 200_000_000
    const expired = { position: { stringIndex: 0, fret: 1 }, correct: false, recordedAt: now - FRETBOARD_MISTAKE_RETENTION_MS - 1 }
    const answers = [
      expired,
      { position: { stringIndex: 0, fret: 1 }, correct: false, recordedAt: now - 2 },
      { position: { stringIndex: 0, fret: 1 }, correct: true, recordedAt: now - 1 },
      { position: { stringIndex: 1, fret: 3 }, correct: true, recordedAt: now },
    ]

    expect(fretboardMistakeHeatmap(answers, now)).toEqual({ '0:1': 0.5, '1:3': 0 })
  })
})
