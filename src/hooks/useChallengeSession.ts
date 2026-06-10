import { useCallback, useRef, useState } from 'react'
import type { ScaleDegreeMistakeRecord } from '../quiz/scaleDegreeMistakeStats'
import { EMPTY_SESSION_STATS, type SessionStats } from '../quiz/stats'

export function useChallengeSession() {
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_SESSION_STATS)
  const sessionStatsRef = useRef<SessionStats>(EMPTY_SESSION_STATS)
  const [sessionScaleDegreeMistakes, setSessionScaleDegreeMistakes] = useState<
    ScaleDegreeMistakeRecord[]
  >([])

  const getSessionStats = useCallback(() => sessionStatsRef.current, [])

  const resetSessionState = useCallback(() => {
    setSessionStats(EMPTY_SESSION_STATS)
    sessionStatsRef.current = EMPTY_SESSION_STATS
    setSessionScaleDegreeMistakes([])
  }, [])

  const updateSessionStats = useCallback((updater: (current: SessionStats) => SessionStats) => {
    setSessionStats((current) => {
      const next = updater(current)
      sessionStatsRef.current = next
      return next
    })
  }, [])

  const appendSessionScaleDegreeMistake = useCallback((record: ScaleDegreeMistakeRecord) => {
    setSessionScaleDegreeMistakes((current) => [...current, record])
  }, [])

  return {
    sessionStats,
    sessionStatsRef,
    sessionScaleDegreeMistakes,
    getSessionStats,
    resetSessionState,
    updateSessionStats,
    setSessionStats,
    appendSessionScaleDegreeMistake,
  }
}
