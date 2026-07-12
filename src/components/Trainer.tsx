import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useAutoDismiss } from '../hooks/useAutoDismiss'
import { useChallengeSession } from '../hooks/useChallengeSession'
import { getInitialSettings, usePersistedSettings } from '../hooks/usePersistedSettings'
import { useTrainingStats } from '../hooks/useTrainingStats'
import { useSessionGoal } from '../hooks/useSessionGoal'
import { ALL_INTERVAL_IDS, type IntervalDirection, type Quiz } from '../quiz/intervals'
import type { ScaleDegreeQuiz, MelodyScaleDegreeQuiz } from '../quiz/keys'
import { getTotalAnswerCount } from '../quiz/stats'
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
import { chordKeyLabel, runChordProgressionLoop, type ChordDegree, type ChordKey, type ChordRhythm, type PlayedChord } from '../quiz/chordProgression'

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
  const [scaleDegreeMelodyEnabled, setScaleDegreeMelodyEnabled] = useState(
    initial.scaleDegreeMelodyEnabled,
  )
  const [melodyCorrectDegrees, setMelodyCorrectDegrees] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { sessionSize, setSessionSize, sessionCompleted, beginSession, completeQuestion, finishSession, clearSessionGoal } = useSessionGoal(initial.sessionSize)
  const [chordDegrees, setChordDegrees] = useState<ChordDegree[]>([1, 6, 4, 5])
  const [currentChord, setCurrentChord] = useState<PlayedChord | null>(null)
  const [currentChordPosition, setCurrentChordPosition] = useState(-1)
  const [chordRhythm, setChordRhythm] = useState<ChordRhythm>({ bpm: 80, beatsPerChord: 4, countInBeats: 0, feel: 'breathe' })
  const [currentChordBeat, setCurrentChordBeat] = useState(0)
  const [chordCountIn, setChordCountIn] = useState(false)
  const [chordKey, setChordKey] = useState<ChordKey>('random')
  const [activeChordKeyLabel, setActiveChordKeyLabel] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const answerResolverRef = useRef<((answer: string) => void) | null>(null)
  const answerCleanupRef = useRef<(() => void) | null>(null)
  const gameStartResolverRef = useRef<(() => void) | null>(null)
  const gameStartCleanupRef = useRef<(() => void) | null>(null)
  const challengeEncouragementKeyRef = useRef(0)
  const [challengeEncouragement, setChallengeEncouragement] =
    useState<PracticeEncouragement | null>(null)
  const [correctionWrongSelection, setCorrectionWrongSelection] = useState<string | null>(null)

  const {
    loadProgress,
    loadIndeterminate,
    loadError,
    replayingQuizKey,
    ensureAudioContext,
    resetLoadingState,
    ensurePiano,
    handlePlayQuiz: replayQuizAudio,
    handlePlayMelodyQuiz: replayMelodyQuizAudio,
    handleLoadFailure,
    stopReplay,
    dispose: disposeAudio,
    setLoadProgress,
    setLoadIndeterminate,
    setLoadError,
  } = useAudioEngine()
  const {
    sessionStats,
    sessionStatsRef,
    sessionScaleDegreeMistakes,
    sessionScaleDegreeMelodyMistakes,
    resetSessionState,
    updateSessionStats,
    appendSessionScaleDegreeMistake,
    appendSessionScaleDegreeMelodyMistake,
  } = useChallengeSession()

  const {
    mistakeStoreRef,
    scaleDegreeMistakeStoreRef,
    scaleDegreeMelodyMistakeStoreRef,
    viewModel: trainingStats,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    recordScaleDegreeMelodyQuizMistake,
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

  useAutoDismiss(challengeEncouragement, 1800, () => setChallengeEncouragement(null), challengeEncouragement?.key)

  usePersistedSettings(
    speedPreset,
    settings.enabledIntervalIds,
    settings.direction,
    mode,
    scaleDegreeReviewEnabled,
    scaleDegreeMelodyEnabled,
    sessionSize,
  )

  useEffect(() => {
    // Start fetching and decoding the samples after the initial screen has painted.
    // Starting a session or replaying a quiz reuses this same in-flight promise.
    const preloadTimer = window.setTimeout(() => {
      void ensurePiano(settings).catch((error: unknown) => {
        if (!isAbortError(error)) console.warn('钢琴音色预加载失败', error)
      })
    }, 0)

    return () => window.clearTimeout(preloadTimer)
    // The initial pitch range covers every feature. Later setting changes should
    // keep using the already loaded instrument instead of starting another load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensurePiano])

  const resetMelodyProgress = useCallback(() => {
    setMelodyCorrectDegrees([])
  }, [])

  const resetChallengeAnswerState = useCallback(() => {
    answerResolverRef.current = null
    answerCleanupRef.current?.()
    answerCleanupRef.current = null
    gameStartResolverRef.current = null
    gameStartCleanupRef.current?.()
    gameStartCleanupRef.current = null
    setCorrectionWrongSelection(null)
    resetMelodyProgress()
  }, [resetMelodyProgress])

  const abortSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    stopReplay()
    resetChallengeAnswerState()
  }, [resetChallengeAnswerState, stopReplay])

  const stop = useCallback(() => {
    abortSession()
    setIsRunning(false)
    setState('idle')
    setChallengeEncouragement(null)
    setScaleDegreeGameStarted(false)
    resetLoadingState()
  }, [abortSession, resetLoadingState])

  useEffect(() => {
    return () => {
      abortSession()
      disposeAudio()
    }
  }, [abortSession, disposeAudio])

  const handleTrainerStateChange = useCallback(
    (nextState: TrainerState) => {
      if (LISTENING_STATES.includes(nextState)) {
        setChallengeEncouragement(null)
        setCorrectionWrongSelection(null)
        if (mode === 'scaleDegree' && scaleDegreeMelodyEnabled && nextState === 'playing_root') {
          resetMelodyProgress()
        }
      }
      setState(nextState)
    },
    [mode, scaleDegreeMelodyEnabled, resetMelodyProgress],
  )

  const handleMelodyNoteResolved = useCallback((noteIndex: number, degree: number, correct: boolean) => {
    if (correct) {
      setMelodyCorrectDegrees((current) => [...current, String(degree)])
    }
    void noteIndex
  }, [])

  const handleAnswerCorrectionStart = useCallback((wrongSelection: string) => {
    setCorrectionWrongSelection(wrongSelection)
  }, [])

  const waitForChallengeAnswer = (signal: AbortSignal) =>
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

  const replayBlocked = isRunning && state !== 'feedback_incorrect'

  const handlePlayQuiz = useCallback(
    (quiz: Quiz) => {
      void replayQuizAudio(quiz, settings, replayBlocked)
    },
    [replayQuizAudio, replayBlocked, settings],
  )

  const handlePlayMelodyQuiz = useCallback(
    (quiz: MelodyScaleDegreeQuiz) => {
      void replayMelodyQuizAudio(quiz, settings, replayBlocked)
    },
    [replayMelodyQuizAudio, replayBlocked, settings],
  )

  const start = useCallback(async () => {
    if (mode !== 'scaleDegree' && mode !== 'chordProgression' && settings.enabledIntervalIds.length === 0) {
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
    beginSession()
    resetChallengeAnswerState()

    if (mode === 'intervalSpeed') {
      setLastQuiz(null)
      clearNewBestRecord('intervalSpeed')
    }
    if (mode === 'scaleDegree') {
      setLastScaleDegreeQuiz(null)
      setCurrentKeyLabel(null)
      setScaleDegreeGameStarted(false)
      clearNewBestRecord(scaleDegreeMelodyEnabled ? 'scaleDegreeMelody' : 'scaleDegree')
    }

    try {
      ensureAudioContext()
      const piano = await ensurePiano(settings, controller.signal)
      resetLoadingState()

      if (mode === 'chordProgression') {
        const pitchClass = chordKey === 'random' ? Math.floor(Math.random() * 12) : chordKey
        setActiveChordKeyLabel(chordKeyLabel(pitchClass))
        await runChordProgressionLoop(piano, chordDegrees, chordRhythm, {
          onChord: (chord, position) => {
            setChordCountIn(false)
            setCurrentChord(chord)
            setCurrentChordPosition(position)
            handleTrainerStateChange('playing_harmonic')
          },
          onBeat: (beat, isCountIn) => {
            setCurrentChordBeat(beat)
            setChordCountIn(isCountIn)
          },
        }, controller.signal, 48 + pitchClass)
      } else if (mode === 'intervalSpeed') {
        await runIntervalSpeedLoop(
          piano,
          settings,
          buildIntervalSpeedLoopCallbacks({
            onStateChange: handleTrainerStateChange,
            waitForAnswer: (signal) =>
              waitForChallengeAnswer(signal).then((answer) => ({
                selectedIntervalId: answer,
              })),
            onAnswerCorrectionStart: handleAnswerCorrectionStart,
            setLastQuiz,
            recordQuizMistake,
            setEncouragement: setChallengeEncouragement,
            encouragementKeyRef: challengeEncouragementKeyRef,
            updateSessionStats,
            onQuestionCompleted: completeQuestion,
          }),
          controller.signal,
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
              waitForChallengeAnswer(signal).then((answer) => ({
                selectedDegree: answer,
              })),
            onAnswerCorrectionStart: handleAnswerCorrectionStart,
            onMelodyNoteResolved: handleMelodyNoteResolved,
            melodyEnabled: scaleDegreeMelodyEnabled,
            setLastScaleDegreeQuiz,
            recordScaleDegreeQuizMistake,
            appendSessionScaleDegreeMistake,
            recordScaleDegreeMelodyQuizMistake,
            appendSessionScaleDegreeMelodyMistake,
            setEncouragement: setChallengeEncouragement,
            encouragementKeyRef: challengeEncouragementKeyRef,
            updateSessionStats,
            getSessionStats: () => sessionStatsRef.current,
            onQuestionCompleted: completeQuestion,
          }),
          controller.signal,
          scaleDegreeMistakeStoreRef.current,
          scaleDegreeMelodyMistakeStoreRef.current,
          scaleDegreeReviewEnabled,
          scaleDegreeMelodyEnabled,
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
          finalizeChallengeSession(
            sessionStatsRef.current,
            scaleDegreeMelodyEnabled ? 'scaleDegreeMelody' : 'scaleDegree',
          )
        }

        setIsRunning(false)
        if (mode === 'intervalSpeed' || mode === 'scaleDegree') finishSession()
        setState('idle')
        setScaleDegreeGameStarted(false)
        abortRef.current = null
        resetChallengeAnswerState()
      }
    }
  }, [
    mode,
    chordDegrees,
    chordRhythm,
    chordKey,
    scaleDegreeReviewEnabled,
    scaleDegreeMelodyEnabled,
    resetChallengeAnswerState,
    resetSessionState,
    settings,
    handleTrainerStateChange,
    handleAnswerCorrectionStart,
    handleMelodyNoteResolved,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    recordScaleDegreeMelodyQuizMistake,
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
    scaleDegreeMelodyMistakeStoreRef,
    sessionStatsRef,
    beginSession,
    completeQuestion,
    finishSession,
    updateSessionStats,
    appendSessionScaleDegreeMistake,
    appendSessionScaleDegreeMelodyMistake,
  ])

  const handleToggle = useCallback(() => {
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
  }, [ensureAudioContext, isRunning, mode, scaleDegreeGameStarted, start, stop])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, button, [contenteditable="true"]')) return
      if (event.code === 'Space') {
        event.preventDefault()
        handleToggle()
        return
      }
      if (!isRunning || !/^Digit[1-9]$/.test(event.code)) return
      const digit = Number(event.code.slice(-1))
      if (mode === 'scaleDegree' && digit <= 7) handleAnswerSelect(String(digit))
      if (mode === 'intervalSpeed') {
        const answer = settings.enabledIntervalIds[digit - 1]
        if (answer) handleAnswerSelect(answer)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleAnswerSelect, handleToggle, isRunning, mode, settings.enabledIntervalIds])

  const handleScaleDegreeHome = useCallback(() => {
    setLastScaleDegreeQuiz(null)
    resetSessionState()
    clearSessionGoal()
  }, [clearSessionGoal, resetSessionState])

  const handlePracticeWeakest = useCallback(() => {
    const weakest = Object.entries(sessionStatsRef.current.byKey)
      .filter(([, value]) => value.totalCount > 0)
      .sort(([, a], [, b]) => a.correctCount / a.totalCount - b.correctCount / b.totalCount)
      .slice(0, 3)
      .map(([key]) => key)

    if (mode === 'intervalSpeed' && weakest.length > 0) {
      setSettings((current) => ({ ...current, enabledIntervalIds: weakest }))
    } else if (mode === 'scaleDegree') {
      setScaleDegreeReviewEnabled(true)
    }
    resetSessionState()
    clearSessionGoal()
  }, [clearSessionGoal, mode, resetSessionState, sessionStatsRef])

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode)
    setLastQuiz(null)
    setLastScaleDegreeQuiz(null)
    setCurrentKeyLabel(null)
    setScaleDegreeGameStarted(false)
    resetSessionState()
    clearSessionGoal()
    resetChallengeAnswerState()
    setCurrentChord(null)
    setCurrentChordPosition(-1)
    setCurrentChordBeat(0)
    setChordCountIn(false)
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
        sessionScaleDegreeMelodyMistakes={sessionScaleDegreeMelodyMistakes}
        scaleDegreeReviewEnabled={scaleDegreeReviewEnabled}
        onScaleDegreeReviewChange={setScaleDegreeReviewEnabled}
        scaleDegreeMelodyEnabled={scaleDegreeMelodyEnabled}
        onScaleDegreeMelodyChange={setScaleDegreeMelodyEnabled}
        melodyCorrectDegrees={melodyCorrectDegrees}
        sessionStats={sessionStats}
        sessionSize={sessionSize}
        sessionCompleted={sessionCompleted}
        completedQuestions={getTotalAnswerCount(sessionStats)}
        trainingStats={trainingStats}
        rootMin={settings.rootMin}
        rootMax={settings.rootMax}
        challengeEncouragement={challengeEncouragement}
        correctionWrongSelection={correctionWrongSelection}
        loadStatus={loadStatus}
        onModeChange={handleModeChange}
        onToggle={handleToggle}
        onSessionSizeChange={setSessionSize}
        onPracticeWeakest={handlePracticeWeakest}
        onOpenSettings={() => setDrawerOpen(true)}
        onAnswerSelect={handleAnswerSelect}
        replayingQuizKey={replayingQuizKey}
        isReplayBusy={replayingQuizKey !== null}
        onPlayQuiz={handlePlayQuiz}
        onPlayMelodyQuiz={handlePlayMelodyQuiz}
        onScaleDegreeHome={handleScaleDegreeHome}
        chordDegrees={chordDegrees}
        currentChord={currentChord}
        currentChordPosition={currentChordPosition}
        onChordDegreeChange={(position, degree) => setChordDegrees((current) => current.map((value, index) => index === position ? degree : value))}
        onChordDegreesChange={setChordDegrees}
        chordRhythm={chordRhythm}
        currentChordBeat={currentChordBeat}
        chordCountIn={chordCountIn}
        onChordRhythmChange={setChordRhythm}
        chordKey={chordKey}
        activeChordKeyLabel={activeChordKeyLabel}
        onChordKeyChange={setChordKey}
      />

      {mode !== 'scaleDegree' && mode !== 'chordProgression' && (
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          {...settingsControls}
        />
      )}
    </>
  )
}
