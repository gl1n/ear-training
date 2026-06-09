import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IntervalDirection, Quiz } from '../quiz/intervals'
import {
  loadArcadeBestRecord,
  tryUpdateArcadeBestRecord,
  type ArcadeBestRecord,
  type ArcadeBestVariant,
} from '../quiz/arcadeBestRecord'
import {
  loadMistakeStats,
  recordMistake,
  saveMistakeStats,
  type MistakeStatsStore,
} from '../quiz/mistakeStats'
import { getCorrectAnswerCount, hasSessionAttempts, type SessionStats } from '../quiz/stats'
import {
  loadNoteKeyMistakeStats,
  recordNoteKeyMistake,
  saveNoteKeyMistakeStats,
  type NoteKeyMistakeRecord,
  type NoteKeyMistakeStatsStore,
} from '../quiz/noteKeyMistakeStats'
import {
  appendNoteKeySessionRecord,
  loadNoteKeySessionHistory,
  type NoteKeySessionRecord,
} from '../quiz/noteKeySessionHistory'
import { clearAllTrainingStats, hasPersistedTrainingStats } from '../quiz/trainingStats'

export type TrainingStatsViewModel = {
  mistakeStats: MistakeStatsStore
  noteKeyMistakeStats: NoteKeyMistakeStatsStore
  noteKeySessionHistory: NoteKeySessionRecord[]
  bestRecord: ArcadeBestRecord | null
  isNewBestRecord: boolean
  noteKeyBestRecord: ArcadeBestRecord | null
  isNewNoteKeyBestRecord: boolean
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
  const noteKeyMistakeStoreRef = useRef<NoteKeyMistakeStatsStore>(loadNoteKeyMistakeStats())
  const [bestRecord, setBestRecord] = useState<ArcadeBestRecord | null>(() =>
    loadArcadeBestRecord('interval'),
  )
  const [noteKeyBestRecord, setNoteKeyBestRecord] = useState<ArcadeBestRecord | null>(() =>
    loadArcadeBestRecord('noteKey'),
  )
  const [isNewBestRecord, setIsNewBestRecord] = useState(false)
  const [isNewNoteKeyBestRecord, setIsNewNoteKeyBestRecord] = useState(false)
  const [noteKeySessionHistory, setNoteKeySessionHistory] = useState<NoteKeySessionRecord[]>(() =>
    loadNoteKeySessionHistory(),
  )
  const [mistakeVersion, setMistakeVersion] = useState(0)
  const [noteKeyMistakeVersion, setNoteKeyMistakeVersion] = useState(0)

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
      saveNoteKeyMistakeStats(noteKeyMistakeStoreRef.current)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [noteKeyMistakeVersion])

  const mistakeStats = useMemo(
    () => [...mistakeStoreRef.current],
    [mistakeVersion],
  )

  const noteKeyMistakeStats = useMemo(
    () => [...noteKeyMistakeStoreRef.current],
    [noteKeyMistakeVersion],
  )

  const recordQuizMistake = useCallback((quiz: Quiz) => {
    recordMistake(mistakeStoreRef.current, quiz)
    setMistakeVersion((version) => version + 1)
  }, [])

  const recordNoteKeyQuizMistake = useCallback((record: NoteKeyMistakeRecord) => {
    recordNoteKeyMistake(noteKeyMistakeStoreRef.current, record)
    setNoteKeyMistakeVersion((version) => version + 1)
  }, [])

  const clearNewBestRecord = useCallback((variant: ArcadeBestVariant = 'interval') => {
    if (variant === 'noteKey') {
      setIsNewNoteKeyBestRecord(false)
      return
    }
    setIsNewBestRecord(false)
  }, [])

  const finalizeArcadeSession = useCallback(
    (sessionStats: SessionStats, variant: ArcadeBestVariant = 'interval') => {
      if (!hasSessionAttempts(sessionStats)) return

      const { record, isNew } = tryUpdateArcadeBestRecord(
        { correctCount: getCorrectAnswerCount(sessionStats) },
        variant,
      )

      if (variant === 'noteKey') {
        setNoteKeyBestRecord(record)
        setIsNewNoteKeyBestRecord(isNew)
        setNoteKeySessionHistory(appendNoteKeySessionRecord(getCorrectAnswerCount(sessionStats)))
        return
      }

      setBestRecord(record)
      setIsNewBestRecord(isNew)
    },
    [],
  )

  const reset = useCallback(() => {
    mistakeStoreRef.current = []
    noteKeyMistakeStoreRef.current = []
    clearAllTrainingStats()
    setBestRecord(null)
    setNoteKeyBestRecord(null)
    setNoteKeySessionHistory([])
    setIsNewBestRecord(false)
    setIsNewNoteKeyBestRecord(false)
    setMistakeVersion((version) => version + 1)
    setNoteKeyMistakeVersion((version) => version + 1)
  }, [])

  const viewModel = useMemo<TrainingStatsViewModel>(
    () => ({
      mistakeStats,
      noteKeyMistakeStats,
      noteKeySessionHistory,
      bestRecord,
      isNewBestRecord,
      noteKeyBestRecord,
      isNewNoteKeyBestRecord,
      canReset: hasPersistedTrainingStats(
        mistakeStats,
        bestRecord,
        noteKeyBestRecord,
        noteKeyMistakeStats,
        noteKeySessionHistory,
      ),
      reset,
    }),
    [
      mistakeStats,
      noteKeyMistakeStats,
      noteKeySessionHistory,
      bestRecord,
      isNewBestRecord,
      noteKeyBestRecord,
      isNewNoteKeyBestRecord,
      reset,
    ],
  )

  return {
    mistakeStoreRef,
    noteKeyMistakeStoreRef,
    viewModel,
    recordQuizMistake,
    recordNoteKeyQuizMistake,
    clearNewBestRecord,
    finalizeArcadeSession,
  }
}
