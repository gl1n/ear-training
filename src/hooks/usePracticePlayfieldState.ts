import { LISTENING_STATES, type TrainerState } from '../quiz/sequencer'
import { getCorrectAnswerCount, getTotalScore, type SessionStats } from '../quiz/stats'
import { getPracticePhase } from '../components/practice/practicePhase'

export function usePracticePlayfieldState(state: TrainerState, sessionStats: SessionStats) {
  const phase = getPracticePhase(state)
  const isCorrection = state === 'answer_correction'
  const canAnswer =
    state === 'awaiting_answer' || isCorrection || LISTENING_STATES.includes(state)
  const isWrong = state === 'feedback_incorrect'
  const correctCount = getCorrectAnswerCount(sessionStats)
  const totalScore = getTotalScore(sessionStats)
  const currentQuestion =
    correctCount + (canAnswer || LISTENING_STATES.includes(state) ? 1 : 0)
  const isListening = phase === 'listening'

  return {
    phase,
    canAnswer,
    isCorrection,
    isWrong,
    correctCount,
    totalScore,
    currentQuestion,
    isListening,
  }
}
