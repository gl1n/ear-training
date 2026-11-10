import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { Piano } from '../../../audio/piano'
import { buildScaleDegreeLoopCallbacks } from '../../../quiz/challengeSessionHandlers'
import { createGameStartWaiter } from '../../../quiz/createAnswerWaiter'
import { degreeOptions, degreePracticeKey } from '../../../quiz/degreePractice'
import type { ChallengeBestVariant } from '../../../quiz/storageKeys'
import {
  isSequenceScaleDegreeQuiz,
  type DegreePracticeOptions,
  type ScaleDegreeQuiz,
  type ScaleDegreeTrainingMode,
  type SequenceScaleDegreeQuiz,
} from '../../../quiz/keys'
import type { ScaleDegreeMelodyMistakeRecord, ScaleDegreeMelodyMistakeStatsStore } from '../../../quiz/scaleDegreeMelodyMistakeStats'
import type { ScaleDegreeMistakeRecord, ScaleDegreeMistakeStatsStore } from '../../../quiz/scaleDegreeMistakeStats'
import { runScaleDegreeLoop, type Settings, type TrainerState } from '../../../quiz/sequencer'
import type { SessionStats } from '../../../quiz/stats'
import type { PracticeEncouragement } from '../components/practice/types'

type InitialScaleDegreeSettings = {
  scaleDegreeReviewEnabled: boolean
  scaleDegreeTrainingMode: ScaleDegreeTrainingMode
  degreePractice: DegreePracticeOptions
}

type ScaleDegreeAudioControls = {
  settings: Settings
  replayMelodyQuiz: (
    quiz: SequenceScaleDegreeQuiz,
    settings: Settings,
    replayBlocked: boolean,
  ) => Promise<void>
  playMidi: (midi: number) => void
}

type ScaleDegreeLifecycle = {
  active: boolean
  isRunning: boolean
  state: TrainerState
}

type RunScaleDegreeOptions = {
  piano: Piano
  signal: AbortSignal
  waitForAnswer: (signal: AbortSignal) => Promise<string>
  onStateChange: (state: TrainerState) => void
  onAnswerCorrectionStart: (wrongSelection: string) => void
  recordScaleDegreeQuizMistake: (record: ScaleDegreeMistakeRecord) => void
  appendSessionScaleDegreeMistake: (record: ScaleDegreeMistakeRecord) => void
  recordScaleDegreeMelodyQuizMistake: (record: ScaleDegreeMelodyMistakeRecord) => void
  setEncouragement: (encouragement: PracticeEncouragement) => void
  encouragementKeyRef: MutableRefObject<number>
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void
  getSessionStats: () => SessionStats
  completeQuestion: () => boolean
  mistakeStore: ScaleDegreeMistakeStatsStore
  melodyMistakeStore: ScaleDegreeMelodyMistakeStatsStore
}

type FinalizeScaleDegreeOptions = {
  sessionStats: SessionStats
  finalizeChallengeSession: (
    stats: SessionStats,
    variant?: ChallengeBestVariant,
  ) => void
  finalizeDegreePractice: (key: string, stats: SessionStats) => void
}

