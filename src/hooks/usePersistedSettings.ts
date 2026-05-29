import { useEffect, useRef } from 'react'
import type { IntervalDirection } from '../quiz/intervals'
import { createDefaultSettings, type AppMode, type SpeedPreset } from '../quiz/sequencer'

const STORAGE_KEY = 'ear-trainer:settings'

type PersistedSettings = {
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  mode?: AppMode
}

function isAppMode(value: unknown): value is AppMode {
  return value === 'practice' || value === 'arcade'
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
    const mode = 'mode' in record && isAppMode(record.mode) ? record.mode : 'practice'

    return { speedPreset, enabledIntervalIds, direction, mode }
  } catch {
    return null
  }
}

export function getInitialSettings(): {
  speedPreset: SpeedPreset
  mode: AppMode
  settings: ReturnType<typeof createDefaultSettings>
} {
  const persisted = loadPersistedSettings()
  const speedPreset = persisted?.speedPreset ?? 'medium'
  const mode = persisted?.mode ?? 'practice'
  const defaults = createDefaultSettings(speedPreset)

  if (persisted && persisted.enabledIntervalIds.length > 0) {
    return {
      speedPreset,
      mode,
      settings: {
        ...defaults,
        enabledIntervalIds: persisted.enabledIntervalIds,
        direction: persisted.direction,
      },
    }
  }

  return { speedPreset, mode, settings: defaults }
}

export function usePersistedSettings(
  speedPreset: SpeedPreset,
  enabledIntervalIds: string[],
  direction: IntervalDirection,
  mode: AppMode,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const data: PersistedSettings = { speedPreset, enabledIntervalIds, direction, mode }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [speedPreset, enabledIntervalIds, direction, mode])
}
