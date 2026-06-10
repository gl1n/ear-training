import type { TrainerState } from '../../quiz/sequencer'
import type { SessionStats } from '../../quiz/stats'

export type LoadStatusProps = {
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry: () => void
}

export type PracticeSessionProps = {
  state: TrainerState
  sessionStats: SessionStats
}
