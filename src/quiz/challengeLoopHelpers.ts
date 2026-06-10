import type { Piano } from '../audio/piano'
import { cancelSpeech } from '../audio/speech'
import { isAbortError } from '../utils/abort'

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
