import { cancelSpeech, speak } from '../audio/speech'
import type { Piano } from '../audio/piano'
import { delay } from '../utils/abort'
import { randomQuiz, type IntervalDirection, type Quiz } from './intervals'

export type TrainerState =
  | 'idle'
  | 'loading'
  | 'playing_root'
  | 'playing_second'
  | 'playing_harmonic'
  | 'pause'
  | 'speaking'
  | 'gap'

export type SpeedPreset = 'slow' | 'medium' | 'fast'

export type Settings = {
  noteDurationMs: number
  gapMs: number
  pauseBeforeAnswerMs: number
  gapBetweenQuizzesMs: number
  enabledIntervalIds: string[]
  direction: IntervalDirection
  rootMin: number
  rootMax: number
}

const DEFAULT_DIRECTION: IntervalDirection = 'ascending'

const DEFAULT_ENABLED_INTERVAL_IDS = [
  'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8',
]

export const SPEED_PRESETS: Record<
  SpeedPreset,
  {
    label: string
    noteDurationMs: number
    gapMs: number
    pauseBeforeAnswerMs: number
    gapBetweenQuizzesMs: number
  }
> = {
  slow: {
    label: '慢',
    noteDurationMs: 1200,
    gapMs: 500,
    pauseBeforeAnswerMs: 2500,
    gapBetweenQuizzesMs: 3000,
  },
  medium: {
    label: '中',
    noteDurationMs: 800,
    gapMs: 300,
    pauseBeforeAnswerMs: 1500,
    gapBetweenQuizzesMs: 2000,
  },
  fast: {
    label: '快',
    noteDurationMs: 500,
    gapMs: 200,
    pauseBeforeAnswerMs: 1000,
    gapBetweenQuizzesMs: 1500,
  },
}

export const SPEED_OPTIONS = (Object.keys(SPEED_PRESETS) as SpeedPreset[]).map((preset) => ({
  value: preset,
  label: SPEED_PRESETS[preset].label,
}))

function getSpeedTiming(preset: SpeedPreset) {
  const { label, ...timing } = SPEED_PRESETS[preset]
  void label
  return timing
}

export function createDefaultSettings(preset: SpeedPreset = 'medium'): Settings {
  return {
    ...getSpeedTiming(preset),
    enabledIntervalIds: [...DEFAULT_ENABLED_INTERVAL_IDS],
    direction: DEFAULT_DIRECTION,
    rootMin: 48,
    rootMax: 72,
  }
}

export type SequencerCallbacks = {
  onStateChange: (state: TrainerState) => void
  onAnswerRevealed: (quiz: Quiz) => void
}

async function playNote(
  piano: Piano,
  midi: number,
  durationMs: number,
  signal: AbortSignal,
): Promise<void> {
  await piano.playNote(midi, durationMs / 1000)
  await delay(durationMs, signal)
}

async function playHarmonic(
  piano: Piano,
  midis: number[],
  durationMs: number,
  signal: AbortSignal,
): Promise<void> {
  await piano.playNotes(midis, durationMs / 1000)
  await delay(durationMs, signal)
}

export async function runLoop(
  piano: Piano,
  settings: Settings,
  callbacks: SequencerCallbacks,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    const quiz = randomQuiz(
      settings.enabledIntervalIds,
      settings.direction,
      settings.rootMin,
      settings.rootMax,
    )

    if (quiz.direction === 'harmonic') {
      callbacks.onStateChange('playing_harmonic')
      const lower = Math.min(quiz.root, quiz.second)
      const higher = Math.max(quiz.root, quiz.second)
      await playHarmonic(piano, [lower, higher], settings.noteDurationMs, signal)
    } else {
      const [first, second] =
        quiz.direction === 'ascending'
          ? [Math.min(quiz.root, quiz.second), Math.max(quiz.root, quiz.second)]
          : [Math.max(quiz.root, quiz.second), Math.min(quiz.root, quiz.second)]

      callbacks.onStateChange('playing_root')
      await playNote(piano, first, settings.noteDurationMs, signal)

      callbacks.onStateChange('playing_second')
      await delay(settings.gapMs, signal)
      await playNote(piano, second, settings.noteDurationMs, signal)
    }

    callbacks.onStateChange('pause')
    await delay(settings.pauseBeforeAnswerMs, signal)

    callbacks.onStateChange('speaking')
    await speak(quiz.interval.name, signal)
    callbacks.onAnswerRevealed(quiz)

    callbacks.onStateChange('gap')
    await delay(settings.gapBetweenQuizzesMs, signal)
  }
}

export function stopPlayback(piano: Piano | null): void {
  piano?.stop()
  cancelSpeech()
}
