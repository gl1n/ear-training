import { cancelSpeech, speak } from '../audio/speech'
import type { Piano } from '../audio/piano'
import { delay, isAbortError } from '../utils/abort'
import {
  createMajorKeySession,
  getTonicMajorTriadMidis,
  isMelodyScaleDegreeQuiz,
  randomMelodyScaleDegreeQuiz,
  randomScaleDegreeQuiz,
  type MajorKeySession,
  type MelodyScaleDegreeQuiz,
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
import {
  weightedRandomMelodyQuizFromMistakes,
  type ScaleDegreeMelodyMistakeStatsStore,
} from './scaleDegreeMelodyMistakeStats'
import { getMelodySessionDegreeWeights, getSessionDegreeWeights, type SessionStats } from './stats'
import {
  finishChallengeOnIncorrect,
  raceAnswerAgainstAudio,
  resolveAnswerWithCorrection,
  withReactionMs,
} from './challengeLoopHelpers'

export type TrainerState =
  | 'idle'
  | 'loading'
  | 'playing_root'
  | 'playing_second'
  | 'playing_harmonic'
  | 'playing_tonic_chord'
  | 'playing_note'
  | 'pause'
  | 'speaking'
  | 'gap'
  | 'awaiting_answer'
  | 'answer_correction'
  | 'feedback_incorrect'

export type SpeedPreset = 'slow' | 'medium' | 'fast'

/** 音程跟听 · 音程辨认 · 音级辨识 */
export type AppMode = 'intervalFollow' | 'intervalSpeed' | 'scaleDegree'

export function normalizeAppMode(value: unknown): AppMode | null {
  if (value === 'intervalFollow' || value === 'intervalSpeed' || value === 'scaleDegree') {
    return value
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

export type ChallengeAnswer = {
  reactionMs?: number
}

export type IntervalSpeedAnswer = ChallengeAnswer & {
  selectedIntervalId: string
}

export type IntervalSpeedCallbacks = {
  onStateChange: (state: TrainerState) => void
  waitForAnswer: (signal: AbortSignal) => Promise<IntervalSpeedAnswer>
  onAnswerCorrectionStart?: (wrongSelection: string) => void
  onAnswerSubmitted: (
    quiz: Quiz,
    answer: IntervalSpeedAnswer,
    correct: boolean,
  ) => void
}

export type ScaleDegreeAnswer = ChallengeAnswer & {
  selectedDegree: string
}

export const SCALE_DEGREE_TONIC_CHORD_DURATION_MS = 2_400

export type ScaleDegreeCallbacks = {
  onStateChange: (state: TrainerState) => void
  onSessionStart: (session: MajorKeySession) => void
  waitForGameStart: (signal: AbortSignal) => Promise<void>
  waitForAnswer: (signal: AbortSignal) => Promise<ScaleDegreeAnswer>
  onAnswerCorrectionStart?: (wrongSelection: string) => void
  onMelodyNoteResolved?: (noteIndex: number, degree: number, correct: boolean) => void
  onMelodyGroupSubmitted?: (
    quiz: MelodyScaleDegreeQuiz,
    correct: boolean,
    reactionMs?: number,
  ) => void
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

/** 音程辨认：听辨音程并即时作答，按反应速度加权计分 */
export async function runIntervalSpeedLoop(
  piano: Piano,
  settings: Settings,
  callbacks: IntervalSpeedCallbacks,
  signal: AbortSignal,
  mistakeStore: MistakeStatsStore,
): Promise<void> {
  while (!signal.aborted) {
    // 音程辨认：始终按错题分布加权出题（MISTAKE_FOCUSED_RATE 控制聚焦比例）。
    const quiz = weightedRandomQuizFromMistakes(
      mistakeStore,
      settings.enabledIntervalIds,
      settings.direction,
      settings.rootMin,
      settings.rootMax,
    )

    const onStateChange = (state: TrainerState) => {
      callbacks.onStateChange(state)
    }

    let audioPlayStartMs: number | null = null
    const firstAnswer = withReactionMs(
      await raceAnswerAgainstAudio({
        signal,
        piano,
        waitForAnswer: () => callbacks.waitForAnswer(signal),
        playAudio: async (audioSignal) => {
          audioPlayStartMs = performance.now()
          await playQuizAudio(piano, quiz, settings, { onStateChange }, audioSignal)
        },
        onAwaitingAnswer: () => {
          callbacks.onStateChange('awaiting_answer')
        },
      }),
      audioPlayStartMs,
    )

    const { answer, correct } = await resolveAnswerWithCorrection({
      firstAnswer,
      isCorrect: (candidate) =>
        candidate.selectedIntervalId !== '' &&
        candidate.selectedIntervalId === quiz.interval.id,
      isEmpty: (candidate) => candidate.selectedIntervalId === '',
      getSelection: (candidate) => candidate.selectedIntervalId,
      mergeRetrySelection: (first, retry) => ({
        ...first,
        selectedIntervalId: retry.selectedIntervalId,
      }),
      waitForAnswer: () => callbacks.waitForAnswer(signal),
      onEnterCorrection: (wrongSelection) => {
        callbacks.onAnswerCorrectionStart?.(wrongSelection)
        callbacks.onStateChange('answer_correction')
      },
    })

    callbacks.onAnswerSubmitted(quiz, answer, correct)

    if (!correct) {
      await finishChallengeOnIncorrect(signal, () =>
        callbacks.onStateChange('feedback_incorrect'),
      )
      return
    }
  }
}

function buildMelodyNoteQuiz(
  quiz: MelodyScaleDegreeQuiz,
  noteIndex: number,
): ScaleDegreeQuiz {
  return {
    tonicMidi: quiz.tonicMidi,
    noteMidi: quiz.noteMidis[noteIndex]!,
    degree: quiz.degrees[noteIndex]!,
    keyLabel: quiz.keyLabel,
    previousNoteMidi: noteIndex > 0 ? quiz.noteMidis[noteIndex - 1]! : quiz.previousNoteMidi,
  }
}

async function runMelodyScaleDegreeQuestion(
  piano: Piano,
  quiz: MelodyScaleDegreeQuiz,
  settings: Settings,
  callbacks: ScaleDegreeCallbacks,
  signal: AbortSignal,
): Promise<boolean> {
  callbacks.onStateChange('playing_root')
  await playNote(piano, quiz.noteMidis[0]!, settings.noteDurationMs, signal)
  await delay(settings.gapMs, signal)

  callbacks.onStateChange('playing_second')
  await playNote(piano, quiz.noteMidis[1]!, settings.noteDurationMs, signal)
  await delay(settings.gapMs, signal)

  const audioAbort = new AbortController()
  const onSessionAbort = () => audioAbort.abort()
  signal.addEventListener('abort', onSessionAbort)

  callbacks.onStateChange('playing_note')
  const answerReadyAtMs = performance.now()

  const note3Playback = playNote(
    piano,
    quiz.noteMidis[2]!,
    settings.noteDurationMs,
    audioAbort.signal,
  )
    .then(() => {
      if (!audioAbort.signal.aborted) {
        callbacks.onStateChange('awaiting_answer')
      }
    })
    .catch((error) => {
      if (!isAbortError(error)) {
        throw error
      }
    })

  try {
    let firstNoteReactionMs: number | undefined

    for (let noteIndex = 0; noteIndex < quiz.noteMidis.length; noteIndex++) {
      const noteQuiz = buildMelodyNoteQuiz(quiz, noteIndex)
      const answer =
        noteIndex === 0
          ? withReactionMs(await callbacks.waitForAnswer(signal), answerReadyAtMs)
          : await callbacks.waitForAnswer(signal)

      if (noteIndex === 0) {
        firstNoteReactionMs = answer.reactionMs
      }

      const correct =
        answer.selectedDegree !== '' && answer.selectedDegree === String(noteQuiz.degree)

      callbacks.onMelodyNoteResolved?.(noteIndex, noteQuiz.degree, correct)
      callbacks.onAnswerSubmitted(noteQuiz, answer, correct)

      if (!correct) {
        audioAbort.abort()
        piano.stop()
        callbacks.onMelodyGroupSubmitted?.(quiz, false)
        await finishChallengeOnIncorrect(signal, () =>
          callbacks.onStateChange('feedback_incorrect'),
        )
        return false
      }
    }

    callbacks.onMelodyGroupSubmitted?.(quiz, true, firstNoteReactionMs)
  } finally {
    audioAbort.abort()
    piano.stop()
    signal.removeEventListener('abort', onSessionAbort)
    try {
      await note3Playback
    } catch {
      // Note 3 stopped after the player answered or the session ended.
    }
  }

  return true
}

/** 音级辨识：定调后听辨调内单音或三音旋律并选择音级 */
export async function runScaleDegreeLoop(
  piano: Piano,
  settings: Settings,
  callbacks: ScaleDegreeCallbacks,
  signal: AbortSignal,
  mistakeStore: ScaleDegreeMistakeStatsStore = [],
  melodyMistakeStore: ScaleDegreeMelodyMistakeStatsStore = [],
  reviewEnabled = false,
  melodyEnabled = false,
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
    // 音级辨识：复习模式开启时优先历史错题；关闭时用本局均衡权重随机。
    const sessionDegreeWeights = callbacks.getSessionStats
      ? melodyEnabled
        ? getMelodySessionDegreeWeights(callbacks.getSessionStats())
        : getSessionDegreeWeights(callbacks.getSessionStats())
      : undefined
    let quiz: ScaleDegreeQuiz
    if (reviewEnabled && melodyEnabled && melodyMistakeStore.length > 0) {
      quiz =
        weightedRandomMelodyQuizFromMistakes(
          melodyMistakeStore,
          session,
          settings.rootMin,
          settings.rootMax,
          previousNoteMidi,
        ) ??
        randomMelodyScaleDegreeQuiz(
          session,
          settings.rootMin,
          settings.rootMax,
          previousNoteMidi,
          sessionDegreeWeights,
        )
    } else if (reviewEnabled && mistakeStore.length > 0) {
      if (melodyEnabled) {
        quiz = randomMelodyScaleDegreeQuiz(
          session,
          settings.rootMin,
          settings.rootMax,
          previousNoteMidi,
          sessionDegreeWeights,
        )
      } else {
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
      }
    } else if (melodyEnabled) {
      quiz = randomMelodyScaleDegreeQuiz(
        session,
        settings.rootMin,
        settings.rootMax,
        previousNoteMidi,
        sessionDegreeWeights,
      )
    } else {
      quiz = randomScaleDegreeQuiz(
        session,
        settings.rootMin,
        settings.rootMax,
        previousNoteMidi,
        sessionDegreeWeights,
      )
    }
    previousNoteMidi = quiz.noteMidi

    if (melodyEnabled && isMelodyScaleDegreeQuiz(quiz)) {
      const completed = await runMelodyScaleDegreeQuestion(
        piano,
        quiz,
        settings,
        callbacks,
        signal,
      )
      if (!completed) {
        return
      }
      continue
    }

    let notePlayStartMs: number | null = null
    const firstAnswer = withReactionMs(
      await raceAnswerAgainstAudio({
        signal,
        piano,
        waitForAnswer: () => callbacks.waitForAnswer(signal),
        playAudio: async (audioSignal) => {
          callbacks.onStateChange('playing_note')
          notePlayStartMs = performance.now()
          await playNote(piano, quiz.noteMidi, settings.noteDurationMs, audioSignal)
          if (!audioSignal.aborted) {
            callbacks.onStateChange('awaiting_answer')
          }
        },
      }),
      notePlayStartMs,
    )

    const { answer, correct } = await resolveAnswerWithCorrection({
      firstAnswer,
      isCorrect: (candidate) =>
        candidate.selectedDegree !== '' && candidate.selectedDegree === String(quiz.degree),
      isEmpty: (candidate) => candidate.selectedDegree === '',
      getSelection: (candidate) => candidate.selectedDegree,
      mergeRetrySelection: (first, retry) => ({
        ...first,
        selectedDegree: retry.selectedDegree,
      }),
      waitForAnswer: () => callbacks.waitForAnswer(signal),
      onEnterCorrection: (wrongSelection) => {
        callbacks.onAnswerCorrectionStart?.(wrongSelection)
        callbacks.onStateChange('answer_correction')
      },
    })

    callbacks.onAnswerSubmitted(quiz, answer, correct)

    if (!correct) {
      await finishChallengeOnIncorrect(signal, () =>
        callbacks.onStateChange('feedback_incorrect'),
      )
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
