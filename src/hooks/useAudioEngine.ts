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
  const immediateSourcesRef = useRef<Set<AudioScheduledSourceNode>>(new Set())

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
    for (const source of immediateSourcesRef.current) {
      try { source.stop() } catch { /* already stopped */ }
    }
    immediateSourcesRef.current.clear()
  }, [])

  const playMidi = useCallback((midi: number) => {
    const ctx = ensureAudioContext()
    for (const source of immediateSourcesRef.current) {
      try { source.stop() } catch { /* already stopped */ }
    }
    immediateSourcesRef.current.clear()

    const startAt = ctx.currentTime
    const frequency = 440 * 2 ** ((midi - 69) / 12)
    const duration = 0.68 + Math.max(0, 60 - midi) * 0.006
    const toneFilter = ctx.createBiquadFilter()
    const compressor = ctx.createDynamicsCompressor()
    toneFilter.type = 'lowpass'
    toneFilter.frequency.value = Math.min(4_200, Math.max(1_600, frequency * 5.5))
    toneFilter.Q.value = 0.7
    compressor.threshold.value = -20
    compressor.ratio.value = 4
    toneFilter.connect(compressor).connect(ctx.destination)

    const partials = [
      [1, 0.105, 1, 0],
      [2, 0.026, 0.68, 1.5],
      [3, 0.011, 0.45, -2],
    ] as const
    partials.forEach(([ratio, level, decay, detune]) => {
      const oscillator = ctx.createOscillator()
      const partialGain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency * ratio
      oscillator.detune.value = detune
      partialGain.gain.setValueAtTime(0.0001, startAt)
      partialGain.gain.exponentialRampToValueAtTime(level, startAt + 0.008)
      partialGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration * decay)
      oscillator.connect(partialGain).connect(toneFilter)
      immediateSourcesRef.current.add(oscillator)
      oscillator.onended = () => immediateSourcesRef.current.delete(oscillator)
      oscillator.start(startAt)
      oscillator.stop(startAt + duration + 0.04)
    })

    const noiseLength = Math.ceil(ctx.sampleRate * 0.028)
    const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let sample = 0; sample < noiseLength; sample += 1) {
      noiseData[sample] = (Math.random() * 2 - 1) * (1 - sample / noiseLength)
    }
    const pickNoise = ctx.createBufferSource()
    const pickFilter = ctx.createBiquadFilter()
    const pickGain = ctx.createGain()
    pickNoise.buffer = noiseBuffer
    pickFilter.type = 'bandpass'
    pickFilter.frequency.value = Math.min(3_600, frequency * 3.2)
    pickGain.gain.setValueAtTime(0.05, startAt)
    pickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.032)
    pickNoise.connect(pickFilter).connect(pickGain).connect(compressor)
    immediateSourcesRef.current.add(pickNoise)
    pickNoise.onended = () => immediateSourcesRef.current.delete(pickNoise)
    pickNoise.start(startAt)
  }, [ensureAudioContext])

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
    playMidi,
    setLoadProgress,
    setLoadIndeterminate,
    setLoadError,
  }
}
