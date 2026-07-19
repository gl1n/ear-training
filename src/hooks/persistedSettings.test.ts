import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../quiz/storageKeys'
import { loadEarTrainingPreferences } from './usePersistedSettings'
import {
  loadFretboardPreferences,
  loadMetronomePreferences,
} from './usePersistedToolSettings'

function createLocalStorageMock(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  }
}

describe('persisted user settings', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores all ear-training preferences and preserves repeated chord degrees', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock({
      [STORAGE_KEYS.settings]: JSON.stringify({
        speedPreset: 'fast',
        enabledIntervalIds: [],
        direction: 'harmonic',
        mode: 'chordProgression',
        scaleDegreeReviewEnabled: true,
        scaleDegreeMelodyEnabled: true,
        sessionSize: 30,
        chordDegrees: [4, 5, 3, 6, 2, 5, 1],
        chordRhythm: { bpm: 125, beatsPerChord: 2, countInBeats: 4, feel: 'sustain' },
        chordKey: 8,
        chordMelodyEnabled: true,
        chordPlaybackMode: 'random-ear',
        randomChordSettings: {
          degrees: [2, 5],
          qualities: ['seventh'],
          inversions: [1, 3],
        },
        chordDegreeKey: 'random',
        chordDegreeRange: 'custom',
        chordDegreeCustomDegrees: [2, 5, 7],
        chordDegreeInversionMode: 'random',
      }),
    }))

    expect(loadEarTrainingPreferences()).toMatchObject({
      speedPreset: 'fast',
      enabledIntervalIds: [],
      direction: 'harmonic',
      mode: 'chordProgression',
      sessionSize: 30,
      chordDegrees: [4, 5, 3, 6, 2, 5, 1],
      chordRhythm: { bpm: 125, beatsPerChord: 2, countInBeats: 4, feel: 'sustain' },
      chordKey: 8,
      chordMelodyEnabled: true,
      chordPlaybackMode: 'random-ear',
      chordDegreeKey: 'random',
      chordDegreeRange: 'custom',
      chordDegreeCustomDegrees: [2, 5, 7],
      chordDegreeInversionMode: 'random',
    })
  })

  it('keeps valid legacy fields while invalid new fields fall back independently', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock({
      [STORAGE_KEYS.settings]: JSON.stringify({
        speedPreset: 'slow',
        enabledIntervalIds: ['m2', 'unknown'],
        direction: 'descending',
        chordDegrees: [0, 8],
        chordRhythm: { bpm: 999 },
      }),
    }))

    const preferences = loadEarTrainingPreferences()
    expect(preferences.speedPreset).toBe('slow')
    expect(preferences.direction).toBe('descending')
    expect(preferences.enabledIntervalIds).toEqual(expect.arrayContaining(['m2', 'M2']))
    expect(preferences.chordDegrees).toEqual([1, 6, 4, 5])
    expect(preferences.chordRhythm.bpm).toBe(80)
  })

  it('restores fretboard and metronome preferences with safe defaults', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock({
      [STORAGE_KEYS.fretboardSettings]: JSON.stringify({
        gameMode: 'all-notes',
        continuous: false,
        cMajorOnly: true,
      }),
      [STORAGE_KEYS.metronomeSettings]: JSON.stringify({
        bpm: 999,
        beatsPerBar: 6,
        accentEnabled: false,
      }),
    }))

    expect(loadFretboardPreferences()).toEqual({
      gameMode: 'all-notes',
      continuous: false,
      cMajorOnly: true,
    })
    expect(loadMetronomePreferences()).toEqual({
      bpm: 220,
      beatsPerBar: 6,
      accentEnabled: false,
    })
  })
})
