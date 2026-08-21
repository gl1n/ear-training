import {
  createDefaultSettings,
  normalizeAppMode,
  type AppMode,
  type SpeedPreset,
} from '../quiz/sequencer'
import { ALL_INTERVAL_IDS, type IntervalDirection } from '../quiz/intervals'
import type {
  ChordDegree,
  ChordInversion,
  ChordKey,
  ChordPlaybackMode,
  ChordRhythm,
  RandomChordQuality,
  RandomChordSettings,
} from '../quiz/chordProgression'
import type {
  ChordDegreeInversionMode,
  ChordDegreeKey,
  ChordDegreeRange,
} from '../quiz/chordDegreeQuiz'
import { useDebouncedPersist } from './useDebouncedPersist'
import type { SessionSize } from './useSessionGoal'
import type { ScaleDegreeTrainingMode } from '../quiz/keys'

import { STORAGE_KEYS } from '../quiz/storageKeys'
import { readStorage, writeStorage } from '../utils/storage'

const STORAGE_KEY = STORAGE_KEYS.settings

export type EarTrainingPreferences = {
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  mode: AppMode
  scaleDegreeReviewEnabled: boolean
  scaleDegreeTrainingMode: ScaleDegreeTrainingMode
  sessionSize: SessionSize
  chordDegrees: ChordDegree[]
  chordRhythm: ChordRhythm
  chordKey: ChordKey
  chordMelodyEnabled: boolean
  chordPlaybackMode: ChordPlaybackMode
  randomChordSettings: RandomChordSettings
  chordDegreeKey: ChordDegreeKey
  chordDegreeRange: ChordDegreeRange
  chordDegreeCustomDegrees: number[]
  chordDegreeInversionMode: ChordDegreeInversionMode
}

const DEFAULT_PREFERENCES: EarTrainingPreferences = {
  speedPreset: 'medium',
  enabledIntervalIds: [...ALL_INTERVAL_IDS],
  direction: 'ascending',
  mode: 'scaleDegree',
  scaleDegreeReviewEnabled: false,
  scaleDegreeTrainingMode: 'single',
  sessionSize: 10,
  chordDegrees: [1, 6, 4, 5],
  chordRhythm: { bpm: 80, beatsPerChord: 4, countInBeats: 0, feel: 'breathe' },
  chordKey: 'random',
  chordMelodyEnabled: false,
  chordPlaybackMode: 'progression',
  randomChordSettings: {
    degrees: [1, 2, 3, 4, 5, 6, 7],
    qualities: ['triad', 'seventh'],
    inversions: [0, 1, 2, 3],
  },
  chordDegreeKey: 'c-major',
  chordDegreeRange: 'primary',
  chordDegreeCustomDegrees: [2, 3, 6],
  chordDegreeInversionMode: 'root',
}

function isSpeedPreset(value: unknown): value is SpeedPreset {
  return value === 'slow' || value === 'medium' || value === 'fast'
}

function isIntervalDirection(value: unknown): value is IntervalDirection {
  return value === 'ascending' || value === 'descending' || value === 'harmonic'
}

function isScaleDegreeTrainingMode(value: unknown): value is ScaleDegreeTrainingMode {
  return value === 'single' || value === 'crossRegister' || value === 'melody'
}

function validArray<T>(
  value: unknown,
  isValid: (item: unknown) => item is T,
  minimumLength = 1,
  deduplicate = true,
): T[] | null {
  if (!Array.isArray(value) || value.length < minimumLength || !value.every(isValid)) return null
  return deduplicate ? [...new Set(value)] : [...value]
}

function isChordDegree(value: unknown): value is ChordDegree {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 7
}

