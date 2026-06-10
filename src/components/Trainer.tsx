import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useAutoDismiss } from '../hooks/useAutoDismiss'
import { useChallengeSession } from '../hooks/useChallengeSession'
import { getInitialSettings, usePersistedSettings } from '../hooks/usePersistedSettings'
import { useTrainingStats } from '../hooks/useTrainingStats'
import { ALL_INTERVAL_IDS, type IntervalDirection, type Quiz } from '../quiz/intervals'
import type { ScaleDegreeQuiz } from '../quiz/keys'
import {
  buildIntervalSpeedLoopCallbacks,
  buildScaleDegreeLoopCallbacks,
} from '../quiz/challengeSessionHandlers'
import { createAnswerWaiter, createGameStartWaiter } from '../quiz/createAnswerWaiter'
import {
  createDefaultSettings,
  runIntervalFollowLoop,
  runIntervalSpeedLoop,
  runScaleDegreeLoop,
  stopPlayback,
  INTERVAL_SPEED_TIME_MS,
  LISTENING_STATES,
  type AppMode,
  type Settings,
  type SpeedPreset,
  type TrainerState,
} from '../quiz/sequencer'
import { isAbortError } from '../utils/abort'
import type { SettingsPanelProps } from './SettingsPanel'
import { PracticeView } from './PracticeView'
import type { PracticeEncouragement } from './practice/types'
import { SettingsDrawer } from './SettingsDrawer'
import { IDLE_TIP_MESSAGES } from './ui/encouragementMessages'

