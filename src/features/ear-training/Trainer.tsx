import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioEngine } from '../../hooks/useAudioEngine'
import { useAutoDismiss } from './hooks/useAutoDismiss'
import { useChallengeSession } from './hooks/useChallengeSession'
import { getInitialSettings, usePersistedSettings } from './hooks/usePersistedSettings'
import { useTrainingStats } from './hooks/useTrainingStats'
import { useSessionGoal } from './hooks/useSessionGoal'
import type { Quiz } from '../../quiz/intervals'
import type { SequenceScaleDegreeQuiz } from '../../quiz/keys'
import { getTotalAnswerCount } from '../../quiz/stats'
import { createAnswerWaiter } from '../../quiz/createAnswerWaiter'
import {
  LISTENING_STATES,
  isIntervalMode,
  type AppMode,
  type TrainerState,
} from '../../quiz/sequencer'
import { isAbortError } from '../../utils/abort'
import type { SettingsPanelProps } from './components/SettingsPanel'
import { PracticeView } from './PracticeView'
import type { PracticeEncouragement } from './components/practice/types'
import { SettingsDrawer } from './components/SettingsDrawer'
import { getChordDegreesForRange } from '../../quiz/chordDegreeQuiz'
import { useChordProgressionPractice } from './hooks/useChordProgressionPractice'
import { useChordDegreePractice } from './hooks/useChordDegreePractice'
import { useIntervalPractice } from './hooks/useIntervalPractice'
import { useScaleDegreePractice } from './hooks/useScaleDegreePractice'

