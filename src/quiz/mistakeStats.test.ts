import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIntervalsByIds, type Quiz } from './intervals'
import {
  LOG_PITCH_BIN_WIDTH,
  MAX_RECENT_MISTAKES,
  MISTAKE_FOCUSED_RATE,
  MISTAKE_STATS_SCHEMA_VERSION,
  buildHistogram,
  buildKdeCurve,
  getLastMistakeQuizForRoot,
  loadMistakeStats,
  midiToLogPitch,
  recordMistake,
  silvermanBandwidth,
  weightedRandomQuizFromMistakes,
  type MistakeStatsStore,
} from './mistakeStats'

const MISTAKE_STATS_STORAGE_KEY = 'ear-trainer:mistake-stats'
const MISTAKE_STATS_SCHEMA_KEY = 'ear-trainer:mistake-stats-schema'

function makeQuiz(
  root: number,
  intervalId = 'M2',
  direction: Quiz['direction'] = 'ascending',
): Quiz {
  const interval = getIntervalsByIds([intervalId])[0]!
  const second =
    direction === 'descending' ? root - interval.semitones : root + interval.semitones

  return { root, second, interval, direction }
}

function rootRecord(root: number) {
  return { root }
}

describe('midiToLogPitch', () => {
  it('maps A4 (MIDI 69) to log2(440)', () => {
    expect(midiToLogPitch(69)).toBeCloseTo(Math.log2(440), 10)
  })

  it('increases by 1/12 per semitone', () => {
    expect(midiToLogPitch(70) - midiToLogPitch(69)).toBeCloseTo(1 / 12, 10)
  })
})

describe('buildHistogram', () => {
  it('bins root mistakes by semitone within range', () => {
    const store: MistakeStatsStore = [
      rootRecord(60),
      rootRecord(60),
      rootRecord(62),
      rootRecord(80),
      rootRecord(80),
      rootRecord(80),
      rootRecord(80),
      rootRecord(80),
    ]
    const { bins, totalInRange } = buildHistogram(store, 60, 63)

    expect(totalInRange).toBe(3)
    expect(bins).toHaveLength(4)
    expect(bins[0]).toMatchObject({ midi: 60, count: 2, lastMistakeQuiz: null })
    expect(bins[1]).toMatchObject({ midi: 61, count: 0, lastMistakeQuiz: null })
    expect(bins[2]).toMatchObject({ midi: 62, count: 1, lastMistakeQuiz: null })
    expect(bins[3]).toMatchObject({ midi: 63, count: 0, lastMistakeQuiz: null })
  })

  it('attaches the latest replayable quiz per root', () => {
    const firstQuiz = makeQuiz(60, 'M2', 'ascending')
    const latestQuiz = makeQuiz(60, 'P5', 'harmonic')
    const store: MistakeStatsStore = []

    recordMistake(store, firstQuiz)
    recordMistake(store, latestQuiz)

    const { bins } = buildHistogram(store, 60, 60)
    expect(bins[0]?.lastMistakeQuiz).toEqual(latestQuiz)
  })
})

describe('getLastMistakeQuizForRoot', () => {
  it('returns the newest replayable quiz for a root', () => {
    const olderQuiz = makeQuiz(60, 'M2', 'ascending')
    const newerQuiz = makeQuiz(60, 'P5', 'harmonic')
    const store: MistakeStatsStore = []

    recordMistake(store, olderQuiz)
    recordMistake(store, newerQuiz)

    expect(getLastMistakeQuizForRoot(store, 60)).toEqual(newerQuiz)
  })

  it('skips root-only legacy records', () => {
    const store: MistakeStatsStore = [rootRecord(60), rootRecord(60)]
    expect(getLastMistakeQuizForRoot(store, 60)).toBeNull()
  })
})

describe('recordMistake', () => {
  it('appends each mistake', () => {
    const store: MistakeStatsStore = []
    const quiz = makeQuiz(60)

    recordMistake(store, quiz)
    recordMistake(store, quiz)

    expect(store).toEqual([
      {
        root: 60,
        second: 62,
        intervalId: 'M2',
        direction: 'ascending',
      },
      {
        root: 60,
        second: 62,
        intervalId: 'M2',
        direction: 'ascending',
      },
    ])
  })

  it('keeps only the most recent mistakes', () => {
    const store: MistakeStatsStore = []

    for (let i = 0; i < MAX_RECENT_MISTAKES + 5; i++) {
      recordMistake(store, makeQuiz(60 + (i % 12)))
    }

    expect(store).toHaveLength(MAX_RECENT_MISTAKES)
    expect(store[0]?.root).toBe(60 + (5 % 12))
    expect(store.at(-1)?.root).toBe(60 + ((MAX_RECENT_MISTAKES + 4) % 12))
  })
})

