import { cancelSpeech, speak } from '../audio/speech'
import type { Piano } from '../audio/piano'
import { delay, isAbortError } from '../utils/abort'
import {
  createMajorKeySession,
  getTonicMajorTriadMidis,
  randomScaleDegreeQuiz,
  type MajorKeySession,
  type ScaleDegreeQuiz,
} from './keys'
import { ALL_INTERVAL_IDS, randomQuiz, type IntervalDirection, type Quiz } from './intervals'
import {
  weightedRandomQuizFromMistakes,
  type MistakeStatsStore,
} from './mistakeStats'
import {
  weightedRandomScaleDegreeQuizFromMistakes,
  type ScaleDegreeMistakeStatsStore,
} from './scaleDegreeMistakeStats'
import { getSessionDegreeWeights, type SessionStats } from './stats'

const IDLE_BOOST_MS = 1_000

function isIdleBoostEligible(
  answerWindowStartMs: number | null,
  playerAnswered: boolean,
  idleBoosted: boolean,
): boolean {
  if (playerAnswered || idleBoosted || answerWindowStartMs === null) {
    return false
  }

  return performance.now() - answerWindowStartMs >= IDLE_BOOST_MS
}

export type TrainerState =
  | 'idle'
  | 'loading'
  | 'playing_root'
  | 'playing_second'
  | 'playing_harmonic'
  | 'playing_tonic'
  | 'playing_tonic_chord'
  | 'playing_note'
  | 'pause'
  | 'speaking'
  | 'gap'
  | 'awaiting_answer'
  | 'feedback_incorrect'

export type SpeedPreset = 'slow' | 'medium' | 'fast'

/** 音程跟听 · 音程竞速 · 音级辨识 */
export type AppMode = 'intervalFollow' | 'intervalSpeed' | 'scaleDegree'

const LEGACY_APP_MODES: Record<string, AppMode> = {
  practice: 'intervalFollow',
  arcade: 'intervalSpeed',
  noteKey: 'scaleDegree',
}

export function normalizeAppMode(value: unknown): AppMode | null {
  if (value === 'intervalFollow' || value === 'intervalSpeed' || value === 'scaleDegree') {
    return value
  }

  if (typeof value === 'string' && value in LEGACY_APP_MODES) {
    return LEGACY_APP_MODES[value]
  }

  return null
}

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

export const LISTENING_STATES: TrainerState[] = [
  'playing_root',
  'playing_second',
  'playing_harmonic',
  'playing_tonic',
  'playing_tonic_chord',
  'playing_note',
]

const SPEED_PRESETS: Record<
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
    enabledIntervalIds: [...ALL_INTERVAL_IDS],
    direction: DEFAULT_DIRECTION,
    rootMin: 48,
    rootMax: 85,
  }
}

export type SequencerCallbacks = {
  onStateChange: (state: TrainerState) => void
  onAnswerRevealed: (quiz: Quiz) => void
}

/** 音程竞速模式单局总时长 */
export const INTERVAL_SPEED_TIME_MS = 30_000

export type IntervalSpeedAnswer = {
  selectedIntervalId: string
  timedOut?: boolean
}

export type IntervalSpeedCallbacks = {
  onStateChange: (state: TrainerState) => void
  waitForAnswer: (signal: AbortSignal, timeoutMs: number) => Promise<IntervalSpeedAnswer>
  onAnswerSubmitted: (
    quiz: Quiz,
    answer: IntervalSpeedAnswer,
    correct: boolean,
  ) => void
  onIdleBoost?: (quiz: Quiz) => void
}

export type ScaleDegreeAnswer = {
  selectedDegree: string
  timedOut?: boolean
  reactionMs?: number
}

export const SCALE_DEGREE_TONIC_CHORD_DURATION_MS = 2_400