function isChordInversion(value: unknown): value is ChordInversion {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function isChordQuality(value: unknown): value is RandomChordQuality {
  return value === 'triad' || value === 'seventh'
}

function parseChordRhythm(value: unknown): ChordRhythm | null {
  if (typeof value !== 'object' || value === null) return null
  const rhythm = value as Record<string, unknown>
  if (
    typeof rhythm.bpm !== 'number' ||
    rhythm.bpm < 40 ||
    rhythm.bpm > 160 ||
    ![1, 2, 4].includes(Number(rhythm.beatsPerChord)) ||
    (rhythm.countInBeats !== 0 && rhythm.countInBeats !== 4)
  ) return null
  return {
    bpm: rhythm.bpm,
    beatsPerChord: rhythm.beatsPerChord as 1 | 2 | 4,
    countInBeats: rhythm.countInBeats,
    feel: rhythm.feel === 'sustain' ? 'sustain' : 'breathe',
  }
}

function parseRandomChordSettings(value: unknown): RandomChordSettings | null {
  if (typeof value !== 'object' || value === null) return null
  const settings = value as Record<string, unknown>
  const degrees = validArray(settings.degrees, isChordDegree)
  const qualities = validArray(settings.qualities, isChordQuality)
  const inversions = validArray(settings.inversions, isChordInversion)
  return degrees && qualities && inversions ? { degrees, qualities, inversions } : null
}

export function loadEarTrainingPreferences(): EarTrainingPreferences {
  const defaults = structuredClone(DEFAULT_PREFERENCES)
  try {
    const raw = readStorage(STORAGE_KEY)
    if (!raw) return defaults

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return defaults

    const record = parsed as Record<string, unknown>
    const enabledIntervalIds = validArray(
      record.enabledIntervalIds,
      (id): id is string => typeof id === 'string' && ALL_INTERVAL_IDS.includes(id),
      0,
    )
    const chordDegrees = validArray(record.chordDegrees, isChordDegree, 1, false)
    const chordRhythm = parseChordRhythm(record.chordRhythm)
    const randomChordSettings = parseRandomChordSettings(record.randomChordSettings)
    const chordDegreeCustomDegrees = validArray(record.chordDegreeCustomDegrees, isChordDegree, 2)

    return {
      speedPreset: isSpeedPreset(record.speedPreset) ? record.speedPreset : defaults.speedPreset,
      enabledIntervalIds: enabledIntervalIds ?? defaults.enabledIntervalIds,
      direction: isIntervalDirection(record.direction) ? record.direction : defaults.direction,
      mode: normalizeAppMode(record.mode) ?? defaults.mode,
      scaleDegreeReviewEnabled: typeof record.scaleDegreeReviewEnabled === 'boolean'
        ? record.scaleDegreeReviewEnabled
        : defaults.scaleDegreeReviewEnabled,
      scaleDegreeTrainingMode: isScaleDegreeTrainingMode(record.scaleDegreeTrainingMode)
        ? record.scaleDegreeTrainingMode
        : record.scaleDegreeMelodyEnabled === true
          ? 'melody'
          : defaults.scaleDegreeTrainingMode,
      sessionSize: record.sessionSize === 20 || record.sessionSize === 30 ? record.sessionSize : 10,
      chordDegrees: chordDegrees && chordDegrees.length >= 4 && chordDegrees.length <= 8
        ? chordDegrees
        : defaults.chordDegrees,
      chordRhythm: chordRhythm ?? defaults.chordRhythm,
      chordKey: record.chordKey === 'random' ||
        (Number.isInteger(record.chordKey) && Number(record.chordKey) >= 0 && Number(record.chordKey) <= 11)
        ? record.chordKey as ChordKey
        : defaults.chordKey,
      chordMelodyEnabled: typeof record.chordMelodyEnabled === 'boolean'
        ? record.chordMelodyEnabled
        : defaults.chordMelodyEnabled,
      chordPlaybackMode: record.chordPlaybackMode === 'random-ear'
        ? 'random-ear'
        : defaults.chordPlaybackMode,
      randomChordSettings: randomChordSettings ?? defaults.randomChordSettings,
      chordDegreeKey: record.chordDegreeKey === 'random' ? 'random' : defaults.chordDegreeKey,
      chordDegreeRange: ['primary', 'common', 'all', 'custom'].includes(String(record.chordDegreeRange))
        ? record.chordDegreeRange as ChordDegreeRange
        : defaults.chordDegreeRange,
      chordDegreeCustomDegrees: chordDegreeCustomDegrees ?? defaults.chordDegreeCustomDegrees,
      chordDegreeInversionMode: record.chordDegreeInversionMode === 'random'
        ? 'random'
        : defaults.chordDegreeInversionMode,
    }
  } catch {
    return defaults
  }
}

export function getInitialSettings(): EarTrainingPreferences & {
  settings: ReturnType<typeof createDefaultSettings>
} {
  const persisted = loadEarTrainingPreferences()
  return {
    ...persisted,
    settings: {
      ...createDefaultSettings(persisted.speedPreset),
      enabledIntervalIds: persisted.enabledIntervalIds,
      direction: persisted.direction,
    },
  }
}

export function usePersistedSettings(preferences: EarTrainingPreferences) {
  useDebouncedPersist(() => {
    writeStorage(STORAGE_KEY, JSON.stringify(preferences))
  }, Object.values(preferences))
}
