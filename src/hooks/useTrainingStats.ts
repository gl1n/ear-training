import { useCallback, useMemo, useState } from 'react'
import type { Quiz } from '../quiz/intervals'
import {
  loadChallengeBestRecord,
  tryUpdateChallengeBestRecord,
  type ChallengeBestRecord,
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
import type { ChallengeBestVariant } from '../quiz/storageKeys'
import { clearAllTrainingStats, hasPersistedTrainingStats } from '../quiz/trainingStats'
import { usePersistedRecentStore } from './usePersistedRecentStore'

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

type BestRecordState = {
  record: ChallengeBestRecord | null
  isNew: boolean
}

const CHALLENGE_VARIANTS: ChallengeBestVariant[] = ['intervalSpeed', 'scaleDegree']

function createInitialBestRecordState(): Record<ChallengeBestVariant, BestRecordState> {
  return {
    intervalSpeed: { record: loadChallengeBestRecord('intervalSpeed'), isNew: false },
    scaleDegree: { record: loadChallengeBestRecord('scaleDegree'), isNew: false },
  }
}

export function useTrainingStats() {
  const {
    storeRef: mistakeStoreRef,
    snapshot: mistakeStats,
    bump: bumpMistakeVersion,
    reset: resetMistakeStore,
  } = usePersistedRecentStore(loadMistakeStats, saveMistakeStats)

  const {
    storeRef: scaleDegreeMistakeStoreRef,
    snapshot: scaleDegreeMistakeStats,
    bump: bumpScaleDegreeMistakeVersion,
    reset: resetScaleDegreeMistakeStore,
  } = usePersistedRecentStore(loadScaleDegreeMistakeStats, saveScaleDegreeMistakeStats)

  const [bestRecordState, setBestRecordState] = useState(createInitialBestRecordState)
  const [scaleDegreeSessionHistory, setScaleDegreeSessionHistory] = useState<
    ScaleDegreeSessionRecord[]
  >(() => loadScaleDegreeSessionHistory())

  const recordQuizMistake = useCallback(
    (quiz: Quiz) => {
      recordMistake(mistakeStoreRef.current, quiz)
      bumpMistakeVersion()
    },
    [bumpMistakeVersion, mistakeStoreRef],
  )

  const recordScaleDegreeQuizMistake = useCallback(
    (record: ScaleDegreeMistakeRecord) => {
      recordScaleDegreeMistake(scaleDegreeMistakeStoreRef.current, record)
      bumpScaleDegreeMistakeVersion()
    },
    [bumpScaleDegreeMistakeVersion, scaleDegreeMistakeStoreRef],
  )

  const clearNewBestRecord = useCallback((variant: ChallengeBestVariant = 'intervalSpeed') => {
    setBestRecordState((current) => ({
      ...current,
      [variant]: { ...current[variant], isNew: false },
    }))
  }, [])

  const finalizeChallengeSession = useCallback(
    (sessionStats: SessionStats, variant: ChallengeBestVariant = 'intervalSpeed') => {
      if (!hasSessionAttempts(sessionStats)) return

      const { record, isNew } = tryUpdateChallengeBestRecord(
        { correctCount: getCorrectAnswerCount(sessionStats) },
        variant,
      )

      setBestRecordState((current) => ({
        ...current,
        [variant]: { record, isNew },
      }))

      if (variant === 'scaleDegree') {
        setScaleDegreeSessionHistory(
          appendScaleDegreeSessionRecord(
            getCorrectAnswerCount(sessionStats),
            getTotalScore(sessionStats),
          ),
        )
      }
    },
    [],
  )

  const reset = useCallback(() => {
    resetMistakeStore()
    resetScaleDegreeMistakeStore()
    clearAllTrainingStats()
    setBestRecordState(
      Object.fromEntries(
        CHALLENGE_VARIANTS.map((variant) => [variant, { record: null, isNew: false }]),
      ) as Record<ChallengeBestVariant, BestRecordState>,
    )
    setScaleDegreeSessionHistory([])
  }, [resetMistakeStore, resetScaleDegreeMistakeStore])

  const viewModel = useMemo<TrainingStatsViewModel>(
    () => ({
      mistakeStats,
      scaleDegreeMistakeStats,
      scaleDegreeSessionHistory,
      intervalSpeedBestRecord: bestRecordState.intervalSpeed.record,
      isNewIntervalSpeedBestRecord: bestRecordState.intervalSpeed.isNew,
      scaleDegreeBestRecord: bestRecordState.scaleDegree.record,
      isNewScaleDegreeBestRecord: bestRecordState.scaleDegree.isNew,
      canReset: hasPersistedTrainingStats(
        mistakeStats,
        bestRecordState.intervalSpeed.record,
        bestRecordState.scaleDegree.record,
        scaleDegreeMistakeStats,
        scaleDegreeSessionHistory,
      ),
      reset,
    }),
    [
      mistakeStats,
      scaleDegreeMistakeStats,
      scaleDegreeSessionHistory,
      bestRecordState,
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
