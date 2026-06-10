import { describe, expect, it, vi } from 'vitest'
import {
  aggregateByCorrectDegree,
  aggregateByDegreePair,
  MAX_RECENT_MISTAKES,
  recordNoteKeyMistake,
  weightedRandomNoteKeyQuizFromMistakes,
  type NoteKeyMistakeStatsStore,
} from './noteKeyMistakeStats'

describe('aggregateByCorrectDegree', () => {
  it('counts mistakes per correct degree', () => {
    const store: NoteKeyMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 3, wrongDegree: '1' },
      { previousNoteMidi: 62, correctDegree: 3, wrongDegree: '5' },
      { previousNoteMidi: null, correctDegree: 5, wrongDegree: '4' },
    ]

    expect(aggregateByCorrectDegree(store)).toEqual([
      { degree: 1, count: 0 },
      { degree: 2, count: 0 },
      { degree: 3, count: 2 },
      { degree: 4, count: 0 },
      { degree: 5, count: 1 },
      { degree: 6, count: 0 },
      { degree: 7, count: 0 },
    ])
  })
})

describe('aggregateByDegreePair', () => {
  it('groups mistakes by correct and wrong degree with ratios', () => {
    const store: NoteKeyMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 2, wrongDegree: '6' },
      { previousNoteMidi: 62, correctDegree: 2, wrongDegree: '6' },
      { previousNoteMidi: null, correctDegree: 2, wrongDegree: '1' },
      { previousNoteMidi: 64, correctDegree: 5, wrongDegree: '4' },
    ]

    expect(aggregateByDegreePair(store)).toEqual([
      { correctDegree: 2, wrongDegree: 6, count: 2, ratio: 0.5 },
      { correctDegree: 2, wrongDegree: 1, count: 1, ratio: 0.25 },
      { correctDegree: 5, wrongDegree: 4, count: 1, ratio: 0.25 },
    ])
  })

  it('returns an empty list when there are no mistakes', () => {
    expect(aggregateByDegreePair([])).toEqual([])
  })
})

describe('recordNoteKeyMistake', () => {
  it('caps the store at MAX_RECENT_MISTAKES', () => {
    const store: NoteKeyMistakeStatsStore = []

    for (let i = 0; i < MAX_RECENT_MISTAKES + 5; i++) {
      recordNoteKeyMistake(store, {
        previousNoteMidi: 60,
        correctDegree: 1,
        wrongDegree: '2',
      })
    }

    expect(store).toHaveLength(MAX_RECENT_MISTAKES)
    expect(store[0]).toEqual({
      previousNoteMidi: 60,
      correctDegree: 1,
      wrongDegree: '2',
    })
  })

  it('ignores invalid records', () => {
    const store: NoteKeyMistakeStatsStore = []

    recordNoteKeyMistake(store, {
      previousNoteMidi: 60,
      correctDegree: 8,
      wrongDegree: '2',
    })

    expect(store).toHaveLength(0)
  })
})

describe('weightedRandomNoteKeyQuizFromMistakes', () => {
  const session = { tonicMidi: 60, tonicPitchClass: 0, label: 'C 大调' }

  it('returns a quiz with the chosen mistake degree', () => {
    const store: NoteKeyMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 5, wrongDegree: '3' },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quiz = weightedRandomNoteKeyQuizFromMistakes(store, session, 48, 85, 60)
    expect(quiz).not.toBeNull()
    expect(quiz!.degree).toBe(5)
    expect(quiz!.previousNoteMidi).toBe(60)

    vi.restoreAllMocks()
  })

  it('returns null when the degree is unavailable in the current key range', () => {
    const store: NoteKeyMistakeStatsStore = [
      { previousNoteMidi: 60, correctDegree: 5, wrongDegree: '3' },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quiz = weightedRandomNoteKeyQuizFromMistakes(store, session, 60, 60, null)
    expect(quiz).toBeNull()

    vi.restoreAllMocks()
  })
})
