import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { createPiano, type Piano } from '../audio/piano'
import { createAudioContext, unlockAudioContextSync } from '../audio/context'
import { getInitialSettings, usePersistedSettings } from '../hooks/usePersistedSettings'
import { ALL_INTERVAL_IDS, type IntervalDirection, type Quiz } from '../quiz/intervals'
import {
  createDefaultSettings,
  replayQuiz,
  runArcadeLoop,
  runLoop,
  stopPlayback,
  ARCADE_SESSION_TIME_MS,
  type AppMode,
  type Settings,
  type SpeedPreset,
  type TrainerState,
} from '../quiz/sequencer'
import {
  loadArcadeBestRecord,
  tryUpdateArcadeBestRecord,
  type ArcadeBestRecord,
} from '../quiz/arcadeBestRecord'
import {
  EMPTY_SESSION_STATS,
  getCorrectAnswerCount,
  hasSessionAttempts,
  recordResult,
  type SessionStats,
} from '../quiz/stats'
import {
  loadQuizPriorities,
  saveQuizPriorities,
  type QuizPriorityStore,
} from '../quiz/quizPriority'
import { IDLE_TIP_MESSAGES } from './IdleTipToast'
import { LISTENING_STATES } from '../quiz/sequencer'
import { abortError, isAbortError } from '../utils/abort'
import type { SettingsPanelProps } from './SettingsPanel'
import { PracticeView } from './PracticeView'
import { SettingsDrawer } from './SettingsDrawer'

function ensureAudioContext(ref: RefObject<AudioContext | null>): AudioContext {
  if (!ref.current) {
    ref.current = createAudioContext()
  }
  unlockAudioContextSync(ref.current)
  return ref.current
}

export function Trainer() {
  const initial = getInitialSettings()
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [state, setState] = useState<TrainerState>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>(initial.speedPreset)
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [lastQuiz, setLastQuiz] = useState<Quiz | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_SESSION_STATS)
  const [bestRecord, setBestRecord] = useState<ArcadeBestRecord | null>(() => loadArcadeBestRecord())
  const [isNewBestRecord, setIsNewBestRecord] = useState(false)
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
  const replayAbortRef = useRef<AbortController | null>(null)
  const sessionStatsRef = useRef<SessionStats>(EMPTY_SESSION_STATS)
  const priorityStoreRef = useRef<QuizPriorityStore>(loadQuizPriorities())
  const idleTipIndexRef = useRef(0)
  const [priorityVersion, setPriorityVersion] = useState(0)
  const [idleTip, setIdleTip] = useState<string | null>(null)

  const [isReplayingLastQuiz, setIsReplayingLastQuiz] = useState(false)

  usePersistedSettings(speedPreset, settings.enabledIntervalIds, settings.direction, mode)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveQuizPriorities(priorityStoreRef.current)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [priorityVersion])

  useEffect(() => {
    if (LISTENING_STATES.includes(state)) {
      setIdleTip(null)
    }
  }, [state])

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

  const showIdleTip = useCallback(() => {
    const message = IDLE_TIP_MESSAGES[idleTipIndexRef.current % IDLE_TIP_MESSAGES.length]
    idleTipIndexRef.current += 1
    setIdleTip(message)
  }, [])

  const resetArcadeAnswerState = useCallback(() => {
    answerResolverRef.current = null
    answerCleanupRef.current?.()
    answerCleanupRef.current = null
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
    resetLoadingState()
  }, [abortSession, resetLoadingState])

  useEffect(() => {
    return () => {
      abortSession()
      void audioContextRef.current?.close()
    }
  }, [abortSession])

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

  const handleReplayLastQuiz = useCallback(async () => {
    if (!lastQuiz || isRunning || isReplayingLastQuiz) {
      return
    }

    ensureAudioContext(audioContextRef)

    replayAbortRef.current?.abort()
    stopPlayback(pianoRef.current)

    const controller = new AbortController()
    replayAbortRef.current = controller
    setIsReplayingLastQuiz(true)

    try {
      const ctx = audioContextRef.current!
      if (!pianoRef.current) {
        pianoRef.current = await createPiano(ctx, {
          rootMin: settings.rootMin,
          rootMax: settings.rootMax,
          signal: controller.signal,
        })
      }

      await replayQuiz(pianoRef.current, lastQuiz, settings, controller.signal)
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      console.error(error)
    } finally {
      if (replayAbortRef.current === controller) {
        setIsReplayingLastQuiz(false)
        replayAbortRef.current = null
      }
    }
  }, [isReplayingLastQuiz, isRunning, lastQuiz, settings])

  const start = useCallback(async () => {
    if (settings.enabledIntervalIds.length === 0) {
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
      setIsNewBestRecord(false)
      setArcadeTimedOut(false)
    }

    try {
      const ctx = audioContextRef.current
      if (!ctx) {
        throw new Error('音频未初始化，请重试')
      }

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
              setLastQuiz(quiz)
              setSessionStats((current) => {
                const next = recordResult(current, quiz.interval.id, { correct })
                sessionStatsRef.current = next
                return next
              })
            },
            onPriorityUpdated: () => {
              setPriorityVersion((version) => version + 1)
            },
            onIdleBoost: showIdleTip,
          },
          controller.signal,
          sessionDeadlineMs!,
          priorityStoreRef.current,
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
          const stats = sessionStatsRef.current
          if (hasSessionAttempts(stats)) {
            const { record, isNew } = tryUpdateArcadeBestRecord({
              correctCount: getCorrectAnswerCount(stats),
            })
            setBestRecord(record)
            setIsNewBestRecord(isNew)
          }
        }

        setIsRunning(false)
        setState('idle')
        setArcadeDeadlineMs(null)
        abortRef.current = null
        resetArcadeAnswerState()
      }
    }
  }, [mode, resetArcadeAnswerState, resetLoadingState, settings, showIdleTip, waitForAnswer])

  const handleToggle = () => {
    if (isRunning) {
      stop()
      return
    }

    ensureAudioContext(audioContextRef)

    void start()
  }

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode)
    setLastQuiz(null)
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
        sessionStats={sessionStats}
        bestRecord={bestRecord}
        isNewBestRecord={isNewBestRecord}
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
        onReplayLastQuiz={handleReplayLastQuiz}
        isReplayingLastQuiz={isReplayingLastQuiz}
      />

      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...settingsControls}
      />
    </>
  )
}
