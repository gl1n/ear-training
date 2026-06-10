import { LISTENING_STATES, type TrainerState } from '../../quiz/sequencer'

export type PracticePhaseVariant = 'intervalSpeed' | 'scaleDegree'

export function getPracticePhase(state: TrainerState) {
  if (state === 'loading') return 'loading' as const
  if (LISTENING_STATES.includes(state)) return 'listening' as const
  if (state === 'awaiting_answer') return 'answer' as const
  if (state === 'answer_correction') return 'correction' as const
  if (state === 'feedback_incorrect') return 'wrong' as const
  return 'idle' as const
}
