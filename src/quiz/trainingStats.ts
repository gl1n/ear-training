import {
  clearChallengeBestRecord,
  type ChallengeBestRecord,
} from './challengeBestRecord'
import { clearMistakeStats, type MistakeStatsStore } from './mistakeStats'
import { clearScaleDegreeMistakeStats, type ScaleDegreeMistakeStatsStore } from './scaleDegreeMistakeStats'
import {
  clearScaleDegreeMelodyMistakeStats,
  type ScaleDegreeMelodyMistakeStatsStore,
} from './scaleDegreeMelodyMistakeStats'
import {
  clearScaleDegreeMelodySessionHistory,
  clearScaleDegreeSessionHistory,
  type ScaleDegreeSessionRecord,
} from './scaleDegreeSessionHistory'

export function hasPersistedTrainingStats(
  mistakeStats: MistakeStatsStore,
  intervalSpeedBestRecord: ChallengeBestRecord | null,
  scaleDegreeBestRecord: ChallengeBestRecord | null = null,
  scaleDegreeMistakeStats: ScaleDegreeMistakeStatsStore = [],
  scaleDegreeSessionHistory: ScaleDegreeSessionRecord[] = [],
  scaleDegreeMelodyMistakeStats: ScaleDegreeMelodyMistakeStatsStore = [],
  scaleDegreeMelodyBestRecord: ChallengeBestRecord | null = null,
  scaleDegreeMelodySessionHistory: ScaleDegreeSessionRecord[] = [],
): boolean {
  return (
    mistakeStats.length > 0 ||
    scaleDegreeMistakeStats.length > 0 ||
    scaleDegreeMelodyMistakeStats.length > 0 ||
    scaleDegreeSessionHistory.length > 0 ||
    scaleDegreeMelodySessionHistory.length > 0 ||
    intervalSpeedBestRecord !== null ||
    scaleDegreeBestRecord !== null ||
    scaleDegreeMelodyBestRecord !== null
  )
}

export function clearAllTrainingStats(): void {
  clearMistakeStats()
  clearScaleDegreeMistakeStats()
  clearScaleDegreeMelodyMistakeStats()
  clearScaleDegreeSessionHistory()
  clearScaleDegreeMelodySessionHistory()
  clearChallengeBestRecord()
}
