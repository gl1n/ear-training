import { useEffect, useRef } from 'react'
import { createDefaultSettings, type SpeedPreset } from '../quiz/sequencer'

const STORAGE_KEY = 'ear-trainer:settings'

type PersistedSettings = {
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
}

function isSpeedPreset(value: unknown): value is SpeedPreset {
  return value === 'slow' || value === 'medium' || value === 'fast'
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

    const { speedPreset, enabledIntervalIds } = parsed as PersistedSettings
    if (!isSpeedPreset(speedPreset)) return null
    if (
      !Array.isArray(enabledIntervalIds) ||
      !enabledIntervalIds.every((id) => typeof id === 'string')
    ) {
      return null
    }

    return { speedPreset, enabledIntervalIds }
  } catch {
    return null
  }
}

export function getInitialSettings(): { speedPreset: SpeedPreset; settings: ReturnType<typeof createDefaultSettings> } {
  const persisted = loadPersistedSettings()
  const speedPreset = persisted?.speedPreset ?? 'medium'
  const defaults = createDefaultSettings(speedPreset)

  if (persisted && persisted.enabledIntervalIds.length > 0) {
    return {
      speedPreset,
      settings: { ...defaults, enabledIntervalIds: persisted.enabledIntervalIds },
    }
  }

  return { speedPreset, settings: defaults }
}

export function usePersistedSettings(speedPreset: SpeedPreset, enabledIntervalIds: string[]) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const data: PersistedSettings = { speedPreset, enabledIntervalIds }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [speedPreset, enabledIntervalIds])
}
