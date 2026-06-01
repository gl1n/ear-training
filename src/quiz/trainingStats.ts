import { clearArcadeBestRecord, type ArcadeBestRecord } from './arcadeBestRecord'
import { clearMistakeStats, type MistakeStatsStore } from './mistakeStats'
import { clearQuizPriorities, type WeakPriorityItem } from './quizPriority'

export function hasPersistedTrainingStats(
  mistakeStats: MistakeStatsStore,
  weakPriorityItems: WeakPriorityItem[],
  bestRecord: ArcadeBestRecord | null,
): boolean {
  return mistakeStats.length > 0 || weakPriorityItems.length > 0 || bestRecord !== null
}

export function clearAllTrainingStats(): void {
  clearMistakeStats()
  clearQuizPriorities()
  clearArcadeBestRecord()
}
