import type { TrainerState } from '../../quiz/sequencer'
import { SessionLoadStatus } from '../SessionLoadStatus'

type PracticeLoadStatusProps = {
  state: TrainerState
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry?: () => void
}

export function PracticeLoadStatus({
  state,
  loadProgress,
  loadIndeterminate,
  loadError,
  onRetry,
}: PracticeLoadStatusProps) {
  if (!loadError && state !== 'loading') {
    return null
  }

  return (
    <SessionLoadStatus
      state={state}
      loadProgress={loadProgress}
      loadIndeterminate={loadIndeterminate}
      loadError={loadError}
      onRetry={onRetry}
      variant="compact"
    />
  )
}
