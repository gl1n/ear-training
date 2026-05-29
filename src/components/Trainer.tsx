import { useCallback, useEffect, useRef, useState } from 'react'
import { createPiano, type Piano } from '../audio/piano'
import { createAudioContext, unlockAudioContextSync } from '../audio/context'
import { getInitialSettings, usePersistedSettings } from '../hooks/usePersistedSettings'
import { INTERVALS, type IntervalDirection, type Quiz } from '../quiz/intervals'
import {
  createDefaultSettings,
  replayQuiz,
  runArcadeLoop,
  runLoop,
  stopPlayback,
  type AppMode,
  type Settings,
  type SpeedPreset,
  type TrainerState,
} from '../quiz/sequencer'
import { EMPTY_SESSION_STATS, recordResult, type SessionStats } from '../quiz/stats'
import { PracticeView } from './PracticeView'
import { SettingsDrawer } from './SettingsDrawer'

export function Trainer() {
  const initial = getInitialSettings()
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [state, setState] = useState<TrainerState>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>(initial.speedPreset)
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [lastQuiz, setLastQuiz] = useState<Quiz | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_SESSION_STATS)
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

  const [isReplayingLastQuiz, setIsReplayingLastQuiz] = useState(false)

  usePersistedSettings(speedPreset, settings.enabledIntervalIds, settings.direction, mode)

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
    resetLoadingState()
  }, [abortSession, resetLoadingState])

  useEffect(() => {
    return () => {
      abortSession()
      void audioContextRef.current?.close()
    }
  }, [abortSession])

  const waitForAnswer = useCallback((signal: AbortSignal) => {
    return new Promise<{ selectedIntervalId: string; responseTimeMs: number }>(
      (resolve, reject) => {
        const onAbort = () => {
          cleanup()
          reject(new DOMException('Aborted', 'AbortError'))
        }

        const cleanup = () => {
          signal.removeEventListener('abort', onAbort)
          answerResolverRef.current = null
          answerCleanupRef.current = null
        }

        answerResolverRef.current = (intervalId: string) => {
          cleanup()
          resolve({ selectedIntervalId: intervalId, responseTimeMs: 0 })
        }
        answerCleanupRef.current = cleanup
        signal.addEventListener('abort', onAbort)
      },
    )
  }, [])

  const handleAnswerSelect = useCallback((intervalId: string) => {
    answerResolverRef.current?.(intervalId)
  }, [])

  const handleReplayLastQuiz = useCallback(async () => {
    if (!lastQuiz || isRunning || isReplayingLastQuiz) {
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext()
    }
    unlockAudioContextSync(audioContextRef.current)

    replayAbortRef.current?.abort()
    stopPlayback(pianoRef.current)

    const controller = new AbortController()
    replayAbortRef.current = controller
    setIsReplayingLastQuiz(true)

    try {
      const ctx = audioContextRef.current
      if (!pianoRef.current) {
        pianoRef.current = await createPiano(ctx, {
          rootMin: settings.rootMin,
          rootMax: settings.rootMax,
          signal: controller.signal,
        })
      }

      await replayQuiz(pianoRef.current, lastQuiz, settings, controller.signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
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
    resetArcadeAnswerState()
    if (mode === 'arcade') {
      setLastQuiz(null)
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

      if (mode === 'arcade') {
        await runArcadeLoop(
          pianoRef.current,
          settings,
          {
            onStateChange: setState,
            waitForAnswer: (signal) => waitForAnswer(signal),
            onAnswerSubmitted: (quiz, answer, correct) => {
              setLastQuiz(quiz)
              setSessionStats((current) =>
                recordResult(current, quiz.interval.id, {
                  correct,
                  responseTimeMs: answer.responseTimeMs,
                }),
              )
            },
          },
          controller.signal,
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      console.error(error)
      pianoRef.current = null
      setLoadError(error instanceof Error ? error.message : '钢琴音色加载失败')
      setState('idle')
    } finally {
      if (abortRef.current === controller) {
        setIsRunning(false)
        setState('idle')
        abortRef.current = null
        resetArcadeAnswerState()
      }
    }
  }, [mode, resetArcadeAnswerState, resetLoadingState, settings, waitForAnswer])

  const handleToggle = () => {
    if (isRunning) {
      stop()
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext()
    }
    unlockAudioContextSync(audioContextRef.current)

    void start()
  }

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode)
    setLastQuiz(null)
    setSessionStats(EMPTY_SESSION_STATS)
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
      enabledIntervalIds: INTERVALS.map((interval) => interval.id),
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <PracticeView
        mode={mode}
        state={state}
        isRunning={isRunning}
        isLoading={state === 'loading'}
        speedPreset={speedPreset}
        enabledIntervalIds={settings.enabledIntervalIds}
        direction={settings.direction}
        lastQuiz={lastQuiz}
        sessionStats={sessionStats}
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
        speedPreset={speedPreset}
        enabledIntervalIds={settings.enabledIntervalIds}
        direction={settings.direction}
        isRunning={isRunning}
        onSpeedChange={handleSpeedChange}
        onDirectionChange={handleDirectionChange}
        onIntervalToggle={handleIntervalToggle}
        onSelectAllIntervals={handleSelectAllIntervals}
        onClearIntervals={handleClearIntervals}
        onApplyPreset={handleApplyPreset}
      />
    </div>
  )
}