export function useScaleDegreePractice(
  initial: InitialScaleDegreeSettings,
  audio: ScaleDegreeAudioControls,
  lifecycle: ScaleDegreeLifecycle,
) {
  const [lastQuiz, setLastQuiz] = useState<ScaleDegreeQuiz | null>(null)
  const [currentQuiz, setCurrentQuiz] = useState<ScaleDegreeQuiz | null>(null)
  const [currentKeyLabel, setCurrentKeyLabel] = useState<string | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [reviewEnabled, setReviewEnabled] = useState(initial.scaleDegreeReviewEnabled)
  const [trainingMode, setTrainingMode] = useState(initial.scaleDegreeTrainingMode)
  const [degreePractice, setDegreePractice] = useState(initial.degreePractice)
  const [questionId, setQuestionId] = useState(0)
  const [melodyCorrectDegrees, setMelodyCorrectDegrees] = useState<string[]>([])
  const melodyReplayedRef = useRef(false)
  const gameStartResolverRef = useRef<(() => void) | null>(null)
  const gameStartCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (
      !lifecycle.active ||
      !lifecycle.isRunning ||
      gameStarted ||
      lifecycle.state !== 'idle' ||
      currentKeyLabel === null ||
      !gameStartResolverRef.current
    ) {
      return
    }
    gameStartResolverRef.current()
  }, [currentKeyLabel, gameStarted, lifecycle.active, lifecycle.isRunning, lifecycle.state])

  const resetMelodyProgress = useCallback(() => {
    setMelodyCorrectDegrees([])
  }, [])

  const resetTransientState = useCallback(() => {
    gameStartResolverRef.current = null
    gameStartCleanupRef.current?.()
    gameStartCleanupRef.current = null
    resetMelodyProgress()
  }, [resetMelodyProgress])

  const stop = useCallback(() => {
    setGameStarted(false)
    resetTransientState()
  }, [resetTransientState])

  const resetMode = useCallback(() => {
    setLastQuiz(null)
    setCurrentKeyLabel(null)
    stop()
  }, [stop])

  const prepareStart = useCallback((clearNewBestRecord: (variant: ChallengeBestVariant) => void) => {
    setLastQuiz(null)
    setCurrentKeyLabel(null)
    setGameStarted(false)
    if (trainingMode === 'single') clearNewBestRecord('scaleDegree')
    if (trainingMode === 'melody') clearNewBestRecord('scaleDegreeMelody')
  }, [trainingMode])

  const waitForGameStart = useCallback((signal: AbortSignal) =>
    createGameStartWaiter({
      gameStartResolverRef,
      gameStartCleanupRef,
      onStart: () => setGameStarted(true),
    })(signal), [])

  const handleStateChange = useCallback((nextState: TrainerState) => {
    if (trainingMode !== 'single' && nextState === 'playing_root') {
      resetMelodyProgress()
    }
  }, [resetMelodyProgress, trainingMode])

  const handleMelodyNoteResolved = useCallback((
    _noteIndex: number,
    degree: number,
    correct: boolean,
  ) => {
    if (correct) setMelodyCorrectDegrees((current) => [...current, String(degree)])
  }, [])

  const run = useCallback(async ({
    piano,
    signal,
    waitForAnswer,
    onStateChange,
    onAnswerCorrectionStart,
    recordScaleDegreeQuizMistake,
    appendSessionScaleDegreeMistake,
    recordScaleDegreeMelodyQuizMistake,
    setEncouragement,
    encouragementKeyRef,
    updateSessionStats,
    getSessionStats,
    completeQuestion,
    mistakeStore,
  }: RunScaleDegreeOptions) => {
    await runScaleDegreeLoop(
      piano,
      audio.settings,
      buildScaleDegreeLoopCallbacks({
        onStateChange,
        onSessionStart: (session) => setCurrentKeyLabel(session.label),
        onQuiz: (quiz) => {
          melodyReplayedRef.current = false
          setCurrentQuiz(quiz)
          setQuestionId((id) => id + 1)
        },
        waitForGameStart,
        waitForAnswer: (answerSignal) => waitForAnswer(answerSignal).then((answer) => ({
          selectedDegree: answer,
          wasReplayed: melodyReplayedRef.current,
        })),
        waitForNextQuestion: (answerSignal) => waitForAnswer(answerSignal).then(() => undefined),
        onAnswerCorrectionStart,
        onSequenceNoteResolved: handleMelodyNoteResolved,
        trainingMode,
        setLastScaleDegreeQuiz: setLastQuiz,
        recordScaleDegreeQuizMistake,
        appendSessionScaleDegreeMistake,
        recordScaleDegreeMelodyQuizMistake,
        setEncouragement,
        encouragementKeyRef,
        updateSessionStats,
        getSessionStats,
        onQuestionCompleted: trainingMode === 'melody' && degreePractice.arcadeMode
          ? undefined
          : completeQuestion,
      }),
      signal,
      mistakeStore,
      reviewEnabled,
      trainingMode,
      degreePractice,
    )
  }, [
    audio.settings,
    degreePractice,
    handleMelodyNoteResolved,
    reviewEnabled,
    trainingMode,
    waitForGameStart,
  ])

  const finalize = useCallback(({
    sessionStats,
    finalizeChallengeSession,
    finalizeDegreePractice,
  }: FinalizeScaleDegreeOptions) => {
    if (trainingMode !== 'crossRegister') {
      if (trainingMode === 'single' && degreePractice.scaleFlavor === 'major') {
        finalizeChallengeSession(sessionStats, 'scaleDegree')
      } else {
        finalizeDegreePractice(degreePracticeKey(trainingMode, degreePractice), sessionStats)
      }
    }
    setGameStarted(false)
  }, [degreePractice, trainingMode])

  const playMelodyQuiz = useCallback((quiz: SequenceScaleDegreeQuiz, replayBlocked: boolean) => {
    void audio.replayMelodyQuiz(quiz, audio.settings, replayBlocked)
  }, [audio])

  const replayCurrentMelody = useCallback(() => {
    if (!currentQuiz || !isSequenceScaleDegreeQuiz(currentQuiz)) return
    if (lifecycle.state === 'awaiting_answer') melodyReplayedRef.current = true
    void audio.replayMelodyQuiz(currentQuiz, audio.settings, false)
  }, [audio, currentQuiz, lifecycle.state])

  const playDo = useCallback(() => {
    if (currentQuiz) audio.playMidi(currentQuiz.tonicMidi)
  }, [audio, currentQuiz])

  const answerForDigit = useCallback((digit: number): string | null => {
    if (trainingMode === 'melody' || digit > 7) return null
    const options = degreeOptions(trainingMode === 'single' ? degreePractice.scaleFlavor : 'major')
    return trainingMode === 'single' && degreePractice.scaleFlavor === 'minor'
      ? options[digit - 1] ?? null
      : String(digit)
  }, [degreePractice.scaleFlavor, trainingMode])

  return {
    lastQuiz,
    currentQuiz,
    currentKeyLabel,
    gameStarted,
    reviewEnabled,
    trainingMode,
    degreePractice,
    questionId,
    melodyCorrectDegrees,
    setReviewEnabled,
    setTrainingMode,
    setDegreePractice,
    prepareStart,
    resetTransientState,
    resetMode,
    stop,
    handleStateChange,
    run,
    finalize,
    playMelodyQuiz,
    replayCurrentMelody,
    playDo,
    answerForDigit,
  }
}
