import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { createPiano, type Piano } from '../audio/piano'
import { createAudioContext, unlockAudioContextSync } from '../audio/context'
import { getInitialSettings, usePersistedSettings } from '../hooks/usePersistedSettings'
import { useTrainingStats } from '../hooks/useTrainingStats'
import { ALL_INTERVAL_IDS, type IntervalDirection, type Quiz } from '../quiz/intervals'
import type { NoteKeyQuiz } from '../quiz/keys'
import type { NoteKeyMistakeRecord, NoteKeyMistakeStatsStore } from '../quiz/noteKeyMistakeStats'
import {
  createDefaultSettings,
  replayQuiz,
  runArcadeLoop,
  runLoop,
  runNoteKeyArcadeLoop,
  stopPlayback,
  ARCADE_SESSION_TIME_MS,
  type AppMode,
  type Settings,
  type SpeedPreset,
  type TrainerState,
} from '../quiz/sequencer'
import {
  EMPTY_SESSION_STATS,
  recordNoteKeyResult,
  recordResult,
  type SessionStats,
} from '../quiz/stats'
import { getQuizPitchKey } from '../quiz/intervals'
import { IDLE_TIP_MESSAGES } from './IdleTipToast'
import { LISTENING_STATES } from '../quiz/sequencer'
import { abortError, isAbortError } from '../utils/abort'
import type { SettingsPanelProps } from './SettingsPanel'
import { PracticeView } from './PracticeView'
import { SettingsDrawer } from './SettingsDrawer'

function ensureAudioContext(
  audioRef: RefObject<AudioContext | null>,
  pianoRef?: RefObject<Piano | null>,
): AudioContext {
  if (!audioRef.current || audioRef.current.state === 'closed') {
    audioRef.current = createAudioContext()
    if (pianoRef) {
      pianoRef.current = null
    }
  }
  unlockAudioContextSync(audioRef.current)
  return audioRef.current
}

