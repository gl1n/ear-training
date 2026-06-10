import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IntervalDirection, Quiz } from '../quiz/intervals'
import {
  loadChallengeBestRecord,
  tryUpdateChallengeBestRecord,
  type ChallengeBestRecord,
  type ChallengeBestVariant,
} from '../quiz/challengeBestRecord'
import {
  loadMistakeStats,
  recordMistake,
  saveMistakeStats,
  type MistakeStatsStore,
} from '../quiz/mistakeStats'
import {
  getCorrectAnswerCount,
  getTotalScore,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import {
  loadScaleDegreeMistakeStats,
  recordScaleDegreeMistake,
  saveScaleDegreeMistakeStats,
  type ScaleDegreeMistakeRecord,
  type ScaleDegreeMistakeStatsStore,
} from '../quiz/scaleDegreeMistakeStats'
import {
  appendScaleDegreeSessionRecord,
  loadScaleDegreeSessionHistory,
  type ScaleDegreeSessionRecord,
} from '../quiz/scaleDegreeSessionHistory'
import { clearAllTrainingStats, hasPersistedTrainingStats } from '../quiz/trainingStats'

export type TrainingStatsViewModel = {
  mistakeStats: MistakeStatsStore
  scaleDegreeMistakeStats: ScaleDegreeMistakeStatsStore
  scaleDegreeSessionHistory: ScaleDegreeSessionRecord[]
  intervalSpeedBestRecord: ChallengeBestRecord | null
  isNewIntervalSpeedBestRecord: boolean
  scaleDegreeBestRecord: ChallengeBestRecord | null
  isNewScaleDegreeBestRecord: boolean
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
  const scaleDegreeMistakeStoreRef = useRef<ScaleDegreeMistakeStatsStore>(loadScaleDegreeMistakeStats())
  const [intervalSpeedBestRecord, setIntervalSpeedBestRecord] = useState<ChallengeBestRecord | null>(
    () => loadChallengeBestRecord('intervalSpeed'),
  )
  const [scaleDegreeBestRecord, setScaleDegreeBestRecord] = useState<ChallengeBestRecord | null>(
    () => loadChallengeBestRecord('scaleDegree'),
  )
  const [isNewIntervalSpeedBestRecord, setIsNewIntervalSpeedBestRecord] = useState(false)
  const [isNewScaleDegreeBestRecord, setIsNewScaleDegreeBestRecord] = useState(false)
  const [scaleDegreeSessionHistory, setScaleDegreeSessionHistory] = useState<
    ScaleDegreeSessionRecord[]
  >(() => loadScaleDegreeSessionHistory())
  const [mistakeVersion, setMistakeVersion] = useState(0)
  const [scaleDegreeMistakeVersion, setScaleDegreeMistakeVersion] = useState(0)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveMistakeStats(mistakeStoreRef.current)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [mistakeVersion])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveScaleDegreeMistakeStats(scaleDegreeMistakeStoreRef.current)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [scaleDegreeMistakeVersion])

  const mistakeStats = useMemo(
    () => [...mistakeStoreRef.current],
    [mistakeVersion],
  )

  const scaleDegreeMistakeStats = useMemo(
    () => [...scaleDegreeMistakeStoreRef.current],
    [scaleDegreeMistakeVersion],
  )

  const recordQuizMistake = useCallback((quiz: Quiz) => {
    recordMistake(mistakeStoreRef.current, quiz)
    setMistakeVersion((version) => version + 1)
  }, [])

  const recordScaleDegreeQuizMistake = useCallback((record: ScaleDegreeMistakeRecord) => {
    recordScaleDegreeMistake(scaleDegreeMistakeStoreRef.current, record)
    setScaleDegreeMistakeVersion((version) => version + 1)
  }, [])

  const clearNewBestRecord = useCallback((variant: ChallengeBestVariant = 'intervalSpeed') => {
    if (variant === 'scaleDegree') {
      setIsNewScaleDegreeBestRecord(false)
      return
    }
    setIsNewIntervalSpeedBestRecord(false)
  }, [])

  const finalizeChallengeSession = useCallback(
    (sessionStats: SessionStats, variant: ChallengeBestVariant = 'intervalSpeed') => {
      if (!hasSessionAttempts(sessionStats)) return

      const { record, isNew } = tryUpdateChallengeBestRecord(
        { correctCount: getCorrectAnswerCount(sessionStats) },
        variant,
      )

      if (variant === 'scaleDegree') {
        setScaleDegreeBestRecord(record)
        setIsNewScaleDegreeBestRecord(isNew)
        setScaleDegreeSessionHistory(
          appendScaleDegreeSessionRecord(
            getCorrectAnswerCount(sessionStats),
            getTotalScore(sessionStats),
          ),
        )
        return
      }

      setIntervalSpeedBestRecord(record)
      setIsNewIntervalSpeedBestRecord(isNew)
    },
    [],
  )

  const reset = useCallback(() => {
    mistakeStoreRef.current = []
    scaleDegreeMistakeStoreRef.current = []
    clearAllTrainingStats()
    setIntervalSpeedBestRecord(null)
    setScaleDegreeBestRecord(null)
    setScaleDegreeSessionHistory([])
    setIsNewIntervalSpeedBestRecord(false)
    setIsNewScaleDegreeBestRecord(false)
    setMistakeVersion((version) => version + 1)
    setScaleDegreeMistakeVersion((version) => version + 1)
  }, [])

  const viewModel = useMemo<TrainingStatsViewModel>(
    () => ({
      mistakeStats,
      scaleDegreeMistakeStats,
      scaleDegreeSessionHistory,
      intervalSpeedBestRecord,
      isNewIntervalSpeedBestRecord,
      scaleDegreeBestRecord,
      isNewScaleDegreeBestRecord,
      canReset: hasPersistedTrainingStats(
        mistakeStats,
        intervalSpeedBestRecord,
        scaleDegreeBestRecord,
        scaleDegreeMistakeStats,
        scaleDegreeSessionHistory,
      ),
      reset,
    }),
    [
      mistakeStats,
      scaleDegreeMistakeStats,
      scaleDegreeSessionHistory,
      intervalSpeedBestRecord,
      isNewIntervalSpeedBestRecord,
      scaleDegreeBestRecord,
      isNewScaleDegreeBestRecord,
      reset,
    ],
  )

  return {
    mistakeStoreRef,
    scaleDegreeMistakeStoreRef,
    viewModel,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    clearNewBestRecord,
    finalizeChallengeSession,
  }
}
