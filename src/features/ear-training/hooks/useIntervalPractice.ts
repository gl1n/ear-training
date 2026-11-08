import { useCallback, useState, type MutableRefObject } from 'react'
import type { Piano } from '../../../audio/piano'
import { buildIntervalSpeedLoopCallbacks } from '../../../quiz/challengeSessionHandlers'
import { ALL_INTERVAL_IDS, type IntervalDirection, type Quiz } from '../../../quiz/intervals'
import type { MistakeStatsStore } from '../../../quiz/mistakeStats'
import {
  createDefaultSettings,
  runIntervalFollowLoop,
  runIntervalSpeedLoop,
  type Settings,
  type SpeedPreset,
  type TrainerState,
} from '../../../quiz/sequencer'
import type { SessionStats } from '../../../quiz/stats'
import type { PracticeEncouragement } from '../components/practice/types'

type InitialIntervalSettings = {
  speedPreset: SpeedPreset
  settings: Settings
}

type IntervalAudioControls = {
  replayQuiz: (quiz: Quiz, settings: Settings, replayBlocked: boolean) => Promise<void>
}

type RunIntervalSpeedOptions = {
  piano: Piano
  signal: AbortSignal
  onStateChange: (state: TrainerState) => void
  waitForAnswer: (signal: AbortSignal) => Promise<string>
  onAnswerCorrectionStart: (wrongSelection: string) => void
  recordQuizMistake: (quiz: Quiz) => void
  setEncouragement: (encouragement: PracticeEncouragement) => void
  encouragementKeyRef: MutableRefObject<number>
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void
  onQuestionCompleted: () => boolean
  mistakeStore: MistakeStatsStore
}

export function useIntervalPractice(
  initial: InitialIntervalSettings,
  audio: IntervalAudioControls,
) {
  const [speedPreset, setSpeedPreset] = useState(initial.speedPreset)
  const [settings, setSettings] = useState(initial.settings)
  const [lastQuiz, setLastQuiz] = useState<Quiz | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const changeSpeed = useCallback((preset: SpeedPreset) => {
    setSpeedPreset(preset)
    setSettings((current) => ({
      ...current,
      ...createDefaultSettings(preset),
      enabledIntervalIds: current.enabledIntervalIds,
      direction: current.direction,
    }))
  }, [])

  const toggleInterval = useCallback((id: string) => {
    setSettings((current) => {
      const enabled = current.enabledIntervalIds.includes(id)
      return {
        ...current,
        enabledIntervalIds: enabled
          ? current.enabledIntervalIds.filter((item) => item !== id)
          : [...current.enabledIntervalIds, id],
      }
    })
  }, [])

  const selectAllIntervals = useCallback(() => {
    setSettings((current) => ({ ...current, enabledIntervalIds: [...ALL_INTERVAL_IDS] }))
  }, [])

  const clearIntervals = useCallback(() => {
    setSettings((current) => ({ ...current, enabledIntervalIds: [] }))
  }, [])

  const applyPreset = useCallback((intervalIds: string[]) => {
    setSettings((current) => ({ ...current, enabledIntervalIds: intervalIds }))
  }, [])

  const changeDirection = useCallback((direction: IntervalDirection) => {
    setSettings((current) => ({ ...current, direction }))
  }, [])

  const resetQuiz = useCallback(() => setLastQuiz(null), [])

  const playQuiz = useCallback((quiz: Quiz, replayBlocked: boolean) => {
    void audio.replayQuiz(quiz, settings, replayBlocked)
  }, [audio, settings])

  const runSpeedChallenge = useCallback(async ({
    piano,
    signal,
    onStateChange,
    waitForAnswer,
    onAnswerCorrectionStart,
    recordQuizMistake,
    setEncouragement,
    encouragementKeyRef,
    updateSessionStats,
    onQuestionCompleted,
    mistakeStore,
  }: RunIntervalSpeedOptions) => {
    await runIntervalSpeedLoop(
      piano,
      settings,
      buildIntervalSpeedLoopCallbacks({
        onStateChange,
        waitForAnswer: (answerSignal) => waitForAnswer(answerSignal).then((answer) => ({
          selectedIntervalId: answer,
        })),
        onAnswerCorrectionStart,
        setLastQuiz,
        recordQuizMistake,
        setEncouragement,
        encouragementKeyRef,
        updateSessionStats,
        onQuestionCompleted,
      }),
      signal,
      mistakeStore,
    )
  }, [settings])

  const runFollow = useCallback(async (
    piano: Piano,
    signal: AbortSignal,
    onStateChange: (state: TrainerState) => void,
  ) => {
    await runIntervalFollowLoop(piano, settings, {
      onStateChange,
      onAnswerRevealed: setLastQuiz,
    }, signal)
  }, [settings])

  const practiceWeakest = useCallback((sessionStats: SessionStats): boolean => {
    const weakest = Object.entries(sessionStats.byKey)
      .filter(([, value]) => value.totalCount > 0)
      .sort(([, a], [, b]) => a.correctCount / a.totalCount - b.correctCount / b.totalCount)
      .slice(0, 3)
      .map(([key]) => key)

    if (weakest.length === 0) return false
    setSettings((current) => ({ ...current, enabledIntervalIds: weakest }))
    return true
  }, [])

  return {
    speedPreset,
    settings,
    lastQuiz,
    drawerOpen,
    setDrawerOpen,
    resetQuiz,
    playQuiz,
    runSpeedChallenge,
    runFollow,
    practiceWeakest,
    changeSpeed,
    toggleInterval,
    selectAllIntervals,
    clearIntervals,
    applyPreset,
    changeDirection,
  }
}
