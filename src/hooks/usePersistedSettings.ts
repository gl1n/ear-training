import { useEffect, useRef } from 'react'
import type { IntervalDirection } from '../quiz/intervals'
import {
  createDefaultSettings,
  normalizeAppMode,
  type AppMode,
  type SpeedPreset,
} from '../quiz/sequencer'

const STORAGE_KEY = 'ear-trainer:settings'

type PersistedSettings = {
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  mode?: AppMode
  scaleDegreeReviewEnabled?: boolean
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

  if ('enabledDirections' in parsed && Array.isArray(parsed.enabledDirections)) {
    const first = parsed.enabledDirections.find(isIntervalDirection)
    if (first) return first
  }

  return null
}

function parseScaleDegreeReviewEnabled(record: Record<string, unknown>): boolean {
  if ('scaleDegreeReviewEnabled' in record && record.scaleDegreeReviewEnabled === true) {
    return true
  }

  if ('noteKeyReviewEnabled' in record && record.noteKeyReviewEnabled === true) {
    return true
  }

  return false
}

function loadPersistedSettings(): PersistedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

    return { speedPreset, enabledIntervalIds, direction, mode, scaleDegreeReviewEnabled }
  } catch {
    return null
  }
}

export function getInitialSettings(): {
  speedPreset: SpeedPreset
  mode: AppMode
  scaleDegreeReviewEnabled: boolean
  settings: ReturnType<typeof createDefaultSettings>
} {
  const persisted = loadPersistedSettings()
  const speedPreset = persisted?.speedPreset ?? 'medium'
  const mode = persisted?.mode ?? 'scaleDegree'
  const scaleDegreeReviewEnabled = persisted?.scaleDegreeReviewEnabled ?? false
  const defaults = createDefaultSettings(speedPreset)

  if (persisted && persisted.enabledIntervalIds.length > 0) {
    return {
      speedPreset,
      mode,
      scaleDegreeReviewEnabled,
      settings: {
        ...defaults,
        enabledIntervalIds: persisted.enabledIntervalIds,
        direction: persisted.direction,
      },
    }
  }

  return { speedPreset, mode, scaleDegreeReviewEnabled, settings: defaults }
}

export function usePersistedSettings(
  speedPreset: SpeedPreset,
  enabledIntervalIds: string[],
  direction: IntervalDirection,
  mode: AppMode,
  scaleDegreeReviewEnabled: boolean,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const data: PersistedSettings = {
        speedPreset,
        enabledIntervalIds,
        direction,
        mode,
        scaleDegreeReviewEnabled,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [speedPreset, enabledIntervalIds, direction, mode, scaleDegreeReviewEnabled])
}
