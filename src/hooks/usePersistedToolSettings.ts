import { useDebouncedPersist } from './useDebouncedPersist'
import { STORAGE_KEYS } from '../quiz/storageKeys'
import { readStorage, writeStorage } from '../utils/storage'
import { clampBpm } from '../quiz/metronome'
import { isModalScaleId, type ModalScaleId } from '../quiz/modalScale'

export type FretboardPreferences = {
  gameMode: 'region' | 'all-notes'
  continuous: boolean
  cMajorOnly: boolean
}

export type MetronomePreferences = {
  bpm: number
  beatsPerBar: 2 | 3 | 4 | 6
  accentEnabled: boolean
}

export type PentatonicPlayPreferences = {
  scaleId: 'major' | 'minor'
  bpm: number
  clickEnabled: boolean
  autoIncreaseBpm: boolean
}

export type ModalScalePreferences = {
  scaleId: ModalScaleId
  clickEnabled: boolean
}

function readRecord(key: string): Record<string, unknown> | null {
  try {
    const raw = readStorage(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

export function loadFretboardPreferences(): FretboardPreferences {
  const record = readRecord(STORAGE_KEYS.fretboardSettings)
  return {
    gameMode: record?.gameMode === 'all-notes' ? 'all-notes' : 'region',
    continuous: typeof record?.continuous === 'boolean' ? record.continuous : true,
    cMajorOnly: typeof record?.cMajorOnly === 'boolean' ? record.cMajorOnly : false,
  }
}

export function usePersistedFretboardPreferences(preferences: FretboardPreferences) {
  useDebouncedPersist(() => {
    writeStorage(STORAGE_KEYS.fretboardSettings, JSON.stringify(preferences))
  }, Object.values(preferences))
}

export function loadPentatonicPlayPreferences(): PentatonicPlayPreferences {
  const record = readRecord(STORAGE_KEYS.pentatonicPlaySettings)
  const rawBpm = typeof record?.bpm === 'number' && Number.isFinite(record.bpm) ? record.bpm : 80
  return {
    scaleId: record?.scaleId === 'major' ? 'major' : 'minor',
    bpm: clampBpm(rawBpm),
    clickEnabled: typeof record?.clickEnabled === 'boolean' ? record.clickEnabled : true,
    autoIncreaseBpm: typeof record?.autoIncreaseBpm === 'boolean' ? record.autoIncreaseBpm : true,
  }
}

export function usePersistedPentatonicPlayPreferences(preferences: PentatonicPlayPreferences) {
  useDebouncedPersist(() => {
    writeStorage(STORAGE_KEYS.pentatonicPlaySettings, JSON.stringify(preferences))
  }, Object.values(preferences))
}

export function loadMetronomePreferences(): MetronomePreferences {
  const record = readRecord(STORAGE_KEYS.metronomeSettings)
  const rawBpm = typeof record?.bpm === 'number' && Number.isFinite(record.bpm) ? record.bpm : 80
  return {
    bpm: clampBpm(rawBpm),
    beatsPerBar: record?.beatsPerBar === 2 ||
      record?.beatsPerBar === 3 ||
      record?.beatsPerBar === 6
      ? record.beatsPerBar
      : 4,
    accentEnabled: typeof record?.accentEnabled === 'boolean' ? record.accentEnabled : true,
  }
}

export function usePersistedMetronomePreferences(preferences: MetronomePreferences) {
  useDebouncedPersist(() => {
    writeStorage(STORAGE_KEYS.metronomeSettings, JSON.stringify(preferences))
  }, Object.values(preferences))
}

export function usePersistedMetronomeBpm(bpm: number) {
  useDebouncedPersist(() => {
    const current = loadMetronomePreferences()
    writeStorage(STORAGE_KEYS.metronomeSettings, JSON.stringify({ ...current, bpm: clampBpm(bpm) }))
  }, [bpm])
}

export function loadModalScalePreferences(): ModalScalePreferences {
  const record = readRecord(STORAGE_KEYS.modalScaleSettings)
  return {
    scaleId: isModalScaleId(record?.scaleId) ? record.scaleId : 'ionian',
    clickEnabled: typeof record?.clickEnabled === 'boolean' ? record.clickEnabled : true,
  }
}

export function usePersistedModalScalePreferences(preferences: ModalScalePreferences) {
  useDebouncedPersist(() => {
    writeStorage(STORAGE_KEYS.modalScaleSettings, JSON.stringify(preferences))
  }, Object.values(preferences))
}
