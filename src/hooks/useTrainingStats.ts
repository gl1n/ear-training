import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IntervalDirection } from '../quiz/intervals'
import {
  loadArcadeBestRecord,
  tryUpdateArcadeBestRecord,
  type ArcadeBestRecord,
} from '../quiz/arcadeBestRecord'
import {
  loadMistakeStats,
  recordMistake,
  saveMistakeStats,
  type MistakeStatsStore,
} from '../quiz/mistakeStats'
import { getCorrectAnswerCount, hasSessionAttempts, type SessionStats } from '../quiz/stats'
import { clearAllTrainingStats, hasPersistedTrainingStats } from '../quiz/trainingStats'

export type TrainingStatsViewModel = {
  mistakeStats: MistakeStatsStore
  bestRecord: ArcadeBestRecord | null
  isNewBestRecord: boolean
  canReset: boolean
  reset: () => void
}

type UseTrainingStatsOptions = {
  direction: IntervalDirection
  enabledIntervalIds: string[]
}

export function useTrainingStats({
  direction: _direction,
  enabledIntervalIds: _enabledIntervalIds,
}: UseTrainingStatsOptions) {
  const mistakeStoreRef = useRef<MistakeStatsStore>(loadMistakeStats())
  const [bestRecord, setBestRecord] = useState<ArcadeBestRecord | null>(() => loadArcadeBestRecord())
  const [isNewBestRecord, setIsNewBestRecord] = useState(false)
  const [mistakeVersion, setMistakeVersion] = useState(0)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveMistakeStats(mistakeStoreRef.current)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [mistakeVersion])

  const mistakeStats = useMemo(
    () => [...mistakeStoreRef.current],
    [mistakeVersion],
  )

  const recordRootMistake = useCallback((root: number) => {
    recordMistake(mistakeStoreRef.current, root)
    setMistakeVersion((version) => version + 1)
  }, [])

  const clearNewBestRecord = useCallback(() => {
    setIsNewBestRecord(false)
  }, [])

  const finalizeArcadeSession = useCallback((sessionStats: SessionStats) => {
    if (!hasSessionAttempts(sessionStats)) return

    const { record, isNew } = tryUpdateArcadeBestRecord({
      correctCount: getCorrectAnswerCount(sessionStats),
    })
    setBestRecord(record)
    setIsNewBestRecord(isNew)
  }, [])

  const reset = useCallback(() => {
    mistakeStoreRef.current = []
    clearAllTrainingStats()
    setBestRecord(null)
    setIsNewBestRecord(false)
    setMistakeVersion((version) => version + 1)
  }, [])

  const viewModel = useMemo<TrainingStatsViewModel>(
    () => ({
      mistakeStats,
      bestRecord,
      isNewBestRecord,
      canReset: hasPersistedTrainingStats(mistakeStats, bestRecord),
      reset,
    }),
    [mistakeStats, bestRecord, isNewBestRecord, reset],
  )

  return {
    mistakeStoreRef,
    viewModel,
    recordRootMistake,
    clearNewBestRecord,
    finalizeArcadeSession,
  }
}
