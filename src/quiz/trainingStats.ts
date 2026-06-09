import {
  clearArcadeBestRecord,
  type ArcadeBestRecord,
  type ArcadeBestVariant,
} from './arcadeBestRecord'
import { clearMistakeStats, type MistakeStatsStore } from './mistakeStats'

export function hasPersistedTrainingStats(
  mistakeStats: MistakeStatsStore,
  bestRecord: ArcadeBestRecord | null,
  noteKeyBestRecord: ArcadeBestRecord | null = null,
): boolean {
  return mistakeStats.length > 0 || bestRecord !== null || noteKeyBestRecord !== null
}

export function clearAllTrainingStats(): void {
  clearMistakeStats()
  clearArcadeBestRecord()
}

export type { ArcadeBestVariant }
