import type { MutableRefObject } from 'react'
import { getEncouragementForReactionMs } from './challengeScoring'
import { recordChallengeResult, type ChallengeQuizResult, type SessionStats } from './stats'

export type ChallengeEncouragement = {
  message: string
  key: number
}

export function maybeShowReactionEncouragement(
  correct: boolean,
  reactionMs: number | undefined,
  setEncouragement: (encouragement: ChallengeEncouragement) => void,
  encouragementKeyRef: MutableRefObject<number>,
): void {
  if (!correct || reactionMs === undefined) {
    return
  }

  const message = getEncouragementForReactionMs(reactionMs)
  if (!message) {
    return
  }

  encouragementKeyRef.current += 1
  setEncouragement({
    message,
    key: encouragementKeyRef.current,
  })
}

export function updateChallengeSessionStats(
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void,
  answerKey: string,
  result: ChallengeQuizResult,
): void {
  updateSessionStats((current) => recordChallengeResult(current, answerKey, result))
}
