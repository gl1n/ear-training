import type { MutableRefObject } from 'react'
import type { Quiz } from './intervals'
import type { MajorKeySession, ScaleDegreeQuiz } from './keys'
import type { ScaleDegreeMistakeRecord } from './scaleDegreeMistakeStats'
import {
  maybeShowReactionEncouragement,
  updateChallengeSessionStats,
  type ChallengeEncouragement,
} from './challengeAnswerHandling'
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
  setLastQuiz: (quiz: Quiz) => void
  recordQuizMistake: (quiz: Quiz) => void
}

export function buildIntervalSpeedLoopCallbacks({
  onStateChange,
  waitForAnswer,
  setLastQuiz,
  recordQuizMistake,
  setEncouragement,
  encouragementKeyRef,
  updateSessionStats,
}: IntervalSpeedHandlerDeps): IntervalSpeedCallbacks {
  return {
    onStateChange,
    waitForAnswer,
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
    },
  }
}

type ScaleDegreeHandlerDeps = ChallengeHandlerDeps & {
  onStateChange: (state: TrainerState) => void
  onSessionStart: (session: MajorKeySession) => void
  waitForGameStart: ScaleDegreeCallbacks['waitForGameStart']
  waitForAnswer: ScaleDegreeCallbacks['waitForAnswer']
  setLastScaleDegreeQuiz: (quiz: ScaleDegreeQuiz) => void
  recordScaleDegreeQuizMistake: (record: ScaleDegreeMistakeRecord) => void
  appendSessionScaleDegreeMistake: (record: ScaleDegreeMistakeRecord) => void
  getSessionStats: () => SessionStats
}

export function buildScaleDegreeLoopCallbacks({
  onStateChange,
  onSessionStart,
  waitForGameStart,
  waitForAnswer,
  setLastScaleDegreeQuiz,
  recordScaleDegreeQuizMistake,
  appendSessionScaleDegreeMistake,
  setEncouragement,
  encouragementKeyRef,
  updateSessionStats,
  getSessionStats,
}: ScaleDegreeHandlerDeps): ScaleDegreeCallbacks {
  return {
    onStateChange,
    onSessionStart,
    waitForGameStart,
    waitForAnswer,
    onAnswerSubmitted: (quiz, answer, correct) => {
      setLastScaleDegreeQuiz(quiz)
      if (
        !correct &&
        answer.selectedDegree !== '' &&
        answer.selectedDegree !== String(quiz.degree)
      ) {
        const record: ScaleDegreeMistakeRecord = {
          previousNoteMidi: quiz.previousNoteMidi,
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
    },
    getSessionStats,
  }
}
