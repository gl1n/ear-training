import { useCallback, useEffect, useRef, useState } from 'react'
import { createAudioContext, unlockAudioContextSync } from '../audio/context'
import { createPiano, type Piano } from '../audio/piano'
import { getQuizPitchKey, type Quiz } from '../quiz/intervals'
import { getMelodyScaleDegreeQuizKey, type MelodyScaleDegreeQuiz } from '../quiz/keys'
import { replayMelodyScaleDegreeQuiz, replayQuiz, stopPlayback, type Settings } from '../quiz/sequencer'
import { isAbortError } from '../utils/abort'

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const pianoRef = useRef<Piano | null>(null)
  const pianoLoadRef = useRef<Promise<Piano> | null>(null)
  const replayAbortRef = useRef<AbortController | null>(null)

  const [loadProgress, setLoadProgress] = useState<number | null>(null)
  const [loadIndeterminate, setLoadIndeterminate] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [replayingQuizKey, setReplayingQuizKey] = useState<string | null>(null)

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = createAudioContext()
      pianoRef.current = null
      pianoLoadRef.current = null
    }
    unlockAudioContextSync(audioContextRef.current)
    return audioContextRef.current
  }, [])

  const resetLoadingState = useCallback(() => {
    setLoadProgress(null)
    setLoadIndeterminate(false)
    setLoadError(null)
  }, [])

  const stopReplay = useCallback(() => {
    replayAbortRef.current?.abort()
    replayAbortRef.current = null
    stopPlayback(pianoRef.current)
  }, [])

  const dispose = useCallback(() => {
    stopReplay()
    pianoRef.current = null
    pianoLoadRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
  }, [stopReplay])

  useEffect(() => dispose, [dispose])

  const ensurePiano = useCallback(
    async (settings: Settings, signal?: AbortSignal) => {
      ensureAudioContext()

      if (pianoRef.current) return pianoRef.current
      if (pianoLoadRef.current) return await pianoLoadRef.current
      if (!pianoLoadRef.current) {
        const loading = createPiano(audioContextRef.current!, {
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
          signal,
        })
        pianoLoadRef.current = loading
        try {
          const piano = await loading
          pianoRef.current = piano
          return piano
        } finally {
          if (pianoLoadRef.current === loading) pianoLoadRef.current = null
        }
      }
      throw new Error('钢琴音色加载失败')
    },
    [ensureAudioContext],
  )

  const handlePlayQuiz = useCallback(
    async (quiz: Quiz, settings: Settings, replayBlocked: boolean) => {
      if (replayBlocked || replayingQuizKey !== null) {
        return
      }

      ensureAudioContext()
      stopReplay()

      const controller = new AbortController()
      replayAbortRef.current = controller
      const pitchKey = getQuizPitchKey(quiz)
      setReplayingQuizKey(pitchKey)

      try {
        const piano = await ensurePiano(settings, controller.signal)
        await replayQuiz(piano, quiz, settings, controller.signal)
      } catch (error) {
        if (isAbortError(error)) {
          return
        }
        console.error(error)
        setLoadError(error instanceof Error ? error.message : '播放失败，请重试')
      } finally {
        if (replayAbortRef.current === controller) {
          setReplayingQuizKey(null)
          replayAbortRef.current = null
        }
      }
    },
    [ensureAudioContext, ensurePiano, replayingQuizKey, stopReplay],
  )

  const handlePlayMelodyQuiz = useCallback(
    async (quiz: MelodyScaleDegreeQuiz, settings: Settings, replayBlocked: boolean) => {
      if (replayBlocked || replayingQuizKey !== null) {
        return
      }

      ensureAudioContext()
      stopReplay()

      const controller = new AbortController()
      replayAbortRef.current = controller
      const pitchKey = getMelodyScaleDegreeQuizKey(quiz)
      setReplayingQuizKey(pitchKey)

      try {
        const piano = await ensurePiano(settings, controller.signal)
        await replayMelodyScaleDegreeQuiz(piano, quiz, settings, controller.signal)
      } catch (error) {
        if (isAbortError(error)) {
          return
        }
        console.error(error)
        setLoadError(error instanceof Error ? error.message : '播放失败，请重试')
      } finally {
        if (replayAbortRef.current === controller) {
          setReplayingQuizKey(null)
          replayAbortRef.current = null
        }
      }
    },
    [ensureAudioContext, ensurePiano, replayingQuizKey, stopReplay],
  )

  const handleLoadFailure = useCallback((error: unknown) => {
    pianoRef.current = null
    pianoLoadRef.current = null
    setLoadError(error instanceof Error ? error.message : '钢琴音色加载失败')
  }, [])

  return {
    audioContextRef,
    pianoRef,
    replayAbortRef,
    loadProgress,
    loadIndeterminate,
    loadError,
    replayingQuizKey,
    ensureAudioContext,
    resetLoadingState,
    stopReplay,
    dispose,
    ensurePiano,
    handlePlayQuiz,
    handlePlayMelodyQuiz,
    handleLoadFailure,
    setLoadProgress,
    setLoadIndeterminate,
    setLoadError,
  }
}