export function Trainer() {
  const initial = getInitialSettings()
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [state, setState] = useState<TrainerState>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>(initial.speedPreset)
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [lastQuiz, setLastQuiz] = useState<Quiz | null>(null)
  const [lastScaleDegreeQuiz, setLastScaleDegreeQuiz] = useState<ScaleDegreeQuiz | null>(null)
  const [currentKeyLabel, setCurrentKeyLabel] = useState<string | null>(null)
  const [scaleDegreeGameStarted, setScaleDegreeGameStarted] = useState(false)
  const [scaleDegreeReviewEnabled, setScaleDegreeReviewEnabled] = useState(
    initial.scaleDegreeReviewEnabled,
  )
  const [intervalSpeedDeadlineMs, setIntervalSpeedDeadlineMs] = useState<number | null>(null)
  const [intervalSpeedTimedOut, setIntervalSpeedTimedOut] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const answerResolverRef = useRef<((answer: string) => void) | null>(null)
  const answerCleanupRef = useRef<(() => void) | null>(null)
  const gameStartResolverRef = useRef<(() => void) | null>(null)
  const gameStartCleanupRef = useRef<(() => void) | null>(null)
  const intervalSpeedEncouragementIndexRef = useRef(0)
  const scaleDegreeEncouragementKeyRef = useRef(0)
  const [intervalSpeedEncouragement, setIntervalSpeedEncouragement] =
    useState<PracticeEncouragement | null>(null)
  const [scaleDegreeEncouragement, setScaleDegreeEncouragement] =
    useState<PracticeEncouragement | null>(null)

  const {
    pianoRef,
    replayAbortRef,
    audioContextRef,
    loadProgress,
    loadIndeterminate,
    loadError,
    replayingQuizKey,
    ensureAudioContext,
    resetLoadingState,
    ensurePiano,
    handlePlayQuiz: replayQuizAudio,
    handleLoadFailure,
    setLoadProgress,
    setLoadIndeterminate,
    setLoadError,
  } = useAudioEngine()
  const {
    sessionStats,
    sessionStatsRef,
    sessionScaleDegreeMistakes,
    resetSessionState,
    updateSessionStats,
    appendSessionScaleDegreeMistake,
  } = useChallengeSession()

  const {
    mistakeStoreRef,
    scaleDegreeMistakeStoreRef,
    viewModel: trainingStats,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    clearNewBestRecord,
    finalizeChallengeSession,
  } = useTrainingStats()

  useEffect(() => {
    if (
      mode !== 'scaleDegree' ||
      !isRunning ||
      scaleDegreeGameStarted ||
      state !== 'idle' ||
      currentKeyLabel === null ||
      !gameStartResolverRef.current
    ) {
      return
    }

    gameStartResolverRef.current()
  }, [mode, isRunning, scaleDegreeGameStarted, state, currentKeyLabel])

  useAutoDismiss(intervalSpeedEncouragement, 2500, () => setIntervalSpeedEncouragement(null), intervalSpeedEncouragement?.message)
  useAutoDismiss(scaleDegreeEncouragement, 1800, () => setScaleDegreeEncouragement(null), scaleDegreeEncouragement?.key)

  usePersistedSettings(
    speedPreset,
    settings.enabledIntervalIds,
    settings.direction,
    mode,
    scaleDegreeReviewEnabled,
  )

  const showIntervalSpeedEncouragement = useCallback(() => {
    const message =
      IDLE_TIP_MESSAGES[
        intervalSpeedEncouragementIndexRef.current % IDLE_TIP_MESSAGES.length
      ]
    intervalSpeedEncouragementIndexRef.current += 1
    setIntervalSpeedEncouragement({ message })
  }, [])

  const resetChallengeAnswerState = useCallback(() => {
    answerResolverRef.current = null
    answerCleanupRef.current?.()
    answerCleanupRef.current = null
    gameStartResolverRef.current = null
    gameStartCleanupRef.current?.()
    gameStartCleanupRef.current = null
  }, [])

  const abortSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    replayAbortRef.current?.abort()
    replayAbortRef.current = null
    resetChallengeAnswerState()
    stopPlayback(pianoRef.current)
  }, [resetChallengeAnswerState])

  const stop = useCallback(() => {
    abortSession()
    setIsRunning(false)
    setState('idle')
    setIntervalSpeedDeadlineMs(null)
    setIntervalSpeedEncouragement(null)
    setScaleDegreeEncouragement(null)
    setScaleDegreeGameStarted(false)
    resetLoadingState()
  }, [abortSession, resetLoadingState])

  useEffect(() => {
    return () => {
      abortSession()
      pianoRef.current = null
      void audioContextRef.current?.close()
      audioContextRef.current = null
    }
  }, [abortSession])

  const handleTrainerStateChange = useCallback((nextState: TrainerState) => {
    if (LISTENING_STATES.includes(nextState)) {
      setIntervalSpeedEncouragement(null)
    }
    setState(nextState)
  }, [])

  const waitForIntervalSpeedAnswer = (signal: AbortSignal, timeoutMs?: number) =>
    createAnswerWaiter({ answerResolverRef, answerCleanupRef })(signal, timeoutMs)

  const waitForScaleDegreeAnswer = (signal: AbortSignal) =>
    createAnswerWaiter({ answerResolverRef, answerCleanupRef })(signal)

  const waitForGameStart = (signal: AbortSignal) =>
    createGameStartWaiter({
      gameStartResolverRef,
      gameStartCleanupRef,
      onStart: () => setScaleDegreeGameStarted(true),
    })(signal)

  const handleAnswerSelect = useCallback((answer: string) => {
    answerResolverRef.current?.(answer)
  }, [])

  const handlePlayQuiz = useCallback(
    (quiz: Quiz) => {
      void replayQuizAudio(quiz, settings, isRunning)
    },
    [replayQuizAudio, isRunning, settings],
  )

  const start = useCallback(async () => {
    if (mode !== 'scaleDegree' && settings.enabledIntervalIds.length === 0) {
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setIsRunning(true)
    setState('loading')
    setLoadProgress(0)
    setLoadIndeterminate(false)
    setLoadError(null)
    resetSessionState()
    resetChallengeAnswerState()

    if (mode === 'intervalSpeed') {
      setLastQuiz(null)
      clearNewBestRecord('intervalSpeed')
      setIntervalSpeedTimedOut(false)
    }
    if (mode === 'scaleDegree') {
      setLastScaleDegreeQuiz(null)
      setCurrentKeyLabel(null)
      setScaleDegreeGameStarted(false)
      clearNewBestRecord('scaleDegree')
    }

    try {
      ensureAudioContext()
      const piano = await ensurePiano(settings, controller.signal)
      resetLoadingState()

      const sessionDeadlineMs =
        mode === 'intervalSpeed' ? performance.now() + INTERVAL_SPEED_TIME_MS : null
      if (sessionDeadlineMs !== null) {
        setIntervalSpeedDeadlineMs(sessionDeadlineMs)
      }

      if (mode === 'intervalSpeed') {
        await runIntervalSpeedLoop(
          piano,
          settings,
          buildIntervalSpeedLoopCallbacks({
            onStateChange: handleTrainerStateChange,
            waitForAnswer: (signal, timeoutMs) =>
              waitForIntervalSpeedAnswer(signal, timeoutMs).then(({ answer, timedOut }) => ({
                selectedIntervalId: answer,
                timedOut,
              })),
            setLastQuiz,
            setIntervalSpeedTimedOut,
            recordQuizMistake,
            updateSessionStats,
            showIntervalSpeedEncouragement,
          }),
          controller.signal,
          sessionDeadlineMs!,
          mistakeStoreRef.current,
        )
      } else if (mode === 'scaleDegree') {
        await runScaleDegreeLoop(
          piano,
          settings,
          buildScaleDegreeLoopCallbacks({
            onStateChange: handleTrainerStateChange,
            onSessionStart: (session) => setCurrentKeyLabel(session.label),
            waitForGameStart,
            waitForAnswer: (signal) =>
              waitForScaleDegreeAnswer(signal).then(({ answer, timedOut }) => ({
                selectedDegree: answer,
                timedOut,
              })),
            setLastScaleDegreeQuiz,
            recordScaleDegreeQuizMistake,
            appendSessionScaleDegreeMistake,
            setScaleDegreeEncouragement,
            scaleDegreeEncouragementKeyRef,
            updateSessionStats,
            getSessionStats: () => sessionStatsRef.current,
          }),
          controller.signal,
          scaleDegreeMistakeStoreRef.current,
          scaleDegreeReviewEnabled,
        )
      } else {
        await runIntervalFollowLoop(
          piano,
          settings,
          {
            onStateChange: handleTrainerStateChange,
            onAnswerRevealed: setLastQuiz,
          },
          controller.signal,
        )
      }
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      console.error(error)
      handleLoadFailure(error)
      setState('idle')
    } finally {
      if (abortRef.current === controller) {
        if (mode === 'intervalSpeed') {
          finalizeChallengeSession(sessionStatsRef.current, 'intervalSpeed')
        }
        if (mode === 'scaleDegree') {
          finalizeChallengeSession(sessionStatsRef.current, 'scaleDegree')
        }

        setIsRunning(false)
        setState('idle')
        setIntervalSpeedDeadlineMs(null)
        setScaleDegreeGameStarted(false)
        abortRef.current = null
        resetChallengeAnswerState()
      }
    }
  }, [
    mode,
    scaleDegreeReviewEnabled,
    resetChallengeAnswerState,
    resetSessionState,
    settings,
    showIntervalSpeedEncouragement,
    handleTrainerStateChange,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    finalizeChallengeSession,
    clearNewBestRecord,
    ensureAudioContext,
    ensurePiano,
    resetLoadingState,
    handleLoadFailure,
    setLoadError,
    setLoadProgress,
    setLoadIndeterminate,
    mistakeStoreRef,
    scaleDegreeMistakeStoreRef,
    sessionStatsRef,
    updateSessionStats,
    appendSessionScaleDegreeMistake,
  ])

  const handleToggle = () => {
    if (isRunning && mode === 'scaleDegree' && !scaleDegreeGameStarted) {
      stop()
      return
    }

    if (isRunning) {
      stop()
      return
    }

    ensureAudioContext()
    void start()
  }

  const handleScaleDegreeHome = useCallback(() => {
    setLastScaleDegreeQuiz(null)
    resetSessionState()
  }, [resetSessionState])

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode)
    setLastQuiz(null)
    setLastScaleDegreeQuiz(null)
    setCurrentKeyLabel(null)
    setScaleDegreeGameStarted(false)
    resetSessionState()
    setIntervalSpeedTimedOut(false)
    resetChallengeAnswerState()
  }

  const handleSpeedChange = (preset: SpeedPreset) => {
    setSpeedPreset(preset)
    setSettings((current) => ({
      ...current,
      ...createDefaultSettings(preset),
      enabledIntervalIds: current.enabledIntervalIds,
      direction: current.direction,
    }))
  }

  const handleIntervalToggle = (id: string) => {
    setSettings((current) => {
      const enabled = current.enabledIntervalIds.includes(id)
      const enabledIntervalIds = enabled
        ? current.enabledIntervalIds.filter((item) => item !== id)
        : [...current.enabledIntervalIds, id]
      return { ...current, enabledIntervalIds }
    })
  }

  const handleSelectAllIntervals = () => {
    setSettings((current) => ({
      ...current,
      enabledIntervalIds: [...ALL_INTERVAL_IDS],
    }))
  }

  const handleClearIntervals = () => {
    setSettings((current) => ({ ...current, enabledIntervalIds: [] }))
  }

  const handleApplyPreset = (intervalIds: string[]) => {
    setSettings((current) => ({ ...current, enabledIntervalIds: intervalIds }))
  }

  const handleDirectionChange = (direction: IntervalDirection) => {
    setSettings((current) => ({ ...current, direction }))
  }

  const settingsControls: SettingsPanelProps = {
    mode,
    speedPreset,
    enabledIntervalIds: settings.enabledIntervalIds,
    direction: settings.direction,
    isRunning,
    onSpeedChange: handleSpeedChange,
    onDirectionChange: handleDirectionChange,
    onIntervalToggle: handleIntervalToggle,
    onSelectAllIntervals: handleSelectAllIntervals,
    onClearIntervals: handleClearIntervals,
    onApplyPreset: handleApplyPreset,
  }

  const loadStatus = {
    loadProgress,
    loadIndeterminate,
    loadError,
    onRetry: handleToggle,
  }

  return (
    <>
      <PracticeView
        mode={mode}
        state={state}
        isRunning={isRunning}
        isLoading={state === 'loading'}
        settingsControls={settingsControls}
        lastQuiz={lastQuiz}
        lastScaleDegreeQuiz={lastScaleDegreeQuiz}
        currentKeyLabel={currentKeyLabel}
        scaleDegreeGameStarted={scaleDegreeGameStarted}
        sessionScaleDegreeMistakes={sessionScaleDegreeMistakes}
        scaleDegreeReviewEnabled={scaleDegreeReviewEnabled}
        onScaleDegreeReviewChange={setScaleDegreeReviewEnabled}
        sessionStats={sessionStats}
        trainingStats={trainingStats}
        rootMin={settings.rootMin}
        rootMax={settings.rootMax}
        intervalSpeedDeadlineMs={intervalSpeedDeadlineMs}
        intervalSpeedTimedOut={intervalSpeedTimedOut}
        intervalSpeedEncouragement={intervalSpeedEncouragement}
        scaleDegreeEncouragement={scaleDegreeEncouragement}
        loadStatus={loadStatus}
        onModeChange={handleModeChange}
        onToggle={handleToggle}
        onOpenSettings={() => setDrawerOpen(true)}
        onAnswerSelect={handleAnswerSelect}
        replayingQuizKey={replayingQuizKey}
        isReplayBusy={replayingQuizKey !== null}
        onPlayQuiz={handlePlayQuiz}
        onScaleDegreeHome={handleScaleDegreeHome}
      />

      {mode !== 'scaleDegree' && (
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          {...settingsControls}
        />
      )}
    </>
  )
}
