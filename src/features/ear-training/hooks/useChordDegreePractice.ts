import { useCallback, useRef, useState } from 'react'
import type { Piano } from '../../../audio/piano'
import {
  CHORD_DEGREE_PLAYBACK_DURATION_SEC,
  CHORD_DEGREE_RETRIGGER_GAP_MS,
  createChordMidis,
  getChordDegreesForRange,
  loadChordDegreeHistory,
  randomChordDegreeTonicMidi,
  recordChordDegreeHistory,
  runChordDegreeLoop,
  type ChordDegreeHistory,
  type ChordDegreeId,
  type ChordDegreeInversionMode,
  type ChordDegreeKey,
  type ChordDegreeQuiz,
  type ChordDegreeRange,
} from '../../../quiz/chordDegreeQuiz'
import { recordChallengeResultNoBonus, type SessionStats } from '../../../quiz/stats'
import type { Settings, TrainerState } from '../../../quiz/sequencer'
import { isAbortError } from '../../../utils/abort'

type InitialChordDegreeSettings = {
  chordDegreeKey: ChordDegreeKey
  chordDegreeRange: ChordDegreeRange
  chordDegreeCustomDegrees: number[]
  chordDegreeInversionMode: ChordDegreeInversionMode
}

type AudioControls = {
  settings: Settings
  correctionWrongSelection: string | null
  ensureAudioContext: () => AudioContext
  ensurePiano: (settings: Settings, signal?: AbortSignal) => Promise<Piano>
  handleLoadFailure: (error: unknown) => void
}

type RunChordDegreeOptions = {
  piano: Piano
  signal: AbortSignal
  onStateChange: (state: TrainerState) => void
  waitForAnswer: (signal: AbortSignal) => Promise<string>
  onAnswerCorrectionStart: (wrongSelection: string) => void
  getSessionStats: () => SessionStats
  updateSessionStats: (updater: (current: SessionStats) => SessionStats) => void
  completeQuestion: () => boolean
}

function waitForChordRetrigger(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, CHORD_DEGREE_RETRIGGER_GAP_MS))
}

