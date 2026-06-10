import type { Piano } from '../audio/piano'
import { cancelSpeech } from '../audio/speech'
import { delay, isAbortError } from '../utils/abort'

export const CHALLENGE_FEEDBACK_INCORRECT_MS = 1200

export function withReactionMs<T extends { reactionMs?: number }>(
  answer: T,
  audioPlayStartMs: number | null,
): T {
  if (audioPlayStartMs === null) {
    return answer
  }

  return { ...answer, reactionMs: performance.now() - audioPlayStartMs }
}

export async function finishChallengeOnIncorrect(
  signal: AbortSignal,
  onIncorrect: () => void,
): Promise<void> {
  onIncorrect()
  await delay(CHALLENGE_FEEDBACK_INCORRECT_MS, signal)
}

export async function resolveAnswerWithCorrection<TAnswer extends { reactionMs?: number }>(options: {
  firstAnswer: TAnswer
  isCorrect: (answer: TAnswer) => boolean
  isEmpty: (answer: TAnswer) => boolean
  getSelection: (answer: TAnswer) => string
  mergeRetrySelection: (firstAnswer: TAnswer, retryAnswer: TAnswer) => TAnswer
  waitForAnswer: () => Promise<TAnswer>
  onEnterCorrection: (wrongSelection: string) => void
}): Promise<{ answer: TAnswer; correct: boolean }> {
  const {
    firstAnswer,
    isCorrect,
    isEmpty,
    getSelection,
    mergeRetrySelection,
    waitForAnswer,
    onEnterCorrection,
  } = options

  if (isCorrect(firstAnswer)) {
    return { answer: firstAnswer, correct: true }
  }

  if (isEmpty(firstAnswer)) {
    return { answer: firstAnswer, correct: false }
  }

  onEnterCorrection(getSelection(firstAnswer))
  const retryAnswer = await waitForAnswer()

  if (isCorrect(retryAnswer)) {
    return { answer: mergeRetrySelection(firstAnswer, retryAnswer), correct: true }
  }

  return { answer: retryAnswer, correct: false }
}

export async function raceAnswerAgainstAudio<TAnswer>(options: {
  signal: AbortSignal
  piano: Piano
  waitForAnswer: () => Promise<TAnswer>
  playAudio: (audioSignal: AbortSignal) => Promise<void>
  onAwaitingAnswer?: () => void
}): Promise<TAnswer> {
  const { signal, piano, waitForAnswer, playAudio, onAwaitingAnswer } = options
  const audioAbort = new AbortController()

  const onSessionAbort = () => audioAbort.abort()
  signal.addEventListener('abort', onSessionAbort)

  const answerPromise = waitForAnswer()

  const audioPromise = playAudio(audioAbort.signal)
    .then(() => {
      if (!audioAbort.signal.aborted) {
        onAwaitingAnswer?.()
      }
    })
    .catch((error) => {
      if (!isAbortError(error)) {
        throw error
      }
    })

  try {
    return await answerPromise
  } finally {
    audioAbort.abort()
    piano.stop()
    cancelSpeech()
    signal.removeEventListener('abort', onSessionAbort)
    try {
      await audioPromise
    } catch {
      // Audio stopped early when the player answered.
    }
  }
}
