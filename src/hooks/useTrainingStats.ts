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
  loadScaleDegreeMelodyMistakeStats,
  recordScaleDegreeMelodyMistake,
  saveScaleDegreeMelodyMistakeStats,
  type ScaleDegreeMelodyMistakeRecord,
  type ScaleDegreeMelodyMistakeStatsStore,
} from '../quiz/scaleDegreeMelodyMistakeStats'
import {
  appendScaleDegreeMelodySessionRecord,
  appendScaleDegreeSessionRecord,
  loadScaleDegreeMelodySessionHistory,
  loadScaleDegreeSessionHistory,
  type ScaleDegreeSessionRecord,
} from '../quiz/scaleDegreeSessionHistory'
import type { ChallengeBestVariant } from '../quiz/storageKeys'
import { clearAllTrainingStats, hasPersistedTrainingStats } from '../quiz/trainingStats'
import { usePersistedRecentStore } from './usePersistedRecentStore'

export type TrainingStatsViewModel = {
  mistakeStats: MistakeStatsStore
  scaleDegreeMistakeStats: ScaleDegreeMistakeStatsStore
  scaleDegreeMelodyMistakeStats: ScaleDegreeMelodyMistakeStatsStore
  scaleDegreeSessionHistory: ScaleDegreeSessionRecord[]
  scaleDegreeMelodySessionHistory: ScaleDegreeSessionRecord[]
  intervalSpeedBestRecord: ChallengeBestRecord | null
  isNewIntervalSpeedBestRecord: boolean
  scaleDegreeBestRecord: ChallengeBestRecord | null
  isNewScaleDegreeBestRecord: boolean
  scaleDegreeMelodyBestRecord: ChallengeBestRecord | null
  isNewScaleDegreeMelodyBestRecord: boolean
  canReset: boolean
  reset: () => void
}

type BestRecordState = {
  record: ChallengeBestRecord | null
  isNew: boolean
}

const CHALLENGE_VARIANTS: ChallengeBestVariant[] = [
  'intervalSpeed',
  'scaleDegree',
  'scaleDegreeMelody',
]

function createInitialBestRecordState(): Record<ChallengeBestVariant, BestRecordState> {
  return {
    intervalSpeed: { record: loadChallengeBestRecord('intervalSpeed'), isNew: false },
    scaleDegree: { record: loadChallengeBestRecord('scaleDegree'), isNew: false },
    scaleDegreeMelody: { record: loadChallengeBestRecord('scaleDegreeMelody'), isNew: false },
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

  const {
    storeRef: scaleDegreeMelodyMistakeStoreRef,
    snapshot: scaleDegreeMelodyMistakeStats,
    bump: bumpScaleDegreeMelodyMistakeVersion,
    reset: resetScaleDegreeMelodyMistakeStore,
  } = usePersistedRecentStore(
    loadScaleDegreeMelodyMistakeStats,
    saveScaleDegreeMelodyMistakeStats,
  )

  const [bestRecordState, setBestRecordState] = useState(createInitialBestRecordState)
  const [scaleDegreeSessionHistory, setScaleDegreeSessionHistory] = useState<
    ScaleDegreeSessionRecord[]
  >(() => loadScaleDegreeSessionHistory())
  const [scaleDegreeMelodySessionHistory, setScaleDegreeMelodySessionHistory] = useState<
    ScaleDegreeSessionRecord[]
  >(() => loadScaleDegreeMelodySessionHistory())

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

  const recordScaleDegreeMelodyQuizMistake = useCallback(
    (record: ScaleDegreeMelodyMistakeRecord) => {
      recordScaleDegreeMelodyMistake(scaleDegreeMelodyMistakeStoreRef.current, record)
      bumpScaleDegreeMelodyMistakeVersion()
    },
    [bumpScaleDegreeMelodyMistakeVersion, scaleDegreeMelodyMistakeStoreRef],
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

      const sessionRecord = {
        correctCount: getCorrectAnswerCount(sessionStats),
        totalScore: getTotalScore(sessionStats),
      }

      if (variant === 'scaleDegree') {
        setScaleDegreeSessionHistory(
          appendScaleDegreeSessionRecord(sessionRecord.correctCount, sessionRecord.totalScore),
        )
      }

      if (variant === 'scaleDegreeMelody') {
        setScaleDegreeMelodySessionHistory(
          appendScaleDegreeMelodySessionRecord(
            sessionRecord.correctCount,
            sessionRecord.totalScore,
          ),
        )
      }
    },
    [],
  )

  const reset = useCallback(() => {
    resetMistakeStore()
    resetScaleDegreeMistakeStore()
    resetScaleDegreeMelodyMistakeStore()
    clearAllTrainingStats()
    setBestRecordState(
      Object.fromEntries(
        CHALLENGE_VARIANTS.map((variant) => [variant, { record: null, isNew: false }]),
      ) as Record<ChallengeBestVariant, BestRecordState>,
    )
    setScaleDegreeSessionHistory([])
    setScaleDegreeMelodySessionHistory([])
  }, [resetMistakeStore, resetScaleDegreeMistakeStore, resetScaleDegreeMelodyMistakeStore])

  const viewModel = useMemo<TrainingStatsViewModel>(
    () => ({
      mistakeStats,
      scaleDegreeMistakeStats,
      scaleDegreeMelodyMistakeStats,
      scaleDegreeSessionHistory,
      scaleDegreeMelodySessionHistory,
      intervalSpeedBestRecord: bestRecordState.intervalSpeed.record,
      isNewIntervalSpeedBestRecord: bestRecordState.intervalSpeed.isNew,
      scaleDegreeBestRecord: bestRecordState.scaleDegree.record,
      isNewScaleDegreeBestRecord: bestRecordState.scaleDegree.isNew,
      scaleDegreeMelodyBestRecord: bestRecordState.scaleDegreeMelody.record,
      isNewScaleDegreeMelodyBestRecord: bestRecordState.scaleDegreeMelody.isNew,
      canReset: hasPersistedTrainingStats(
        mistakeStats,
        bestRecordState.intervalSpeed.record,
        bestRecordState.scaleDegree.record,
        scaleDegreeMistakeStats,
        scaleDegreeSessionHistory,
        scaleDegreeMelodyMistakeStats,
        bestRecordState.scaleDegreeMelody.record,
        scaleDegreeMelodySessionHistory,
      ),
      reset,
    }),
    [
      mistakeStats,
      scaleDegreeMistakeStats,
      scaleDegreeMelodyMistakeStats,
      scaleDegreeSessionHistory,
      scaleDegreeMelodySessionHistory,
      bestRecordState,
      reset,
    ],
  )

  return {
    mistakeStoreRef,
    scaleDegreeMistakeStoreRef,
    scaleDegreeMelodyMistakeStoreRef,
    viewModel,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    recordScaleDegreeMelodyQuizMistake,
    clearNewBestRecord,
    finalizeChallengeSession,
  }
}
