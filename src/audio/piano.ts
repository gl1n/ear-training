import { Soundfont, SplendidGrandPiano, type Smplr } from 'smplr'
import { isSafari, unlockAudioContext } from './context'
import { waitForAbort } from '../utils/abort'
import { isAbortError } from '../utils/abort'

const PIANO_CDN =
  'https://cdn.jsdelivr.net/gh/smpldsnds/sfzinstruments-splendid-grand-piano@master/samples'

const LOAD_TIMEOUT_MS = 60_000
const MAX_INTERVAL_SEMITONES = 12

export type Piano = {
  playNote: (midi: number, durationSec: number, velocity?: number, time?: number) => Promise<void>
  playNotes: (midis: number[], durationSec: number, velocity?: number, time?: number) => Promise<void>
  stop: () => void
}

type PianoLoadOptions = {
  rootMin: number
  rootMax: number
  onLoadProgress?: (loaded: number, total: number) => void
  onLoadingIndeterminate?: () => void
  signal?: AbortSignal
}

function buildNotesToLoad(rootMin: number, rootMax: number): number[] {
  const notes: number[] = []
  for (let midi = rootMin; midi <= rootMax + MAX_INTERVAL_SEMITONES; midi++) {
    notes.push(midi)
  }
  return notes
}

function mapLoadProgress(onLoadProgress?: (loaded: number, total: number) => void) {
  return onLoadProgress
    ? (progress: { loaded: number; total: number }) => onLoadProgress(progress.loaded, progress.total)
    : undefined
}

function waitWithTimeout<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  let timeoutId: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('钢琴音色加载超时，请检查网络后重试'))
    }, LOAD_TIMEOUT_MS)
  })

  const racers: Promise<T | never>[] = [promise, timeout]
  if (signal) {
    racers.push(waitForAbort(signal))
  }

  return Promise.race(racers).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })
}

function wrapInstrument(ctx: AudioContext, piano: Smplr): Piano {
  return {
    async playNote(midi: number, durationSec: number, velocity = 80, time?: number) {
      await unlockAudioContext(ctx)
      piano.start({ note: midi, velocity, duration: durationSec, ampRelease: 0.08, time })
    },
    async playNotes(midis: number[], durationSec: number, velocity = 80, time?: number) {
      await unlockAudioContext(ctx)
      for (const midi of midis) {
        piano.start({ note: midi, velocity, duration: durationSec, ampRelease: 0.08, time })
      }
    },
    stop() {
      piano.stop()
    },
  }
}

function createSynthFallback(ctx: AudioContext): Piano {
  const active = new Set<OscillatorNode>()
  const play = async (midi: number, durationSec: number, velocity = 80, time?: number) => {
    await unlockAudioContext(ctx)
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = time ?? ctx.currentTime
    const volume = Math.max(0.025, Math.min(0.12, velocity / 900))
    oscillator.type = 'triangle'
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.08, durationSec))
    oscillator.connect(gain).connect(ctx.destination)
    active.add(oscillator)
    oscillator.onended = () => active.delete(oscillator)
    oscillator.start(now)
    oscillator.stop(now + Math.max(0.1, durationSec) + 0.03)
  }
  return {
    playNote: play,
    async playNotes(midis, durationSec, velocity, time) {
      await Promise.all(midis.map((midi) => play(midi, durationSec, velocity, time)))
    },
    stop() {
      for (const oscillator of active) {
        try { oscillator.stop() } catch { /* already stopped */ }
      }
      active.clear()
    },
  }
}

async function loadInstrument(
  ctx: AudioContext,
  options: PianoLoadOptions,
  create: (
    ctx: AudioContext,
    onLoadProgress: ReturnType<typeof mapLoadProgress>,
  ) => Smplr,
  beforeCreate?: () => void,
): Promise<Piano> {
  const { signal } = options
  beforeCreate?.()
  const piano = create(ctx, mapLoadProgress(options.onLoadProgress))
  await waitWithTimeout(piano.ready, signal)
  return wrapInstrument(ctx, piano)
}

export async function createPiano(ctx: AudioContext, options: PianoLoadOptions): Promise<Piano> {
  try {
    if (isSafari()) {
      return await loadInstrument(ctx, options, (audioCtx, onLoadProgress) =>
        Soundfont(audioCtx, { instrument: 'acoustic_grand_piano', onLoadProgress }),
      () => options.onLoadingIndeterminate?.())
    }
    const { rootMin, rootMax } = options
    return await loadInstrument(ctx, options, (audioCtx, onLoadProgress) =>
      SplendidGrandPiano(audioCtx, {
        baseUrl: PIANO_CDN,
        formats: ['ogg', 'm4a'],
        velocity: 80,
        decayTime: 1.2,
        notesToLoad: { notes: buildNotesToLoad(rootMin, rootMax), velocityRange: [68, 84] },
        onLoadProgress,
      }))
  } catch (error) {
    if (isAbortError(error) || options.signal?.aborted) throw error
    console.warn('钢琴采样不可用，已切换到离线合成音色', error)
    return createSynthFallback(ctx)
  }
}