export function Trainer() {
  const initial = getInitialSettings()
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [state, setState] = useState<TrainerState>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>(initial.speedPreset)
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [lastQuiz, setLastQuiz] = useState<Quiz | null>(null)
  const [lastNoteKeyQuiz, setLastNoteKeyQuiz] = useState<NoteKeyQuiz | null>(null)
  const [currentKeyLabel, setCurrentKeyLabel] = useState<string | null>(null)
  const [noteKeyGameStarted, setNoteKeyGameStarted] = useState(false)
  const [noteKeyReviewEnabled, setNoteKeyReviewEnabled] = useState(initial.noteKeyReviewEnabled)
  const [sessionNoteKeyMistakes, setSessionNoteKeyMistakes] = useState<NoteKeyMistakeStatsStore>(
    [],
  )
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_SESSION_STATS)
  const [arcadeDeadlineMs, setArcadeDeadlineMs] = useState<number | null>(null)
  const [arcadeTimedOut, setArcadeTimedOut] = useState(false)
  const [loadProgress, setLoadProgress] = useState<number | null>(null)
  const [loadIndeterminate, setLoadIndeterminate] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const pianoRef = useRef<Piano | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const answerResolverRef = useRef<((intervalId: string) => void) | null>(null)
  const answerCleanupRef = useRef<(() => void) | null>(null)
  const gameStartResolverRef = useRef<(() => void) | null>(null)
  const gameStartCleanupRef = useRef<(() => void) | null>(null)
  const replayAbortRef = useRef<AbortController | null>(null)
  const sessionStatsRef = useRef<SessionStats>(EMPTY_SESSION_STATS)
  const idleTipIndexRef = useRef(0)
  const [idleTip, setIdleTip] = useState<string | null>(null)

  const {
    mistakeStoreRef,
    noteKeyMistakeStoreRef,
    viewModel: trainingStats,
    recordQuizMistake,
    recordNoteKeyQuizMistake,
    clearNewBestRecord,
    finalizeArcadeSession,
  } = useTrainingStats({
    direction: settings.direction,
    enabledIntervalIds: settings.enabledIntervalIds,
  })

  const [replayingQuizKey, setReplayingQuizKey] = useState<string | null>(null)

  useEffect(() => {
    if (LISTENING_STATES.includes(state)) {
      setIdleTip(null)
    }
  }, [state])

  useEffect(() => {
    if (
      mode !== 'noteKey' ||
      !isRunning ||
      noteKeyGameStarted ||
      state !== 'idle' ||
      currentKeyLabel === null ||
      !gameStartResolverRef.current
    ) {
      return
    }

    gameStartResolverRef.current()
  }, [mode, isRunning, noteKeyGameStarted, state, currentKeyLabel])

  useEffect(() => {
    if (!idleTip) {
      return
    }

    const timeoutId = setTimeout(() => {
      setIdleTip(null)
    }, 2500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [idleTip])

  usePersistedSettings(
    speedPreset,
    settings.enabledIntervalIds,
    settings.direction,
    mode,
    noteKeyReviewEnabled,
  )

  const showIdleTip = useCallback(() => {
    const message = IDLE_TIP_MESSAGES[idleTipIndexRef.current % IDLE_TIP_MESSAGES.length]
    idleTipIndexRef.current += 1
    setIdleTip(message)
  }, [])

  const resetArcadeAnswerState = useCallback(() => {
    answerResolverRef.current = null
    answerCleanupRef.current?.()
    answerCleanupRef.current = null
    gameStartResolverRef.current = null
    gameStartCleanupRef.current?.()
    gameStartCleanupRef.current = null
  }, [])

  const resetLoadingState = useCallback(() => {
    setLoadProgress(null)
    setLoadIndeterminate(false)
    setLoadError(null)
  }, [])

  const abortSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    replayAbortRef.current?.abort()
    replayAbortRef.current = null
    resetArcadeAnswerState()
    stopPlayback(pianoRef.current)
  }, [resetArcadeAnswerState])

  const stop = useCallback(() => {
    abortSession()
    setIsRunning(false)
    setState('idle')
    setArcadeDeadlineMs(null)
    setIdleTip(null)
    setNoteKeyGameStarted(false)
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

  const waitForGameStart = useCallback((signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        cleanup()
        reject(abortError())
      }

      const cleanup = () => {
        signal.removeEventListener('abort', onAbort)
        gameStartResolverRef.current = null
        gameStartCleanupRef.current = null
      }

      gameStartResolverRef.current = () => {
        cleanup()
        setNoteKeyGameStarted(true)
        resolve()
      }
      gameStartCleanupRef.current = cleanup
      signal.addEventListener('abort', onAbort)
    })
  }, [])

  const waitForNoteKeyAnswer = useCallback((signal: AbortSignal) => {
    return new Promise<{ selectedDegree: string; timedOut?: boolean }>((resolve, reject) => {
      const onAbort = () => {
        cleanup()
        reject(abortError())
      }

      const cleanup = () => {
        signal.removeEventListener('abort', onAbort)
        answerResolverRef.current = null
        answerCleanupRef.current = null
      }

      answerResolverRef.current = (degree: string) => {
        cleanup()
        resolve({ selectedDegree: degree })
      }
      answerCleanupRef.current = cleanup
      signal.addEventListener('abort', onAbort)
    })
  }, [])

  const waitForAnswer = useCallback((signal: AbortSignal, timeoutMs: number) => {
    return new Promise<{ selectedIntervalId: string; timedOut?: boolean }>((resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        const onAbort = () => {
          cleanup()
          reject(abortError())
        }

        const cleanup = () => {
          signal.removeEventListener('abort', onAbort)
          if (timeoutId !== null) {
            clearTimeout(timeoutId)
          }
          answerResolverRef.current = null
          answerCleanupRef.current = null
        }

        answerResolverRef.current = (intervalId: string) => {
          cleanup()
          resolve({ selectedIntervalId: intervalId })
        }
        answerCleanupRef.current = cleanup
        signal.addEventListener('abort', onAbort)

        if (timeoutMs <= 0) {
          cleanup()
          resolve({ selectedIntervalId: '', timedOut: true })
          return
        }

        timeoutId = setTimeout(() => {
          cleanup()
          resolve({ selectedIntervalId: '', timedOut: true })
        }, timeoutMs)
    })
  }, [])

  const handleAnswerSelect = useCallback((intervalId: string) => {
    answerResolverRef.current?.(intervalId)
  }, [])

  const handlePlayQuiz = useCallback(
    async (quiz: Quiz) => {
      if (isRunning || replayingQuizKey !== null) {
        return
      }

      ensureAudioContext(audioContextRef, pianoRef)

      replayAbortRef.current?.abort()
      stopPlayback(pianoRef.current)

      const controller = new AbortController()
      replayAbortRef.current = controller
      const pitchKey = getQuizPitchKey(quiz)
      setReplayingQuizKey(pitchKey)

      try {
        const ctx = audioContextRef.current!
        if (!pianoRef.current) {
          pianoRef.current = await createPiano(ctx, {
            rootMin: settings.rootMin,
            rootMax: settings.rootMax,
            signal: controller.signal,
          })
        }

        await replayQuiz(pianoRef.current, quiz, settings, controller.signal)
      } catch (error) {
        if (isAbortError(error)) {
          return
        }
        console.error(error)
      } finally {
        if (replayAbortRef.current === controller) {
          setReplayingQuizKey(null)
          replayAbortRef.current = null
        }
      }
    },
    [isRunning, replayingQuizKey, settings],
  )

  const start = useCallback(async () => {
    if (mode !== 'noteKey' && settings.enabledIntervalIds.length === 0) {
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setIsRunning(true)
    setState('loading')
    setLoadProgress(0)
    setLoadIndeterminate(false)
    setLoadError(null)
    setSessionStats(EMPTY_SESSION_STATS)
    sessionStatsRef.current = EMPTY_SESSION_STATS
    resetArcadeAnswerState()
    if (mode === 'arcade') {
      setLastQuiz(null)
      clearNewBestRecord('interval')
      setArcadeTimedOut(false)
    }
    if (mode === 'noteKey') {
      setLastNoteKeyQuiz(null)
      setCurrentKeyLabel(null)
      setNoteKeyGameStarted(false)
      setSessionNoteKeyMistakes([])
      clearNewBestRecord('noteKey')
    }

    try {
      ensureAudioContext(audioContextRef, pianoRef)

      const ctx = audioContextRef.current!

      if (!pianoRef.current) {
        pianoRef.current = await createPiano(ctx, {
          rootMin: settings.rootMin,
          rootMax: settings.rootMax,
          onLoadProgress: (loaded, total) => {
            setLoadIndeterminate(false)
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0
            setLoadProgress(percent)
          },
          onLoadingIndeterminate: () => {
            setLoadProgress(null)
            setLoadIndeterminate(true)
          },
          signal: controller.signal,
        })
      }

      resetLoadingState()

      const sessionDeadlineMs =
        mode === 'arcade' ? performance.now() + ARCADE_SESSION_TIME_MS : null
      if (sessionDeadlineMs !== null) {
        setArcadeDeadlineMs(sessionDeadlineMs)
      }

      if (mode === 'arcade') {
        await runArcadeLoop(
          pianoRef.current,
          settings,
          {
            onStateChange: setState,
            waitForAnswer: (signal, timeoutMs) => waitForAnswer(signal, timeoutMs),
            onAnswerSubmitted: (quiz, answer, correct) => {
              if (answer.timedOut) {
                setArcadeTimedOut(true)
              }
              if (!correct && !answer.timedOut) {
                recordQuizMistake(quiz)
              }
              setLastQuiz(quiz)
              setSessionStats((current) => {
                const next = recordResult(current, quiz.interval.id, { correct })
                sessionStatsRef.current = next
                return next
              })
            },
            onIdleBoost: (quiz) => {
              recordQuizMistake(quiz)
              showIdleTip()
            },
          },
          controller.signal,
          sessionDeadlineMs!,
          mistakeStoreRef.current,
        )
      } else if (mode === 'noteKey') {
        await runNoteKeyArcadeLoop(
          pianoRef.current,
          settings,
          {
            onStateChange: setState,
            onSessionStart: (session) => {
              setCurrentKeyLabel(session.label)
            },
            waitForGameStart: (signal) => waitForGameStart(signal),
            waitForAnswer: (signal) => waitForNoteKeyAnswer(signal),
            onAnswerSubmitted: (quiz, answer, correct) => {
              setLastNoteKeyQuiz(quiz)
              if (
                !correct &&
                !answer.timedOut &&
                answer.selectedDegree !== '' &&
                answer.selectedDegree !== String(quiz.degree)
              ) {
                const record: NoteKeyMistakeRecord = {
                  previousNoteMidi: quiz.previousNoteMidi,
                  correctDegree: quiz.degree,
                  wrongDegree: answer.selectedDegree,
                }
                recordNoteKeyQuizMistake(record)
                setSessionNoteKeyMistakes((current) => [...current, record])
              }
              setSessionStats((current) => {
                const next = recordNoteKeyResult(current, String(quiz.degree), {
                  correct,
                  reactionMs: answer.reactionMs,
                })
                sessionStatsRef.current = next
                return next
              })
            },
            getSessionStats: () => sessionStatsRef.current,
          },
          controller.signal,
          noteKeyMistakeStoreRef.current,
          noteKeyReviewEnabled,
        )
      } else {
        await runLoop(
          pianoRef.current,
          settings,
          {
            onStateChange: setState,
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
      pianoRef.current = null
      setLoadError(error instanceof Error ? error.message : '钢琴音色加载失败')
      setState('idle')
    } finally {
      if (abortRef.current === controller) {
        if (mode === 'arcade') {
          finalizeArcadeSession(sessionStatsRef.current, 'interval')
        }
        if (mode === 'noteKey') {
          finalizeArcadeSession(sessionStatsRef.current, 'noteKey')
        }

        setIsRunning(false)
        setState('idle')
        setArcadeDeadlineMs(null)
        setNoteKeyGameStarted(false)
        abortRef.current = null
        resetArcadeAnswerState()
      }
    }
  }, [mode, noteKeyReviewEnabled, resetArcadeAnswerState, resetLoadingState, settings, showIdleTip, waitForAnswer, waitForGameStart, waitForNoteKeyAnswer, recordQuizMistake, recordNoteKeyQuizMistake, finalizeArcadeSession, clearNewBestRecord])

  const handleToggle = () => {
    if (isRunning && mode === 'noteKey' && !noteKeyGameStarted) {
      stop()
      return
    }

    if (isRunning) {
      stop()
      return
    }

    ensureAudioContext(audioContextRef, pianoRef)

    void start()
  }

  const handleNoteKeyHome = useCallback(() => {
    setLastNoteKeyQuiz(null)
    setSessionStats(EMPTY_SESSION_STATS)
    sessionStatsRef.current = EMPTY_SESSION_STATS
    setSessionNoteKeyMistakes([])
  }, [])

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode)
    setLastQuiz(null)
    setLastNoteKeyQuiz(null)
    setCurrentKeyLabel(null)
    setNoteKeyGameStarted(false)
    setSessionStats(EMPTY_SESSION_STATS)
    setArcadeTimedOut(false)
    resetArcadeAnswerState()
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

  return (
    <>
      <PracticeView
        mode={mode}
        state={state}
        isRunning={isRunning}
        isLoading={state === 'loading'}
        settingsControls={settingsControls}
        lastQuiz={lastQuiz}
        lastNoteKeyQuiz={lastNoteKeyQuiz}
        currentKeyLabel={currentKeyLabel}
        noteKeyGameStarted={noteKeyGameStarted}
        sessionNoteKeyMistakes={sessionNoteKeyMistakes}
        noteKeyReviewEnabled={noteKeyReviewEnabled}
        onNoteKeyReviewChange={setNoteKeyReviewEnabled}
        sessionStats={sessionStats}
        trainingStats={trainingStats}
        rootMin={settings.rootMin}
        rootMax={settings.rootMax}
        arcadeDeadlineMs={arcadeDeadlineMs}
        arcadeTimedOut={arcadeTimedOut}
        idleTip={idleTip}
        loadProgress={loadProgress}
        loadIndeterminate={loadIndeterminate}
        loadError={loadError}
        onModeChange={handleModeChange}
        onToggle={handleToggle}
        onOpenSettings={() => setDrawerOpen(true)}
        onRetry={handleToggle}
        onAnswerSelect={handleAnswerSelect}
        replayingQuizKey={replayingQuizKey}
        isReplayBusy={replayingQuizKey !== null}
        onPlayQuiz={handlePlayQuiz}
        onNoteKeyHome={handleNoteKeyHome}
      />

      {mode !== 'noteKey' && (
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          {...settingsControls}
        />
      )}
    </>
  )
}
