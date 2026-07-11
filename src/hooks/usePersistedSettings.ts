import {
  createDefaultSettings,
  normalizeAppMode,
  type AppMode,
  type SpeedPreset,
} from '../quiz/sequencer'
import type { IntervalDirection } from '../quiz/intervals'
import { useDebouncedPersist } from './useDebouncedPersist'
import type { SessionSize } from './useSessionGoal'

import { STORAGE_KEYS } from '../quiz/storageKeys'
import { readStorage, writeStorage } from '../utils/storage'

const STORAGE_KEY = STORAGE_KEYS.settings

type PersistedSettings = {
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  mode?: AppMode
  scaleDegreeReviewEnabled?: boolean
  scaleDegreeMelodyEnabled?: boolean
  sessionSize?: SessionSize
}

function isSpeedPreset(value: unknown): value is SpeedPreset {
  return value === 'slow' || value === 'medium' || value === 'fast'
}

function isIntervalDirection(value: unknown): value is IntervalDirection {
  return value === 'ascending' || value === 'descending' || value === 'harmonic'
}

function parseDirection(parsed: Record<string, unknown>): IntervalDirection | null {
  if ('direction' in parsed && isIntervalDirection(parsed.direction)) {
    return parsed.direction
  }

  return null
}

function parseScaleDegreeReviewEnabled(record: Record<string, unknown>): boolean {
  return record.scaleDegreeReviewEnabled === true
}

function parseScaleDegreeMelodyEnabled(record: Record<string, unknown>): boolean {
  return record.scaleDegreeMelodyEnabled === true
}

function loadPersistedSettings(): PersistedSettings | null {
  try {
    const raw = readStorage(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('speedPreset' in parsed) ||
      !('enabledIntervalIds' in parsed)
    ) {
      return null
    }

    const record = parsed as Record<string, unknown>
    const { speedPreset, enabledIntervalIds } = record
    if (!isSpeedPreset(speedPreset)) return null
    if (
      !Array.isArray(enabledIntervalIds) ||
      !enabledIntervalIds.every((id) => typeof id === 'string')
    ) {
      return null
    }

    const direction = parseDirection(record) ?? 'ascending'
    const mode =
      'mode' in record ? normalizeAppMode(record.mode) ?? 'scaleDegree' : 'scaleDegree'
    const scaleDegreeReviewEnabled = parseScaleDegreeReviewEnabled(record)
    const scaleDegreeMelodyEnabled = parseScaleDegreeMelodyEnabled(record)
    const sessionSize = record.sessionSize === 20 || record.sessionSize === 30 ? record.sessionSize : 10

    return {
      speedPreset,
      enabledIntervalIds,
      direction,
      mode,
      scaleDegreeReviewEnabled,
      scaleDegreeMelodyEnabled,
      sessionSize,
    }
  } catch {
    return null
  }
}

export function getInitialSettings(): {
  speedPreset: SpeedPreset
  mode: AppMode
  scaleDegreeReviewEnabled: boolean
  scaleDegreeMelodyEnabled: boolean
  sessionSize: SessionSize
  settings: ReturnType<typeof createDefaultSettings>
} {
  const persisted = loadPersistedSettings()
  const speedPreset = persisted?.speedPreset ?? 'medium'
  const mode = persisted?.mode ?? 'scaleDegree'
  const scaleDegreeReviewEnabled = persisted?.scaleDegreeReviewEnabled ?? false
  const scaleDegreeMelodyEnabled = persisted?.scaleDegreeMelodyEnabled ?? false
  const sessionSize = persisted?.sessionSize ?? 10
  const defaults = createDefaultSettings(speedPreset)

  if (persisted && persisted.enabledIntervalIds.length > 0) {
    return {
      speedPreset,
      mode,
      scaleDegreeReviewEnabled,
      scaleDegreeMelodyEnabled,
      sessionSize,
      settings: {
        ...defaults,
        enabledIntervalIds: persisted.enabledIntervalIds,
        direction: persisted.direction,
      },
    }
  }

  return { speedPreset, mode, scaleDegreeReviewEnabled, scaleDegreeMelodyEnabled, sessionSize, settings: defaults }
}

export function usePersistedSettings(
  speedPreset: SpeedPreset,
  enabledIntervalIds: string[],
  direction: IntervalDirection,
  mode: AppMode,
  scaleDegreeReviewEnabled: boolean,
  scaleDegreeMelodyEnabled: boolean,
  sessionSize: SessionSize,
) {
  useDebouncedPersist(() => {
    const data: PersistedSettings = {
      speedPreset,
      enabledIntervalIds,
      direction,
      mode,
      scaleDegreeReviewEnabled,
      scaleDegreeMelodyEnabled,
      sessionSize,
    }
    writeStorage(STORAGE_KEY, JSON.stringify(data))
  }, [
    speedPreset,
    enabledIntervalIds,
    direction,
    mode,
    scaleDegreeReviewEnabled,
    scaleDegreeMelodyEnabled,
    sessionSize,
  ])
}
