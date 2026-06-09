import {
  clearArcadeBestRecord,
  type ArcadeBestRecord,
  type ArcadeBestVariant,
} from './arcadeBestRecord'
import { clearMistakeStats, type MistakeStatsStore } from './mistakeStats'
import { clearNoteKeyMistakeStats, type NoteKeyMistakeStatsStore } from './noteKeyMistakeStats'

export function hasPersistedTrainingStats(
  mistakeStats: MistakeStatsStore,
  bestRecord: ArcadeBestRecord | null,
  noteKeyBestRecord: ArcadeBestRecord | null = null,
  noteKeyMistakeStats: NoteKeyMistakeStatsStore = [],
): boolean {
  return (
    mistakeStats.length > 0 ||
    noteKeyMistakeStats.length > 0 ||
    bestRecord !== null ||
    noteKeyBestRecord !== null
  )
}

export function clearAllTrainingStats(): void {
  clearMistakeStats()
  clearNoteKeyMistakeStats()
  clearArcadeBestRecord()
}

export type { ArcadeBestVariant }
