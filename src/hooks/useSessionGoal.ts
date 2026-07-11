import { useCallback, useRef, useState } from 'react'

export type SessionSize = 10 | 20 | 30

export function useSessionGoal(initialSize: SessionSize = 10) {
  const [sessionSize, setSessionSize] = useState<SessionSize>(initialSize)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const completedQuestionsRef = useRef(0)

  const beginSession = useCallback(() => {
    completedQuestionsRef.current = 0
    setSessionCompleted(false)
  }, [])

  const completeQuestion = useCallback(() => {
    completedQuestionsRef.current += 1
    return completedQuestionsRef.current >= sessionSize
  }, [sessionSize])

  const finishSession = useCallback(() => {
    const completed = completedQuestionsRef.current >= sessionSize
    setSessionCompleted(completed)
    return completed
  }, [sessionSize])

  const clearSessionGoal = useCallback(() => {
    completedQuestionsRef.current = 0
    setSessionCompleted(false)
  }, [])

  return {
    sessionSize,
    setSessionSize,
    sessionCompleted,
    beginSession,
    completeQuestion,
    finishSession,
    clearSessionGoal,
  }
}