export type ScaleDegreeCallbacks = {
  onStateChange: (state: TrainerState) => void
  onSessionStart: (session: MajorKeySession) => void
  waitForGameStart: (signal: AbortSignal) => Promise<void>
  waitForAnswer: (signal: AbortSignal) => Promise<ScaleDegreeAnswer>
  onAnswerSubmitted: (
    quiz: ScaleDegreeQuiz,
    answer: ScaleDegreeAnswer,
    correct: boolean,
  ) => void
  getSessionStats?: () => SessionStats
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

async function playQuizAudio(
  piano: Piano,
  quiz: Quiz,
  settings: Pick<Settings, 'noteDurationMs' | 'gapMs'>,
  callbacks: Pick<SequencerCallbacks, 'onStateChange'>,
  signal: AbortSignal,
): Promise<void> {
  if (quiz.direction === 'harmonic') {
    callbacks.onStateChange('playing_harmonic')
    const lower = Math.min(quiz.root, quiz.second)
    const higher = Math.max(quiz.root, quiz.second)
    await playHarmonic(piano, [lower, higher], settings.noteDurationMs, signal)
    return
  }

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

/** 音程跟听：循环播放音程并语音播报答案 */
export async function runIntervalFollowLoop(
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

    await playQuizAudio(piano, quiz, settings, callbacks, signal)

    callbacks.onStateChange('pause')
    await delay(settings.pauseBeforeAnswerMs, signal)

    callbacks.onStateChange('speaking')
    await speak(quiz.interval.name, signal)
    callbacks.onAnswerRevealed(quiz)

    callbacks.onStateChange('gap')
    await delay(settings.gapBetweenQuizzesMs, signal)
  }
}

const INTERVAL_SPEED_FEEDBACK_INCORRECT_MS = 1200

/** 音程竞速：限时听辨音程并即时作答 */
export async function runIntervalSpeedLoop(
  piano: Piano,
  settings: Settings,
  callbacks: IntervalSpeedCallbacks,
  signal: AbortSignal,
  sessionDeadlineMs: number,
  mistakeStore: MistakeStatsStore,
): Promise<void> {
  const getRemainingMs = () => Math.max(0, sessionDeadlineMs - performance.now())

  while (!signal.aborted) {
    if (getRemainingMs() <= 0) {
      return
    }

    const quiz = weightedRandomQuizFromMistakes(
      mistakeStore,
      settings.enabledIntervalIds,
      settings.direction,
      settings.rootMin,
      settings.rootMax,
    )

    const remainingMs = getRemainingMs()
    if (remainingMs <= 0) {
      callbacks.onAnswerSubmitted(
        quiz,
        { selectedIntervalId: '', timedOut: true },
        false,
      )
      callbacks.onStateChange('feedback_incorrect')
      await delay(INTERVAL_SPEED_FEEDBACK_INCORRECT_MS, signal)
      return
    }

    const questionState = {
      playerAnswered: false,
      idleBoosted: false,
      answerWindowStartMs: null as number | null,
      idleTimer: null as ReturnType<typeof setTimeout> | null,
    }

    const notifyIdleBoost = () => {
      callbacks.onIdleBoost?.(quiz)
    }

    const clearIdleTimer = () => {
      if (questionState.idleTimer !== null) {
        clearTimeout(questionState.idleTimer)
        questionState.idleTimer = null
      }
    }

    const startIdleTimerIfNeeded = () => {
      if (
        questionState.playerAnswered ||
        questionState.idleBoosted ||
        questionState.answerWindowStartMs !== null
      ) {
        return
      }

      questionState.answerWindowStartMs = performance.now()
      questionState.idleTimer = setTimeout(() => {
        if (!questionState.playerAnswered) {
          questionState.idleBoosted = true
          notifyIdleBoost()
        }
      }, IDLE_BOOST_MS)
    }

    const audioAbort = new AbortController()

    const onSessionAbort = () => audioAbort.abort()
    signal.addEventListener('abort', onSessionAbort)

    const onStateChange = (state: TrainerState) => {
      callbacks.onStateChange(state)
    }

    const answerPromise = callbacks.waitForAnswer(signal, remainingMs)

    const audioPromise = playQuizAudio(piano, quiz, settings, { onStateChange }, audioAbort.signal)
      .then(() => {
        if (!audioAbort.signal.aborted && !questionState.playerAnswered) {
          callbacks.onStateChange('awaiting_answer')
          startIdleTimerIfNeeded()
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          throw error
        }
      })

    let answer: IntervalSpeedAnswer
    try {
      answer = await answerPromise
      questionState.playerAnswered = !answer.timedOut && answer.selectedIntervalId !== ''
    } finally {
      clearIdleTimer()
      audioAbort.abort()
      stopPlayback(piano)
      signal.removeEventListener('abort', onSessionAbort)
      try {
        await audioPromise
      } catch {
        // Audio stopped early when the player answered.
      }
    }

    if (
      isIdleBoostEligible(
        questionState.answerWindowStartMs,
        questionState.playerAnswered,
        questionState.idleBoosted,
      )
    ) {
      questionState.idleBoosted = true
      notifyIdleBoost()
    }

    const correct = !answer.timedOut && answer.selectedIntervalId === quiz.interval.id

    callbacks.onAnswerSubmitted(quiz, answer, correct)

    if (!correct) {
      callbacks.onStateChange('feedback_incorrect')
      await delay(INTERVAL_SPEED_FEEDBACK_INCORRECT_MS, signal)
      return
    }
  }
}

/** 音级辨识：定调后听辨调内单音并选择音级 */
export async function runScaleDegreeLoop(
  piano: Piano,
  settings: Settings,
  callbacks: ScaleDegreeCallbacks,
  signal: AbortSignal,
  mistakeStore: ScaleDegreeMistakeStatsStore = [],
  reviewEnabled = false,
): Promise<void> {
  const session = createMajorKeySession(settings.rootMin, settings.rootMax)
  callbacks.onSessionStart(session)

  const [root, third, fifth] = getTonicMajorTriadMidis(session.tonicMidi)
  callbacks.onStateChange('playing_tonic_chord')
  await playHarmonic(
    piano,
    [root, third, fifth],
    SCALE_DEGREE_TONIC_CHORD_DURATION_MS,
    signal,
  )

  callbacks.onStateChange('idle')
  await callbacks.waitForGameStart(signal)

  let previousNoteMidi: number | null = null

  while (!signal.aborted) {
    let quiz: ScaleDegreeQuiz
    if (reviewEnabled && mistakeStore.length > 0) {
      quiz =
        weightedRandomScaleDegreeQuizFromMistakes(
          mistakeStore,
          session,
          settings.rootMin,
          settings.rootMax,
          previousNoteMidi,
        ) ??
        randomScaleDegreeQuiz(
          session,
          settings.rootMin,
          settings.rootMax,
          previousNoteMidi,
        )
    } else {
      const sessionDegreeWeights = callbacks.getSessionStats
        ? getSessionDegreeWeights(callbacks.getSessionStats())
        : undefined
      quiz = randomScaleDegreeQuiz(
        session,
        settings.rootMin,
        settings.rootMax,
        previousNoteMidi,
        sessionDegreeWeights,
      )
    }
    previousNoteMidi = quiz.noteMidi
    const audioAbort = new AbortController()

    const onSessionAbort = () => audioAbort.abort()
    signal.addEventListener('abort', onSessionAbort)

    const answerPromise = callbacks.waitForAnswer(signal)
    let notePlayStartMs: number | null = null

    const audioPromise = (async () => {
      callbacks.onStateChange('playing_note')
      notePlayStartMs = performance.now()
      await playNote(piano, quiz.noteMidi, settings.noteDurationMs, audioAbort.signal)
      if (!audioAbort.signal.aborted) {
        callbacks.onStateChange('awaiting_answer')
      }
    })().catch((error) => {
      if (!isAbortError(error)) {
        throw error
      }
    })

    let answer: ScaleDegreeAnswer
    try {
      answer = await answerPromise
      if (notePlayStartMs !== null) {
        answer = { ...answer, reactionMs: performance.now() - notePlayStartMs }
      }
    } finally {
      audioAbort.abort()
      stopPlayback(piano)
      signal.removeEventListener('abort', onSessionAbort)
      try {
        await audioPromise
      } catch {
        // Audio stopped early when the player answered.
      }
    }

    const correct =
      !answer.timedOut &&
      answer.selectedDegree !== '' &&
      answer.selectedDegree === String(quiz.degree)

    callbacks.onAnswerSubmitted(quiz, answer, correct)

    if (!correct) {
      callbacks.onStateChange('feedback_incorrect')
      await delay(INTERVAL_SPEED_FEEDBACK_INCORRECT_MS, signal)
      return
    }
  }
}

export function stopPlayback(piano: Piano | null): void {
  piano?.stop()
  cancelSpeech()
}

export async function replayQuiz(
  piano: Piano,
  quiz: Quiz,
  settings: Pick<Settings, 'noteDurationMs' | 'gapMs'>,
  signal: AbortSignal,
): Promise<void> {
  await playQuizAudio(piano, quiz, settings, { onStateChange: () => {} }, signal)
}
