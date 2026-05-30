import { describe, expect, it } from 'vitest'
import {
  MAX_LEVEL,
  MIN_LEVEL,
  MISTAKE_SCORE_DELTA,
  RANDOM_POOL_RATE,
  WEAK_POOL_RATE,
  bumpLevel,
  decayLevel,
  levelToWeight,
  listWeakPriorityItems,
  migrateLegacyPriority,
  type QuizPriorityStore,
} from './quizPriority'

describe('bumpLevel', () => {
  it('adds MISTAKE_SCORE_DELTA and caps at MAX_LEVEL', () => {
    const store: QuizPriorityStore = {}
    bumpLevel(store, '48,50')
    expect(store['48,50']).toBe(2)
    bumpLevel(store, '48,50')
    expect(store['48,50']).toBe(4)
    bumpLevel(store, '48,50')
    expect(store['48,50']).toBe(MAX_LEVEL)
    bumpLevel(store, '48,50')
    expect(store['48,50']).toBe(MAX_LEVEL)
  })
})

describe('decayLevel', () => {
  it('subtracts 1 and deletes when below MIN_LEVEL', () => {
    const store: QuizPriorityStore = { '48,50': 2 }
    decayLevel(store, '48,50')
    expect(store['48,50']).toBe(MIN_LEVEL)

    const storeAtMin: QuizPriorityStore = { '48,50': MIN_LEVEL }
    decayLevel(storeAtMin, '48,50')
    expect(storeAtMin['48,50']).toBeUndefined()

    const store2: QuizPriorityStore = { '48,50': 5 }
    decayLevel(store2, '48,50')
    expect(store2['48,50']).toBe(4)
  })
})

describe('migrateLegacyPriority', () => {
  it('maps legacy float 3.375 to MAX_LEVEL', () => {
    expect(migrateLegacyPriority(3.375)).toBe(MAX_LEVEL)
  })

  it('keeps valid integer scores in 1..5', () => {
    expect(migrateLegacyPriority(3)).toBe(3)
    expect(migrateLegacyPriority(5)).toBe(5)
  })
})

describe('mistake and correct deltas', () => {
  it('idle +2 then correct -1 leaves score 1', () => {
    const store: QuizPriorityStore = {}
    bumpLevel(store, '48,50')
    expect(store['48,50']).toBe(MISTAKE_SCORE_DELTA)
    decayLevel(store, '48,50')
    expect(store['48,50']).toBe(MIN_LEVEL)
  })

  it('mistake +2 twice then four correct -1 clears entry', () => {
    const store: QuizPriorityStore = {}
    bumpLevel(store, '48,50')
    bumpLevel(store, '48,50')
    expect(store['48,50']).toBe(4)
    decayLevel(store, '48,50')
    expect(store['48,50']).toBe(3)
    decayLevel(store, '48,50')
    expect(store['48,50']).toBe(2)
    decayLevel(store, '48,50')
    expect(store['48,50']).toBe(MIN_LEVEL)
    decayLevel(store, '48,50')
    expect(store['48,50']).toBeUndefined()
  })
})

describe('pool rates', () => {
  it('uses fixed 35% weak / 65% random', () => {
    expect(WEAK_POOL_RATE).toBe(0.35)
    expect(RANDOM_POOL_RATE).toBe(0.65)
  })
})

describe('listWeakPriorityItems', () => {
  it('sorts by level descending', () => {
    const store: QuizPriorityStore = { '48,50': 2, '60,64': 5 }
    const items = listWeakPriorityItems(store, 'ascending', ['M2', 'M3'])
    expect(items.length).toBeGreaterThanOrEqual(1)
    if (items.length >= 2) {
      expect(items[0]!.level).toBeGreaterThanOrEqual(items[1]!.level)
    }
  })
})

describe('levelToWeight', () => {
  it('maps score to pick weight inside weak branch', () => {
    expect(levelToWeight(5)).toBe(6)
    expect(levelToWeight(1)).toBe(2)
  })
})
