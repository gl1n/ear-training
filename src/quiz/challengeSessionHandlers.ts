import type { MutableRefObject } from 'react'
import type { Quiz } from './intervals'
import { formatMelodyDegrees, type MajorKeySession, type ScaleDegreeQuiz } from './keys'
import type { ScaleDegreeMistakeRecord } from './scaleDegreeMistakeStats'
import type { ScaleDegreeMelodyMistakeRecord } from './scaleDegreeMelodyMistakeStats'
import {
  maybeShowReactionEncouragement,
  updateChallengeSessionStats,
  type ChallengeEncouragement,
} from './challengeAnswerHandling'
import { recordMelodyGroupResult } from './stats'
import type {
  IntervalSpeedCallbacks,
  ScaleDegreeCallbacks,
  TrainerState,
} from './sequencer'
import type { SessionStats } from './stats'

type ChallengeHandlerDeps = {
  setEncouragement: (encouragement: ChallengeEncouragement) => void
  encouragementKeyRef: MutableRefObject<number>
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void
  onQuestionCompleted?: () => boolean
}

function handleChallengeAnswerResult(
  { setEncouragement, encouragementKeyRef, updateSessionStats }: ChallengeHandlerDeps,
  answerKey: string,
  correct: boolean,
  reactionMs?: number,
): void {
  maybeShowReactionEncouragement(correct, reactionMs, setEncouragement, encouragementKeyRef)
  updateChallengeSessionStats(updateSessionStats, answerKey, { correct, reactionMs })
}

type IntervalSpeedHandlerDeps = ChallengeHandlerDeps & {
  onStateChange: (state: TrainerState) => void
  waitForAnswer: IntervalSpeedCallbacks['waitForAnswer']
  onAnswerCorrectionStart?: (wrongSelection: string) => void
  setLastQuiz: (quiz: Quiz) => void
  recordQuizMistake: (quiz: Quiz) => void
}

export function buildIntervalSpeedLoopCallbacks({
  onStateChange,
  waitForAnswer,
  onAnswerCorrectionStart,
  setLastQuiz,
  recordQuizMistake,
  setEncouragement,
  encouragementKeyRef,
  updateSessionStats,
  onQuestionCompleted,
}: IntervalSpeedHandlerDeps): IntervalSpeedCallbacks {
  return {
    onStateChange,
    waitForAnswer,
    onAnswerCorrectionStart,
    onAnswerSubmitted: (quiz, answer, correct) => {
      if (!correct && answer.selectedIntervalId !== '') {
        recordQuizMistake(quiz)
      }
      setLastQuiz(quiz)
      handleChallengeAnswerResult(
        { setEncouragement, encouragementKeyRef, updateSessionStats },
        quiz.interval.id,
        correct,
        answer.reactionMs,
      )
      return onQuestionCompleted?.() ?? false
    },
  }
}

type ScaleDegreeHandlerDeps = ChallengeHandlerDeps & {
  onStateChange: (state: TrainerState) => void
  onSessionStart: (session: MajorKeySession) => void
  onQuiz?: ScaleDegreeCallbacks['onQuiz']
  waitForGameStart: ScaleDegreeCallbacks['waitForGameStart']
  waitForAnswer: ScaleDegreeCallbacks['waitForAnswer']
  onAnswerCorrectionStart?: (wrongSelection: string) => void
  onMelodyNoteResolved?: ScaleDegreeCallbacks['onMelodyNoteResolved']
  melodyEnabled?: boolean
  setLastScaleDegreeQuiz: (quiz: ScaleDegreeQuiz) => void
  recordScaleDegreeQuizMistake: (record: ScaleDegreeMistakeRecord) => void
  appendSessionScaleDegreeMistake: (record: ScaleDegreeMistakeRecord) => void
  recordScaleDegreeMelodyQuizMistake: (record: ScaleDegreeMelodyMistakeRecord) => void
  appendSessionScaleDegreeMelodyMistake: (record: ScaleDegreeMelodyMistakeRecord) => void
  getSessionStats: () => SessionStats
}

export function buildScaleDegreeLoopCallbacks({
  onStateChange,
  onSessionStart,
  onQuiz,
  waitForGameStart,
  waitForAnswer,
  onAnswerCorrectionStart,
  onMelodyNoteResolved,
  melodyEnabled = false,
  setLastScaleDegreeQuiz,
  recordScaleDegreeQuizMistake,
  appendSessionScaleDegreeMistake,
  recordScaleDegreeMelodyQuizMistake,
  appendSessionScaleDegreeMelodyMistake,
  setEncouragement,
  encouragementKeyRef,
  updateSessionStats,
  getSessionStats,
  onQuestionCompleted,
}: ScaleDegreeHandlerDeps): ScaleDegreeCallbacks {
  return {
    onStateChange,
    onSessionStart,
    onQuiz,
    waitForGameStart,
    waitForAnswer,
    onAnswerCorrectionStart,
    onMelodyNoteResolved,
    onMelodyGroupSubmitted: (quiz, correct) => {
      setLastScaleDegreeQuiz(quiz)
      const pattern = formatMelodyDegrees(quiz.degrees)

      if (!correct) {
        const record: ScaleDegreeMelodyMistakeRecord = { pattern }
        recordScaleDegreeMelodyQuizMistake(record)
        appendSessionScaleDegreeMelodyMistake(record)
      }

      updateSessionStats((current) => recordMelodyGroupResult(current, pattern, correct))
      return onQuestionCompleted?.() ?? false
    },
    onAnswerSubmitted: (quiz, answer, correct) => {
      setLastScaleDegreeQuiz(quiz)

      if (melodyEnabled) {
        if (!correct && answer.selectedDegree !== '') {
          onAnswerCorrectionStart?.(answer.selectedDegree)
        }
        return false
      }

      if (
        !correct &&
        answer.selectedDegree !== '' &&
        answer.selectedDegree !== String(quiz.degree)
      ) {
        const record: ScaleDegreeMistakeRecord = {
          previousNoteMidi: quiz.previousNoteMidi,
          targetNoteMidi: quiz.noteMidi,
          correctDegree: quiz.degree,
          wrongDegree: answer.selectedDegree,
        }
        recordScaleDegreeQuizMistake(record)
        appendSessionScaleDegreeMistake(record)
      }

      handleChallengeAnswerResult(
        { setEncouragement, encouragementKeyRef, updateSessionStats },
        String(quiz.degree),
        correct,
        answer.reactionMs,
      )
      return onQuestionCompleted?.() ?? false
    },
    getSessionStats,
  }
}
