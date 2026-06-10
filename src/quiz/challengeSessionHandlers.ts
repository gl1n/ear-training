import type { MutableRefObject } from 'react'
import type { Quiz } from './intervals'
import type { MajorKeySession, ScaleDegreeQuiz } from './keys'
import type { ScaleDegreeMistakeRecord } from './scaleDegreeMistakeStats'
import { getEncouragementForReactionMs } from './scaleDegreeScoring'
import type {
  IntervalSpeedCallbacks,
  ScaleDegreeCallbacks,
  TrainerState,
} from './sequencer'
import { recordResult, recordScaleDegreeResult, type SessionStats } from './stats'

type IntervalSpeedHandlerDeps = {
  onStateChange: (state: TrainerState) => void
  waitForAnswer: IntervalSpeedCallbacks['waitForAnswer']
  setLastQuiz: (quiz: Quiz) => void
  setIntervalSpeedTimedOut: (timedOut: boolean) => void
  recordQuizMistake: (quiz: Quiz) => void
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void
  showIntervalSpeedEncouragement: () => void
}

export function buildIntervalSpeedLoopCallbacks({
  onStateChange,
  waitForAnswer,
  setLastQuiz,
  setIntervalSpeedTimedOut,
  recordQuizMistake,
  updateSessionStats,
  showIntervalSpeedEncouragement,
}: IntervalSpeedHandlerDeps): IntervalSpeedCallbacks {
  return {
    onStateChange,
    waitForAnswer,
    onAnswerSubmitted: (quiz, answer, correct) => {
      if (answer.timedOut) {
        setIntervalSpeedTimedOut(true)
      }
      if (!correct && !answer.timedOut) {
        recordQuizMistake(quiz)
      }
      setLastQuiz(quiz)
      updateSessionStats((current) =>
        recordResult(current, quiz.interval.id, { correct }),
      )
    },
    onIdleBoost: (quiz) => {
      recordQuizMistake(quiz)
      showIntervalSpeedEncouragement()
    },
  }
}

type ScaleDegreeHandlerDeps = {
  onStateChange: (state: TrainerState) => void
  onSessionStart: (session: MajorKeySession) => void
  waitForGameStart: ScaleDegreeCallbacks['waitForGameStart']
  waitForAnswer: ScaleDegreeCallbacks['waitForAnswer']
  setLastScaleDegreeQuiz: (quiz: ScaleDegreeQuiz) => void
  recordScaleDegreeQuizMistake: (record: ScaleDegreeMistakeRecord) => void
  appendSessionScaleDegreeMistake: (record: ScaleDegreeMistakeRecord) => void
  setScaleDegreeEncouragement: (encouragement: { message: string; key: number }) => void
  scaleDegreeEncouragementKeyRef: MutableRefObject<number>
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void
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
  setScaleDegreeEncouragement,
  scaleDegreeEncouragementKeyRef,
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
        !answer.timedOut &&
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
      if (correct && answer.reactionMs !== undefined) {
        const message = getEncouragementForReactionMs(answer.reactionMs)
        if (message) {
          scaleDegreeEncouragementKeyRef.current += 1
          setScaleDegreeEncouragement({
            message,
            key: scaleDegreeEncouragementKeyRef.current,
          })
        }
      }
      updateSessionStats((current) =>
        recordScaleDegreeResult(current, String(quiz.degree), {
          correct,
          reactionMs: answer.reactionMs,
        }),
      )
    },
    getSessionStats,
  }
}
