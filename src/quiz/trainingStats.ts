import {
  clearChallengeBestRecord,
  type ChallengeBestRecord,
  type ChallengeBestVariant,
} from './challengeBestRecord'
import { clearMistakeStats, type MistakeStatsStore } from './mistakeStats'
import { clearScaleDegreeMistakeStats, type ScaleDegreeMistakeStatsStore } from './scaleDegreeMistakeStats'
import { clearScaleDegreeSessionHistory, type ScaleDegreeSessionRecord } from './scaleDegreeSessionHistory'

export function hasPersistedTrainingStats(
  mistakeStats: MistakeStatsStore,
  intervalSpeedBestRecord: ChallengeBestRecord | null,
  scaleDegreeBestRecord: ChallengeBestRecord | null = null,
  scaleDegreeMistakeStats: ScaleDegreeMistakeStatsStore = [],
  scaleDegreeSessionHistory: ScaleDegreeSessionRecord[] = [],
): boolean {
  return (
    mistakeStats.length > 0 ||
    scaleDegreeMistakeStats.length > 0 ||
    scaleDegreeSessionHistory.length > 0 ||
    intervalSpeedBestRecord !== null ||
    scaleDegreeBestRecord !== null
  )
}

export function clearAllTrainingStats(): void {
  clearMistakeStats()
  clearScaleDegreeMistakeStats()
  clearScaleDegreeSessionHistory()
  clearChallengeBestRecord()
}

export type { ChallengeBestVariant }
