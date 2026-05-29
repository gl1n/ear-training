import { cancelSpeech, speak } from '../audio/speech'
import type { Piano } from '../audio/piano'
import { delay } from '../utils/abort'
import { randomQuiz, type Quiz } from './intervals'

export type TrainerState =
  | 'idle'
  | 'loading'
  | 'playing_root'
  | 'playing_second'
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
  rootMin: number
  rootMax: number
}

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

export async function runLoop(
  piano: Piano,
  settings: Settings,
  callbacks: SequencerCallbacks,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    const quiz = randomQuiz(settings.enabledIntervalIds, settings.rootMin, settings.rootMax)

    callbacks.onStateChange('playing_root')
    await playNote(piano, quiz.root, settings.noteDurationMs, signal)

    callbacks.onStateChange('playing_second')
    await delay(settings.gapMs, signal)
    await playNote(piano, quiz.second, settings.noteDurationMs, signal)

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