describe('loadMistakeStats', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('discards legacy number arrays when schema guard is enabled', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === MISTAKE_STATS_SCHEMA_KEY) return String(MISTAKE_STATS_SCHEMA_VERSION)
        if (key === MISTAKE_STATS_STORAGE_KEY) return JSON.stringify([60, 62])
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })

    expect(loadMistakeStats()).toEqual([])
  })

  it('loads complete records when schema version matches', () => {
    const record = {
      root: 60,
      second: 62,
      intervalId: 'M2',
      direction: 'ascending' as const,
    }

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === MISTAKE_STATS_SCHEMA_KEY) return String(MISTAKE_STATS_SCHEMA_VERSION)
        if (key === MISTAKE_STATS_STORAGE_KEY) return JSON.stringify([record])
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })

    expect(loadMistakeStats()).toEqual([record])
  })

  it('clears stored stats when schema version changes', () => {
    const removeItem = vi.fn()

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === MISTAKE_STATS_SCHEMA_KEY) return '1'
        if (key === MISTAKE_STATS_STORAGE_KEY) {
          return JSON.stringify([
            {
              root: 60,
              second: 62,
              intervalId: 'M2',
              direction: 'ascending',
            },
          ])
        }
        return null
      }),
      setItem: vi.fn(),
      removeItem,
    })

    expect(loadMistakeStats()).toEqual([])
    expect(removeItem).toHaveBeenCalledWith(MISTAKE_STATS_STORAGE_KEY)
  })

  it('filters root-only records from current-format stores', () => {
    const completeRecord = {
      root: 62,
      second: 64,
      intervalId: 'M2',
      direction: 'ascending' as const,
    }

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === MISTAKE_STATS_SCHEMA_KEY) return String(MISTAKE_STATS_SCHEMA_VERSION)
        if (key === MISTAKE_STATS_STORAGE_KEY) {
          return JSON.stringify([{ root: 60 }, completeRecord])
        }
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })

    expect(loadMistakeStats()).toEqual([completeRecord])
  })
})

describe('silvermanBandwidth', () => {
  it('clamps to at least one semitone for tiny samples', () => {
    expect(silvermanBandwidth([midiToLogPitch(60)])).toBe(LOG_PITCH_BIN_WIDTH)
    expect(silvermanBandwidth([midiToLogPitch(60), midiToLogPitch(60)])).toBe(
      LOG_PITCH_BIN_WIDTH,
    )
  })

  it('grows with spread for larger samples', () => {
    const tight = [60, 61, 62].map(midiToLogPitch)
    const wide = [48, 60, 72].map(midiToLogPitch)
    expect(silvermanBandwidth(wide)).toBeGreaterThan(silvermanBandwidth(tight))
  })
})

describe('buildKdeCurve', () => {
  it('peaks near the densest mistake cluster', () => {
    const store: MistakeStatsStore = [
      rootRecord(60),
      rootRecord(60),
      rootRecord(60),
      rootRecord(60),
      rootRecord(60),
      rootRecord(72),
    ]
    const curve = buildKdeCurve(store, 60, 72)
    expect(curve.length).toBeGreaterThan(0)

    const peak = curve.reduce((best, point) => (point.count > best.count ? point : best))
    expect(peak.logPitch).toBeCloseTo(midiToLogPitch(60), 1)
    expect(peak.count).toBeGreaterThan(
      curve.find((point) => Math.abs(point.logPitch - midiToLogPitch(72)) < 0.01)!.count,
    )
  })

  it('returns empty curve when there are no in-range mistakes', () => {
    expect(buildKdeCurve([rootRecord(40), rootRecord(40), rootRecord(40)], 60, 72)).toEqual([])
  })
})

describe('weightedRandomQuizFromMistakes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses randomQuiz when store is empty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const quiz = weightedRandomQuizFromMistakes([], ['M2'], 'ascending', 60, 65)
    expect(quiz.root).toBeGreaterThanOrEqual(60)
    expect(quiz.root).toBeLessThanOrEqual(65)
  })

  it('picks weighted root when focused branch is taken', () => {
    const store: MistakeStatsStore = [
      rootRecord(60),
      rootRecord(60),
      rootRecord(60),
      rootRecord(72),
    ]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call += 1
      if (call === 1) return 0
      if (call === 2) return 0
      return 0.5
    })

    const quiz = weightedRandomQuizFromMistakes(store, ['M2'], 'ascending', 60, 72)
    expect(quiz.root).toBe(60)
    expect(MISTAKE_FOCUSED_RATE).toBe(0.35)
  })

  it('uses randomQuiz when random roll skips focused branch', () => {
    const store: MistakeStatsStore = [rootRecord(60), rootRecord(60), rootRecord(60)]
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const quiz = weightedRandomQuizFromMistakes(store, ['M2'], 'ascending', 60, 65)
    expect(quiz.root).toBeGreaterThanOrEqual(60)
    expect(quiz.root).toBeLessThanOrEqual(65)
  })
})