export function useChordDegreePractice(
  initial: InitialChordDegreeSettings,
  audio: AudioControls,
) {
  const [quiz, setQuiz] = useState<ChordDegreeQuiz | null>(null)
  const [history, setHistory] = useState<ChordDegreeHistory>(() => loadChordDegreeHistory())
  const [key, setKey] = useState(initial.chordDegreeKey)
  const [tonicMidi, setTonicMidi] = useState(60)
  const [range, setRange] = useState(initial.chordDegreeRange)
  const [customDegrees, setCustomDegrees] = useState(initial.chordDegreeCustomDegrees)
  const [inversionMode, setInversionMode] = useState(initial.chordDegreeInversionMode)
  const [replayCount, setReplayCount] = useState(0)
  const replayTokenRef = useRef(0)

  const cancelReplay = useCallback(() => {
    replayTokenRef.current += 1
  }, [])

  const resetQuiz = useCallback(() => {
    cancelReplay()
    setQuiz(null)
  }, [cancelReplay])

  const run = useCallback(async ({
    piano,
    signal,
    onStateChange,
    waitForAnswer,
    onAnswerCorrectionStart,
    getSessionStats,
    updateSessionStats,
    completeQuestion,
  }: RunChordDegreeOptions) => {
    const nextTonicMidi = key === 'random' ? randomChordDegreeTonicMidi() : 60
    setTonicMidi(nextTonicMidi)

    await runChordDegreeLoop(piano, {
      onStateChange,
      onQuiz: (nextQuiz) => {
        cancelReplay()
        setQuiz(nextQuiz)
        setReplayCount(1)
      },
      waitForAnswer: (answerSignal) => waitForAnswer(answerSignal).then((selectedDegree) => ({ selectedDegree })),
      onAnswerCorrectionStart,
      getSessionStats,
      onAnswerSubmitted: (answeredQuiz, _selected, correct) => {
        updateSessionStats((current) => recordChallengeResultNoBonus(
          current,
          String(answeredQuiz.degree),
          { correct },
        ))
        setHistory((current) => recordChordDegreeHistory(
          current,
          String(answeredQuiz.degree) as ChordDegreeId,
          correct,
        ))
        return completeQuestion()
      },
    }, signal, nextTonicMidi, getChordDegreesForRange(range, customDegrees), inversionMode)
  }, [cancelReplay, customDegrees, inversionMode, key, range])

  const playChordMidis = useCallback(async (midis: number[]) => {
    const token = ++replayTokenRef.current
    audio.ensureAudioContext()
    const piano = await audio.ensurePiano(audio.settings)
    piano.stop()
    await waitForChordRetrigger()
    if (token !== replayTokenRef.current) return
    await piano.playNotes(midis, CHORD_DEGREE_PLAYBACK_DURATION_SEC)
  }, [audio])

  const playDo = useCallback(() => {
    audio.ensureAudioContext()
    const token = ++replayTokenRef.current
    void audio.ensurePiano(audio.settings).then(async (piano) => {
      piano.stop()
      await waitForChordRetrigger()
      if (token !== replayTokenRef.current) return
      return piano.playNote(tonicMidi, 1.2)
    }).catch((error: unknown) => {
      if (!isAbortError(error)) audio.handleLoadFailure(error)
    })
  }, [audio, tonicMidi])

  const playQuiz = useCallback(() => {
    if (!quiz) return
    setReplayCount((count) => count + 1)
    void playChordMidis(quiz.midis).catch(audio.handleLoadFailure)
  }, [audio.handleLoadFailure, playChordMidis, quiz])

  const playSequence = useCallback(() => {
    if (!quiz) return
    setReplayCount((count) => count + 1)
    void (async () => {
      const token = ++replayTokenRef.current
      const piano = await audio.ensurePiano(audio.settings)
      piano.stop()
      await waitForChordRetrigger()
      if (token !== replayTokenRef.current) return
      await piano.playNote(tonicMidi, 1.25)
      await new Promise((resolve) => window.setTimeout(resolve, 1_050))
      if (token !== replayTokenRef.current) return
      piano.stop()
      await waitForChordRetrigger()
      if (token !== replayTokenRef.current) return
      await piano.playNotes(quiz.midis, CHORD_DEGREE_PLAYBACK_DURATION_SEC)
    })().catch(audio.handleLoadFailure)
  }, [audio, quiz, tonicMidi])

  const playSelected = useCallback(() => {
    if (!quiz || !audio.correctionWrongSelection) return
    const midis = createChordMidis(
      tonicMidi,
      Number(audio.correctionWrongSelection),
      quiz.inversion,
    )
    void playChordMidis(midis).catch(audio.handleLoadFailure)
  }, [audio.correctionWrongSelection, audio.handleLoadFailure, playChordMidis, quiz, tonicMidi])

  const playComparison = useCallback(() => {
    if (!quiz || !audio.correctionWrongSelection) return
    void (async () => {
      const token = ++replayTokenRef.current
      const piano = await audio.ensurePiano(audio.settings)
      piano.stop()
      await waitForChordRetrigger()
      if (token !== replayTokenRef.current) return
      await piano.playNotes(
        createChordMidis(tonicMidi, Number(audio.correctionWrongSelection), quiz.inversion),
        CHORD_DEGREE_PLAYBACK_DURATION_SEC,
      )
      await new Promise((resolve) => window.setTimeout(resolve, 2_000))
      if (token !== replayTokenRef.current) return
      piano.stop()
      await waitForChordRetrigger()
      if (token !== replayTokenRef.current) return
      await piano.playNotes(quiz.midis, CHORD_DEGREE_PLAYBACK_DURATION_SEC)
    })().catch(audio.handleLoadFailure)
  }, [audio, quiz, tonicMidi])

  const applyPreset = useCallback((preset: 'beginner' | 'standard' | 'advanced') => {
    if (preset === 'beginner') {
      setKey('c-major')
      setRange('primary')
      setInversionMode('root')
      return
    }
    if (preset === 'standard') {
      setKey('c-major')
      setRange('all')
      setInversionMode('root')
      return
    }
    setKey('random')
    setRange('all')
    setInversionMode('random')
  }, [])

  return {
    quiz,
    history,
    key,
    range,
    customDegrees,
    inversionMode,
    replayCount,
    setKey,
    setRange,
    setCustomDegrees,
    setInversionMode,
    cancelReplay,
    resetQuiz,
    run,
    playDo,
    playQuiz,
    playSequence,
    playSelected,
    playComparison,
    applyPreset,
  }
}
