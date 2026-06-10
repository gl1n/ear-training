import type { MutableRefObject } from 'react'
import { abortError } from '../utils/abort'

type AnswerWaiterRefs = {
  answerResolverRef: MutableRefObject<((answer: string) => void) | null>
  answerCleanupRef: MutableRefObject<(() => void) | null>
}

export function createAnswerWaiter(refs: AnswerWaiterRefs) {
  return (signal: AbortSignal): Promise<string> => {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup()
        reject(abortError())
      }

      const cleanup = () => {
        signal.removeEventListener('abort', onAbort)
        refs.answerResolverRef.current = null
        refs.answerCleanupRef.current = null
      }

      refs.answerResolverRef.current = (answer: string) => {
        cleanup()
        resolve(answer)
      }
      refs.answerCleanupRef.current = cleanup
      signal.addEventListener('abort', onAbort)
    })
  }
}

export function createGameStartWaiter(refs: {
  gameStartResolverRef: MutableRefObject<(() => void) | null>
  gameStartCleanupRef: MutableRefObject<(() => void) | null>
  onStart: () => void
}) {
  return (signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup()
        reject(abortError())
      }

      const cleanup = () => {
        signal.removeEventListener('abort', onAbort)
        refs.gameStartResolverRef.current = null
        refs.gameStartCleanupRef.current = null
      }

      refs.gameStartResolverRef.current = () => {
        cleanup()
        refs.onStart()
        resolve()
      }
      refs.gameStartCleanupRef.current = cleanup
      signal.addEventListener('abort', onAbort)
    })
  }
}
