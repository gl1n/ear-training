import { Soundfont, SplendidGrandPiano, type Smplr } from 'smplr'
import { isSafari, unlockAudioContext } from './context'
import { waitForAbort } from '../utils/abort'

const PIANO_CDN =
  'https://cdn.jsdelivr.net/gh/smpldsnds/sfzinstruments-splendid-grand-piano@master/samples'

const LOAD_TIMEOUT_MS = 60_000
const MAX_INTERVAL_SEMITONES = 12

export type Piano = {
  playNote: (midi: number, durationSec: number) => Promise<void>
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
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(new Error('钢琴音色加载超时，请检查网络后重试'))
    }, LOAD_TIMEOUT_MS)
  })

  const racers: Promise<T | never>[] = [promise, timeout]
  if (signal) {
    racers.push(waitForAbort(signal))
  }

  return Promise.race(racers)
}

function wrapInstrument(ctx: AudioContext, piano: Smplr): Piano {
  return {
    async playNote(midi: number, durationSec: number) {
      await unlockAudioContext(ctx)
      piano.start({ note: midi, velocity: 80, duration: durationSec })
    },
    stop() {
      piano.stop()
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
  if (isSafari()) {
    return loadInstrument(
      ctx,
      options,
      (audioCtx, onLoadProgress) =>
        Soundfont(audioCtx, {
          instrument: 'acoustic_grand_piano',
          onLoadProgress,
        }),
      () => options.onLoadingIndeterminate?.(),
    )
  }

  const { rootMin, rootMax } = options
  return loadInstrument(ctx, options, (audioCtx, onLoadProgress) =>
    SplendidGrandPiano(audioCtx, {
      baseUrl: PIANO_CDN,
      formats: ['ogg', 'm4a'],
      velocity: 80,
      decayTime: 1.2,
      notesToLoad: {
        notes: buildNotesToLoad(rootMin, rootMax),
        velocityRange: [68, 84],
      },
      onLoadProgress,
    }),
  )
}
