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
import {
  listWeakPriorityItems,
  loadQuizPriorities,
  saveQuizPriorities,
  type QuizPriorityStore,
  type WeakPriorityItem,
} from '../quiz/quizPriority'
import { getCorrectAnswerCount, hasSessionAttempts, type SessionStats } from '../quiz/stats'
import { clearAllTrainingStats, hasPersistedTrainingStats } from '../quiz/trainingStats'

export type TrainingStatsViewModel = {
  mistakeStats: MistakeStatsStore
  weakPriorityItems: WeakPriorityItem[]
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
  direction,
  enabledIntervalIds,
}: UseTrainingStatsOptions) {
  const priorityStoreRef = useRef<QuizPriorityStore>(loadQuizPriorities())
  const mistakeStoreRef = useRef<MistakeStatsStore>(loadMistakeStats())
  const [bestRecord, setBestRecord] = useState<ArcadeBestRecord | null>(() => loadArcadeBestRecord())
  const [isNewBestRecord, setIsNewBestRecord] = useState(false)
  const [priorityVersion, setPriorityVersion] = useState(0)
  const [mistakeVersion, setMistakeVersion] = useState(0)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveMistakeStats(mistakeStoreRef.current)
      saveQuizPriorities(priorityStoreRef.current)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [mistakeVersion, priorityVersion])

  const mistakeStats = useMemo(
    () => [...mistakeStoreRef.current],
    [mistakeVersion],
  )

  const weakPriorityItems = useMemo(
    () => listWeakPriorityItems(priorityStoreRef.current, direction, enabledIntervalIds),
    [priorityVersion, direction, enabledIntervalIds],
  )

  const recordRootMistake = useCallback((root: number) => {
    recordMistake(mistakeStoreRef.current, root)
    setMistakeVersion((version) => version + 1)
  }, [])

  const notifyPriorityUpdated = useCallback(() => {
    setPriorityVersion((version) => version + 1)
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
    priorityStoreRef.current = {}
    clearAllTrainingStats()
    setBestRecord(null)
    setIsNewBestRecord(false)
    setMistakeVersion((version) => version + 1)
    setPriorityVersion((version) => version + 1)
  }, [])

  const viewModel = useMemo<TrainingStatsViewModel>(
    () => ({
      mistakeStats,
      weakPriorityItems,
      bestRecord,
      isNewBestRecord,
      canReset: hasPersistedTrainingStats(mistakeStats, weakPriorityItems, bestRecord),
      reset,
    }),
    [mistakeStats, weakPriorityItems, bestRecord, isNewBestRecord, reset],
  )

  return {
    priorityStoreRef,
    viewModel,
    recordRootMistake,
    notifyPriorityUpdated,
    clearNewBestRecord,
    finalizeArcadeSession,
  }
}