export function Trainer() {
  const initial = getInitialSettings()
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [state, setState] = useState<TrainerState>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const { sessionSize, setSessionSize, sessionCompleted, beginSession, completeQuestion, finishSession, clearSessionGoal } = useSessionGoal(initial.sessionSize)
  const {
    chordDegrees,
    currentChord,
    currentChordPosition,
    chordRhythm,
    currentChordBeat,
    chordCountIn,
    chordKey,
    activeChordKeyLabel,
    chordMelodyEnabled,
    chordPlaybackMode,
    randomChordSettings,
    setChordDegrees,
    setChordRhythm,
    setChordKey,
    setChordMelodyEnabled,
    setChordPlaybackMode,
    setRandomChordSettings,
    changeChordDegree,
    resetPlayback: resetChordProgressionPlayback,
    run: runChordProgressionPractice,
  } = useChordProgressionPractice(initial)
  const abortRef = useRef<AbortController | null>(null)
  const answerResolverRef = useRef<((answer: string) => void) | null>(null)
  const answerCleanupRef = useRef<(() => void) | null>(null)
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
    playMidi,
  } = useAudioEngine()
  const {
    speedPreset,
    settings,
    lastQuiz,
    drawerOpen,
    setDrawerOpen,
    resetQuiz: resetIntervalQuiz,
    playQuiz: playIntervalQuiz,
    runSpeedChallenge: runIntervalSpeedChallenge,
    runFollow: runIntervalFollowPractice,
    practiceWeakest: practiceWeakestIntervals,
    changeSpeed: handleSpeedChange,
    toggleInterval: handleIntervalToggle,
    selectAllIntervals: handleSelectAllIntervals,
    clearIntervals: handleClearIntervals,
    applyPreset: handleApplyPreset,
    changeDirection: handleDirectionChange,
  } = useIntervalPractice(initial, { replayQuiz: replayQuizAudio })
  const {
    lastQuiz: lastScaleDegreeQuiz,
    currentQuiz: currentScaleDegreeQuiz,
    currentKeyLabel,
    gameStarted: scaleDegreeGameStarted,
    reviewEnabled: scaleDegreeReviewEnabled,
    trainingMode: scaleDegreeTrainingMode,
    degreePractice,
    questionId: degreeQuestionId,
    melodyCorrectDegrees,
    setReviewEnabled: setScaleDegreeReviewEnabled,
    setTrainingMode: setScaleDegreeTrainingMode,
    setDegreePractice,
    prepareStart: prepareScaleDegreeStart,
    resetTransientState: resetScaleDegreeTransientState,
    resetMode: resetScaleDegreeMode,
    stop: stopScaleDegree,
    handleStateChange: handleScaleDegreeStateChange,
    run: runScaleDegreePractice,
    finalize: finalizeScaleDegreePractice,
    playMelodyQuiz: playScaleDegreeMelodyQuiz,
    replayCurrentMelody: handleReplayCurrentMelody,
    playDo: handlePlayScaleDegreeDo,
    answerForDigit: scaleDegreeAnswerForDigit,
  } = useScaleDegreePractice(
    initial,
    { settings, replayMelodyQuiz: replayMelodyQuizAudio, playMidi },
    { active: mode === 'scaleDegree', isRunning, state },
  )
  const {
    quiz: chordDegreeQuiz,
    history: chordDegreeHistory,
    key: chordDegreeKey,
    range: chordDegreeRange,
    customDegrees: chordDegreeCustomDegrees,
    inversionMode: chordDegreeInversionMode,
    replayCount: chordDegreeReplayCount,
    setKey: setChordDegreeKey,
    setRange: setChordDegreeRange,
    setCustomDegrees: setChordDegreeCustomDegrees,
    setInversionMode: setChordDegreeInversionMode,
    cancelReplay: cancelChordDegreeReplay,
    resetQuiz: resetChordDegreeQuiz,
    run: runChordDegreePractice,
    playDo: handlePlayChordDo,
    playQuiz: handlePlayChordQuiz,
    playSequence: handlePlayChordSequence,
    playSelected: handlePlaySelectedChord,
    playComparison: handlePlayChordComparison,
    applyPreset: handleApplyChordDegreePreset,
  } = useChordDegreePractice(initial, {
    settings,
    correctionWrongSelection,
    ensureAudioContext,
    ensurePiano,
    handleLoadFailure,
  })
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
    scaleDegreeMelodyMistakeStoreRef,
    viewModel: trainingStats,
    recordQuizMistake,
    recordScaleDegreeQuizMistake,
    recordScaleDegreeMelodyQuizMistake,
    clearNewBestRecord,
    finalizeChallengeSession,
    finalizeDegreePractice,
  } = useTrainingStats()

  useAutoDismiss(challengeEncouragement, 1800, () => setChallengeEncouragement(null), challengeEncouragement?.key)

  usePersistedSettings({
    speedPreset,
    enabledIntervalIds: settings.enabledIntervalIds,
    direction: settings.direction,
    mode,
    scaleDegreeReviewEnabled,
    scaleDegreeTrainingMode,
    degreePractice,
    sessionSize,
    chordDegrees,
    chordRhythm,
    chordKey,
    chordMelodyEnabled,
    chordPlaybackMode,
    randomChordSettings,
    chordDegreeKey,
    chordDegreeRange,
    chordDegreeCustomDegrees,
    chordDegreeInversionMode,
  })

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
  }, [ensurePiano, mode, settings])

  const resetChallengeAnswerState = useCallback(() => {
    answerResolverRef.current = null
    answerCleanupRef.current?.()
    answerCleanupRef.current = null
    setCorrectionWrongSelection(null)
    resetScaleDegreeTransientState()
  }, [resetScaleDegreeTransientState])

  const abortSession = useCallback(() => {
    cancelChordDegreeReplay()
    abortRef.current?.abort()
    abortRef.current = null
    stopReplay()
    resetChallengeAnswerState()
  }, [cancelChordDegreeReplay, resetChallengeAnswerState, stopReplay])

  const stop = useCallback(() => {
    abortSession()
    setIsRunning(false)
    setState('idle')
    setChallengeEncouragement(null)
    stopScaleDegree()
    resetLoadingState()
  }, [abortSession, resetLoadingState, stopScaleDegree])

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
        if (mode === 'scaleDegree') handleScaleDegreeStateChange(nextState)
      }
      setState(nextState)
    },
    [handleScaleDegreeStateChange, mode],
  )

  const handleAnswerCorrectionStart = useCallback((wrongSelection: string) => {
    setCorrectionWrongSelection(wrongSelection)
  }, [])

  const waitForChallengeAnswer = (signal: AbortSignal) =>
    createAnswerWaiter({ answerResolverRef, answerCleanupRef })(signal)

  const handleAnswerSelect = useCallback((answer: string) => {
    answerResolverRef.current?.(answer)
  }, [])

  const replayBlocked = isRunning && state !== 'feedback_incorrect'

  const handlePlayQuiz = useCallback(
    (quiz: Quiz) => {
      playIntervalQuiz(quiz, replayBlocked)
    },
    [playIntervalQuiz, replayBlocked],
  )

  const handlePlayMelodyQuiz = useCallback(
    (quiz: SequenceScaleDegreeQuiz) => {
      playScaleDegreeMelodyQuiz(quiz, replayBlocked)
    },
    [playScaleDegreeMelodyQuiz, replayBlocked],
  )

  const start = useCallback(async () => {
    if (mode !== 'scaleDegree' && mode !== 'chordDegree' && mode !== 'chordProgression' && settings.enabledIntervalIds.length === 0) {
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
      resetIntervalQuiz()
      clearNewBestRecord('intervalSpeed')
    }
    if (mode === 'scaleDegree') {
      prepareScaleDegreeStart(clearNewBestRecord)
    }
    if (mode === 'chordDegree') resetChordDegreeQuiz()

    try {
      ensureAudioContext()
      const piano = await ensurePiano(settings, controller.signal)
      resetLoadingState()

      if (mode === 'chordDegree') {
        await runChordDegreePractice({
          piano,
          signal: controller.signal,
          onStateChange: handleTrainerStateChange,
          waitForAnswer: waitForChallengeAnswer,
          onAnswerCorrectionStart: handleAnswerCorrectionStart,
          getSessionStats: () => sessionStatsRef.current,
          updateSessionStats,
          completeQuestion,
        })
      } else if (mode === 'chordProgression') {
        await runChordProgressionPractice(piano, controller.signal, handleTrainerStateChange)
      } else if (mode === 'intervalSpeed') {
        await runIntervalSpeedChallenge({
          piano,
          signal: controller.signal,
          onStateChange: handleTrainerStateChange,
          waitForAnswer: waitForChallengeAnswer,
          onAnswerCorrectionStart: handleAnswerCorrectionStart,
          recordQuizMistake,
          setEncouragement: setChallengeEncouragement,
          encouragementKeyRef: challengeEncouragementKeyRef,
          updateSessionStats,
          onQuestionCompleted: completeQuestion,
          mistakeStore: mistakeStoreRef.current,
        })
      } else if (mode === 'scaleDegree') {
        await runScaleDegreePractice({
          piano,
          signal: controller.signal,
          waitForAnswer: waitForChallengeAnswer,
          onStateChange: handleTrainerStateChange,
          onAnswerCorrectionStart: handleAnswerCorrectionStart,
          recordScaleDegreeQuizMistake,
          appendSessionScaleDegreeMistake,
          recordScaleDegreeMelodyQuizMistake,
          setEncouragement: setChallengeEncouragement,
          encouragementKeyRef: challengeEncouragementKeyRef,
          updateSessionStats,
          getSessionStats: () => sessionStatsRef.current,
          completeQuestion,
          mistakeStore: scaleDegreeMistakeStoreRef.current,
          melodyMistakeStore: scaleDegreeMelodyMistakeStoreRef.current,
        })
      } else {
        await runIntervalFollowPractice(
          piano,
          controller.signal,
          handleTrainerStateChange,
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
          finalizeScaleDegreePractice({
            sessionStats: sessionStatsRef.current,
            finalizeChallengeSession,
            finalizeDegreePractice,
          })
        }

        setIsRunning(false)
        if (mode === 'intervalSpeed' || mode === 'scaleDegree' || mode === 'chordDegree') finishSession()
        setState('idle')
        abortRef.current = null
        resetChallengeAnswerState()
      }
    }
  }, [
    mode,
    resetIntervalQuiz,
    runIntervalSpeedChallenge,
    runIntervalFollowPractice,
    runChordProgressionPractice,
    resetChordDegreeQuiz,
    runChordDegreePractice,
    prepareScaleDegreeStart,
    runScaleDegreePractice,
    finalizeScaleDegreePractice,
    finalizeDegreePractice,
    resetChallengeAnswerState,
    resetSessionState,
    settings,
    handleTrainerStateChange,
    handleAnswerCorrectionStart,
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
      if (mode === 'scaleDegree' && !replayingQuizKey && state !== 'answer_revealed') {
        const answer = scaleDegreeAnswerForDigit(digit)
        if (answer) handleAnswerSelect(answer)
      }
      if (mode === 'chordDegree') {
        const enabledDegrees = getChordDegreesForRange(chordDegreeRange, chordDegreeCustomDegrees)
        if (enabledDegrees.some((degree) => degree === digit)) handleAnswerSelect(String(digit))
      }
      if (mode === 'intervalSpeed') {
        const answer = settings.enabledIntervalIds[digit - 1]
        if (answer) handleAnswerSelect(answer)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [chordDegreeCustomDegrees, chordDegreeRange, handleAnswerSelect, handleToggle, isRunning, mode, replayingQuizKey, scaleDegreeAnswerForDigit, settings.enabledIntervalIds, state])

  const handleScaleDegreeHome = useCallback(() => {
    resetScaleDegreeMode()
    resetSessionState()
    clearSessionGoal()
  }, [clearSessionGoal, resetScaleDegreeMode, resetSessionState])

  const handlePracticeWeakest = useCallback(() => {
    if (mode === 'intervalSpeed') {
      practiceWeakestIntervals(sessionStatsRef.current)
    } else if (mode === 'scaleDegree') {
      setScaleDegreeReviewEnabled(true)
    }
    resetSessionState()
    clearSessionGoal()
  }, [clearSessionGoal, mode, practiceWeakestIntervals, resetSessionState, sessionStatsRef, setScaleDegreeReviewEnabled])

  const handleModeChange = (nextMode: AppMode) => {
    stopReplay()
    setMode(nextMode)
    resetIntervalQuiz()
    resetScaleDegreeMode()
    resetSessionState()
    clearSessionGoal()
    resetChallengeAnswerState()
    resetChordProgressionPlayback()
    resetChordDegreeQuiz()
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
        currentScaleDegreeQuiz={currentScaleDegreeQuiz}
        currentKeyLabel={currentKeyLabel}
        scaleDegreeGameStarted={scaleDegreeGameStarted}
        sessionScaleDegreeMistakes={sessionScaleDegreeMistakes}
        scaleDegreeReviewEnabled={scaleDegreeReviewEnabled}
        onScaleDegreeReviewChange={setScaleDegreeReviewEnabled}
        scaleDegreeTrainingMode={scaleDegreeTrainingMode}
        onScaleDegreeTrainingModeChange={setScaleDegreeTrainingMode}
        degreePractice={degreePractice}
        onDegreePracticeChange={setDegreePractice}
        degreeQuestionId={degreeQuestionId}
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
        onReplayCurrentMelody={handleReplayCurrentMelody}
        onPlayScaleDegreeDo={handlePlayScaleDegreeDo}
        onScaleDegreeHome={handleScaleDegreeHome}
        chordDegrees={chordDegrees}
        currentChord={currentChord}
        currentChordPosition={currentChordPosition}
        onChordDegreeChange={changeChordDegree}
        onChordDegreesChange={setChordDegrees}
        chordRhythm={chordRhythm}
        currentChordBeat={currentChordBeat}
        chordCountIn={chordCountIn}
        onChordRhythmChange={setChordRhythm}
        chordKey={chordKey}
        activeChordKeyLabel={activeChordKeyLabel}
        onChordKeyChange={setChordKey}
        chordMelodyEnabled={chordMelodyEnabled}
        onChordMelodyEnabledChange={setChordMelodyEnabled}
        chordPlaybackMode={chordPlaybackMode}
        onChordPlaybackModeChange={setChordPlaybackMode}
        randomChordSettings={randomChordSettings}
        onRandomChordSettingsChange={setRandomChordSettings}
        chordDegreeQuiz={chordDegreeQuiz}
        chordDegreeHistory={chordDegreeHistory}
        chordDegreeKey={chordDegreeKey}
        onChordDegreeKeyChange={setChordDegreeKey}
        onPlayChordDo={handlePlayChordDo}
        chordDegreeRange={chordDegreeRange}
        chordDegreeCustomDegrees={chordDegreeCustomDegrees}
        chordDegreeInversionMode={chordDegreeInversionMode}
        chordDegreeReplayCount={chordDegreeReplayCount}
        onChordDegreeRangeChange={setChordDegreeRange}
        onChordDegreeCustomDegreesChange={setChordDegreeCustomDegrees}
        onChordDegreeInversionModeChange={setChordDegreeInversionMode}
        onApplyChordDegreePreset={handleApplyChordDegreePreset}
        onPlayChordQuiz={handlePlayChordQuiz}
        onPlayChordSequence={handlePlayChordSequence}
        onPlaySelectedChord={handlePlaySelectedChord}
        onPlayChordComparison={handlePlayChordComparison}
      />

      {isIntervalMode(mode) && (
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          {...settingsControls}
        />
      )}
    </>
  )
}
