import { clearArcadeBestRecord, type ArcadeBestRecord } from './arcadeBestRecord'
import { clearMistakeStats, type MistakeStatsStore } from './mistakeStats'

export function hasPersistedTrainingStats(
  mistakeStats: MistakeStatsStore,
  bestRecord: ArcadeBestRecord | null,
): boolean {
  return mistakeStats.length > 0 || bestRecord !== null
}

export function clearAllTrainingStats(): void {
  clearMistakeStats()
  clearArcadeBestRecord()
}
