import type { TrainerState } from '../../quiz/sequencer'
import type { SessionStats } from '../../quiz/stats'
import type { PracticeEncouragement } from './types'

export type LoadStatusProps = {
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry: () => void
}

export type ChallengeEncouragementProps = {
  intervalSpeedEncouragement: PracticeEncouragement | null
  scaleDegreeEncouragement: PracticeEncouragement | null
}

export type PracticeSessionProps = {
  state: TrainerState
  sessionStats: SessionStats
}
