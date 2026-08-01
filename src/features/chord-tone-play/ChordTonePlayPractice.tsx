import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GuitarPitchReading } from '../../audio/guitarPitch'
import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { Button } from '../../common/ui/Button'
import { Card } from '../../common/ui/Card'
import { SegmentedControl } from '../../common/ui/SegmentedControl'
import { useAudioEngine } from '../../hooks/useAudioEngine'
import { useGuitarInput } from '../../hooks/useGuitarInput'
import {
  chromaticNoteName,
  classifyChordToneAnswer,
  createChordToneProgression,
  formatChordToneReactionMs,
  type ChordToneProgression,
  type ChordToneQuestion,
  type TargetChordToneDegree,
} from '../../quiz/chordTonePlay'
import { createDefaultSettings } from '../../quiz/sequencer'
import { FretboardBoard, type FretboardPluck } from '../fretboard/FretboardBoard'
import { FRETBOARD_NOTE_NAMES, type FretboardCell, type FretboardQuestion } from '../fretboard/fretboard'

const CHORD_TONE_META: AppShellMeta = {
  eyebrow: '吉他和声',
  title: '和弦寻音',
  subtitle: '看见七和弦，在指板上弹出它的 3 音与 7 音',
  badge: '吉他练习',
  accent: '#c084fc',
}

type Feedback = {
  tone: 'correct' | 'wrong' | 'neutral'
  text: string
} | null

type SessionStats = {
  completed: number
  clean: number
  mistakes: number
  totalReactionMs: number
  fastestReactionMs: number | null
}

type InputMode = 'fretboard' | 'microphone'

const EMPTY_STATS: SessionStats = {
  completed: 0,
  clean: 0,
  mistakes: 0,
  totalReactionMs: 0,
  fastestReactionMs: null,
}
const EMPTY_PLUCK: FretboardPluck = { stringIndex: -1, fret: 1, token: 0 }
const INPUT_MODE_OPTIONS = [
  { value: 'fretboard' as const, label: '虚拟指板' },
  { value: 'microphone' as const, label: '麦克风' },
]
const REFERENCE_DURATION_MS = 1_700
const NEXT_QUESTION_DELAY_MS = 1_150

function detectedPitchLabel(reading: GuitarPitchReading | null): string {
  if (!reading) return '等待拨弦'
  const cents = reading.cents === 0 ? '音准' : `${reading.cents > 0 ? '+' : ''}${reading.cents}¢`
  return `${chromaticNoteName(reading.midi)} · ${cents}`
}

export function ChordTonePlayPractice() {
  const [progression, setProgression] = useState<ChordToneProgression>(() => createChordToneProgression())
  const [progressionPosition, setProgressionPosition] = useState(0)
  const [question, setQuestion] = useState<ChordToneQuestion>(() => progression.questions[0]!)
  const [answeredDegrees, setAnsweredDegrees] = useState<Set<TargetChordToneDegree>>(() => new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [referencePlaying, setReferencePlaying] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('fretboard')
  const [wrongCellKey, setWrongCellKey] = useState<string | null>(null)
  const [foundCellKeys, setFoundCellKeys] = useState<string[]>([])
  const [fretboardMarkers, setFretboardMarkers] = useState<Record<string, { label: string; tone: 'guide' }>>({})
  const [pluck, setPluck] = useState<FretboardPluck>(EMPTY_PLUCK)
  const [boardFullscreen, setBoardFullscreen] = useState(false)

  const questionRef = useRef(question)
  const progressionRef = useRef(progression)
  const progressionPositionRef = useRef(0)
  const answeredDegreesRef = useRef(new Set<TargetChordToneDegree>())
  const isRunningRef = useRef(false)
  const referencePlayingRef = useRef(false)
  const questionHadMistakeRef = useRef(false)
  const nextQuestionTimerRef = useRef<number | null>(null)
  const referenceTimerRef = useRef<number | null>(null)
  const referenceTokenRef = useRef(0)
  const activeReactionStartedAtRef = useRef<number | null>(null)
  const accumulatedReactionMsRef = useRef(0)
  const boardFullscreenRef = useRef<HTMLDivElement | null>(null)

  const pianoSettings = useMemo(() => ({
    ...createDefaultSettings(),
    rootMin: 48,
    rootMax: 71,
  }), [])
  const {
    ensurePiano,
    loadProgress,
    loadIndeterminate,
    stopReplay,
  } = useAudioEngine()

  useEffect(() => { questionRef.current = question }, [question])

  const exitBoardFullscreen = useCallback(async () => {
    setBoardFullscreen(false)
    try {
      screen.orientation.unlock()
    } catch {
      // Direction locking is optional and is not available in every browser.
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const enterBoardFullscreen = useCallback(async () => {
    setBoardFullscreen(true)
    const container = boardFullscreenRef.current
    if (container?.requestFullscreen && !document.fullscreenElement) {
      await container.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined)
    }
    try {
      await screen.orientation.lock('landscape')
    } catch {
      // Portrait phones use the shared CSS rotation fallback.
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setBoardFullscreen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && boardFullscreen) void exitBoardFullscreen()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [boardFullscreen, exitBoardFullscreen])

  useEffect(() => {
    if (!boardFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [boardFullscreen])

  const clearTimers = useCallback(() => {
    if (nextQuestionTimerRef.current !== null) window.clearTimeout(nextQuestionTimerRef.current)
    if (referenceTimerRef.current !== null) window.clearTimeout(referenceTimerRef.current)
    nextQuestionTimerRef.current = null
    referenceTimerRef.current = null
  }, [])

  const pauseReactionClock = useCallback(() => {
    if (activeReactionStartedAtRef.current === null) return
    accumulatedReactionMsRef.current += performance.now() - activeReactionStartedAtRef.current
    activeReactionStartedAtRef.current = null
  }, [])

  const resumeReactionClock = useCallback(() => {
    if (!isRunningRef.current || answeredDegreesRef.current.size >= 2) return
    activeReactionStartedAtRef.current = performance.now()
  }, [])

  const playReference = useCallback(async (targetQuestion = questionRef.current) => {
    const token = referenceTokenRef.current + 1
    referenceTokenRef.current = token
    if (referenceTimerRef.current !== null) window.clearTimeout(referenceTimerRef.current)
    stopReplay()
    pauseReactionClock()
    referencePlayingRef.current = true
    setReferencePlaying(true)
    setAudioError(null)

    try {
      const piano = await ensurePiano(pianoSettings)
      if (referenceTokenRef.current !== token) return
      piano.stop()
      await piano.playNotes(targetQuestion.midis, 1.55, 76)
      referenceTimerRef.current = window.setTimeout(() => {
        if (referenceTokenRef.current !== token) return
        referencePlayingRef.current = false
        setReferencePlaying(false)
        referenceTimerRef.current = null
        resumeReactionClock()
      }, REFERENCE_DURATION_MS)
    } catch (error) {
      if (referenceTokenRef.current !== token) return
      referencePlayingRef.current = false
      setReferencePlaying(false)
      setAudioError(error instanceof Error ? error.message : '参考和弦播放失败')
      resumeReactionClock()
    }
  }, [ensurePiano, pauseReactionClock, pianoSettings, resumeReactionClock, stopReplay])

  const prepareQuestion = useCallback((nextQuestion: ChordToneQuestion) => {
    questionRef.current = nextQuestion
    answeredDegreesRef.current = new Set()
    questionHadMistakeRef.current = false
    activeReactionStartedAtRef.current = null
    accumulatedReactionMsRef.current = 0
    setQuestion(nextQuestion)
    setAnsweredDegrees(new Set())
    setWrongCellKey(null)
    setFoundCellKeys([])
    setFretboardMarkers({})
    setFeedback(null)
    void playReference(nextQuestion)
  }, [playReference])

  const submitMidi = useCallback((midi: number, cellKey?: string) => {
    if (!isRunningRef.current || referencePlayingRef.current) return
    if (answeredDegreesRef.current.size >= questionRef.current.targetDegrees.length) return
    const activeQuestion = questionRef.current
    const result = classifyChordToneAnswer(activeQuestion, midi)

    if (result.kind === 'target') {
      const degree = result.tone.degree as TargetChordToneDegree
      if (answeredDegreesRef.current.has(degree)) {
        setFeedback({
          tone: 'neutral',
          text: `${result.tone.noteName} 已完成，请继续找另一个目标音`,
        })
        return
      }

      const nextAnswered = new Set(answeredDegreesRef.current)
      nextAnswered.add(degree)
      answeredDegreesRef.current = nextAnswered
      setAnsweredDegrees(nextAnswered)
      setWrongCellKey(null)
      if (cellKey) {
        setFoundCellKeys((current) => [...current, cellKey])
        setFretboardMarkers((current) => ({
          ...current,
          [cellKey]: { label: result.tone.noteName, tone: 'guide' },
        }))
      }

      if (nextAnswered.size < activeQuestion.targetDegrees.length) {
        setFeedback({
          tone: 'correct',
          text: `${result.tone.noteName} 正确，是 ${activeQuestion.symbol} 的 ${result.tone.degreeLabel}`,
        })
        return
      }

      const clean = !questionHadMistakeRef.current
      pauseReactionClock()
      const reactionMs = Math.round(accumulatedReactionMsRef.current)
      setStats((current) => ({
        ...current,
        completed: current.completed + 1,
        clean: current.clean + (clean ? 1 : 0),
        totalReactionMs: current.totalReactionMs + reactionMs,
        fastestReactionMs: current.fastestReactionMs === null
          ? reactionMs
          : Math.min(current.fastestReactionMs, reactionMs),
      }))
      setFeedback({
        tone: 'correct',
        text: `${activeQuestion.tones[3].noteName} 与 ${activeQuestion.tones[7].noteName} 都找到了 · ${formatChordToneReactionMs(reactionMs)}`,
      })
      nextQuestionTimerRef.current = window.setTimeout(() => {
        if (!isRunningRef.current) return
        const activeProgression = progressionRef.current
        const nextPosition = (progressionPositionRef.current + 1) % activeProgression.questions.length
        progressionPositionRef.current = nextPosition
        setProgressionPosition(nextPosition)
        prepareQuestion(activeProgression.questions[nextPosition]!)
        nextQuestionTimerRef.current = null
      }, NEXT_QUESTION_DELAY_MS)
      return
    }

    if (!questionHadMistakeRef.current) {
      questionHadMistakeRef.current = true
      setStats((current) => ({ ...current, mistakes: current.mistakes + 1 }))
    }

    if (cellKey) setWrongCellKey(cellKey)

    if (result.kind === 'other-chord-tone') {
      setFeedback({
        tone: 'wrong',
        text: `${result.tone.noteName} 是 ${activeQuestion.symbol} 的 ${result.tone.degreeLabel}，但本题需要 3 音和 7 音`,
      })
      return
    }

    setFeedback({
      tone: 'wrong',
      text: `听到 ${chromaticNoteName(result.pitchClass)}，它不是 ${activeQuestion.symbol} 的基础和弦内音`,
    })
  }, [pauseReactionClock, prepareQuestion])

  const handlePitch = useCallback((reading: GuitarPitchReading) => {
    submitMidi(reading.midi)
  }, [submitMidi])

  const guitarInput = useGuitarInput({ onPitch: handlePitch })
  const { start: startGuitarInput, stop: stopGuitarInput } = guitarInput

  const startSession = useCallback(() => {
    clearTimers()
    isRunningRef.current = true
    setIsRunning(true)
    setStats(EMPTY_STATS)
    const nextProgression = createChordToneProgression()
    progressionRef.current = nextProgression
    progressionPositionRef.current = 0
    setProgression(nextProgression)
    setProgressionPosition(0)
    prepareQuestion(nextProgression.questions[0]!)
    if (inputMode === 'microphone' && guitarInput.status !== 'listening') void startGuitarInput()
  }, [clearTimers, guitarInput.status, inputMode, prepareQuestion, startGuitarInput])

  const stopSession = useCallback(() => {
    clearTimers()
    referenceTokenRef.current += 1
    referencePlayingRef.current = false
    isRunningRef.current = false
    activeReactionStartedAtRef.current = null
    accumulatedReactionMsRef.current = 0
    stopReplay()
    stopGuitarInput()
    setReferencePlaying(false)
    setIsRunning(false)
    setFeedback(null)
  }, [clearTimers, stopGuitarInput, stopReplay])

  useEffect(() => () => {
    clearTimers()
    referenceTokenRef.current += 1
  }, [clearTimers])

  const microphoneCopy = guitarInput.status === 'starting'
    ? '正在连接麦克风…'
    : guitarInput.status === 'error'
      ? guitarInput.error
      : guitarInput.status === 'listening'
        ? referencePlaying
          ? '参考和弦播放中，暂不判题'
          : detectedPitchLabel(guitarInput.reading)
        : '开始后将启用麦克风'

  const cleanRate = stats.completed > 0 ? Math.round(stats.clean / stats.completed * 100) : 0
  const averageReactionMs = stats.completed > 0
    ? Math.round(stats.totalReactionMs / stats.completed)
    : null
  const boardQuestion: FretboardQuestion = {
    region: { stringStart: 0, fretStart: 0 },
    targetNote: FRETBOARD_NOTE_NAMES[question.tones[3].pitchClass]!,
  }
  const canAnswer = isRunning && !referencePlaying && answeredDegrees.size < question.targetDegrees.length
  const handleFretboardSelect = (cell: FretboardCell) => {
    const cellKey = `${cell.stringIndex}:${cell.fret}`
    setPluck((current) => ({
      stringIndex: cell.stringIndex,
      fret: cell.fret,
      token: current.token + 1,
    }))
    submitMidi(cell.midi, cellKey)
  }

  return (
    <AppShell
      meta={CHORD_TONE_META}
      wide
      focused={isRunning}
      footer={isRunning ? (
        <Button onClick={stopSession} variant="ghost" className="w-full max-w-xl py-3.5 text-base">
          结束本次练习
        </Button>
      ) : (
        <Button onClick={startSession} className="w-full max-w-xl !bg-sky-400 py-3.5 !text-slate-950 hover:!bg-sky-300">
          开始寻找 3 音与 7 音
        </Button>
      )}
    >
      {!isRunning && (
        <Card className="p-4">
          <p className="mb-3 text-xs font-medium text-[var(--text-secondary)]">答题方式</p>
          <SegmentedControl options={INPUT_MODE_OPTIONS} value={inputMode} onChange={setInputMode} />
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            {inputMode === 'fretboard'
              ? '直接点击六弦 0–12 品指板，无需麦克风，适合手机练习。'
              : '使用吉他单音输入；播放参考和弦期间会暂停判题。'}
          </p>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="本次练习统计">
        {[
          { label: '完成和弦', value: String(stats.completed) },
          { label: '一次正确率', value: `${cleanRate}%` },
          { label: '平均反应', value: formatChordToneReactionMs(averageReactionMs) },
          { label: '最快反应', value: formatChordToneReactionMs(stats.fastestReactionMs) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.035] px-3 py-3 text-center">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <Card className="flex flex-1 flex-col gap-6 border-sky-300/10 p-5 sm:p-7">
        <div className="text-center">
          <p className="text-xs font-medium text-[var(--text-secondary)]">{progression.keyName} · {progression.name}</p>
          <div className="mx-auto mt-3 flex max-w-xl items-center justify-center gap-1.5" aria-label={`当前和弦进行 ${progression.name}`}>
            {progression.degreeLabels.map((degree, index) => (
              <span
                key={`${degree}:${index}`}
                className={`rounded-full border px-2 py-1 text-xs font-bold transition ${index === progressionPosition ? 'border-sky-400 bg-sky-400/15 text-sky-300' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}
                style={{ minWidth: '2.25rem' }}
              >
                {degree}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold tracking-[.16em] text-sky-300">{question.qualityLabel}</p>
          <h2 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">{question.symbol}</h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">依次弹出两个单音 · 顺序不限 · 任意八度</p>
        </div>

        <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3">
          {question.targetDegrees.map((degree) => {
            const tone = question.tones[degree]
            const answered = answeredDegrees.has(degree)
            return (
              <div
                key={degree}
                className={`rounded-2xl border p-5 text-center transition ${answered ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'}`}
              >
                <p className={`text-sm font-semibold ${answered ? 'text-emerald-300' : 'text-sky-200'}`}>{tone.degreeLabel}</p>
                <p className="mt-2 text-3xl font-bold">{answered ? tone.noteName : '·'}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{answered ? '已找到' : '等待弹奏'}</p>
              </div>
            )
          })}
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-black/10 p-4 text-center">
          <Button
            variant="ghost"
            onClick={() => void playReference()}
            disabled={referencePlaying}
            className="min-h-11 w-full sm:w-auto sm:min-w-48"
          >
            {referencePlaying
              ? loadProgress !== null
                ? `加载钢琴音色 ${loadProgress}%`
                : loadIndeterminate
                  ? '加载钢琴音色…'
                  : '正在播放参考和弦…'
              : '♪ 重听参考和弦'}
          </Button>
          {inputMode === 'microphone' && (
            <p className={`min-h-5 text-sm ${guitarInput.status === 'error' ? 'text-rose-300' : 'text-[var(--text-secondary)]'}`}>
              {microphoneCopy}
            </p>
          )}
          {audioError && <p className="text-sm text-rose-300">{audioError}</p>}
        </div>

        {inputMode === 'fretboard' && (
          <div
            ref={boardFullscreenRef}
            className={`fretboard-focus-shell${boardFullscreen ? ' fretboard-focus-shell--fullscreen fixed inset-0 z-[100] h-dvh w-screen overflow-hidden bg-[#080d14]' : ''}`}
          >
            <div className={`rounded-2xl border border-[var(--border-subtle)] bg-[#080d14] p-2 sm:p-4 ${boardFullscreen ? 'flex h-full flex-col !p-3' : ''}`}>
              <div className={`flex items-center justify-between gap-3 ${boardFullscreen ? 'mb-2 min-h-11' : 'mb-3'}`}>
                <div>
                  <p className={`font-semibold ${boardFullscreen ? 'text-base text-white' : 'text-xs text-[var(--text-secondary)]'}`}>
                    {boardFullscreen
                      ? `${question.symbol} · 已找到 ${answeredDegrees.size} / 2`
                      : referencePlaying
                        ? '参考和弦播放结束后即可点击指板'
                        : canAnswer
                          ? '点击任意八度的目标音'
                          : '准备下一题…'}
                  </p>
                  {boardFullscreen && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {question.tones[3].degreeLabel} {answeredDegrees.has('3') ? question.tones[3].noteName : '·'}
                      {' · '}
                      {question.tones[7].degreeLabel} {answeredDegrees.has('7') ? question.tones[7].noteName : '·'}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-300/15"
                  onClick={() => void (boardFullscreen ? exitBoardFullscreen() : enterBoardFullscreen())}
                  aria-label={boardFullscreen ? '退出旋转指板' : '旋转并全屏显示指板'}
                  aria-pressed={boardFullscreen}
                >
                  <span aria-hidden="true">{boardFullscreen ? '↙' : '↗'}</span>
                  {boardFullscreen ? '退出旋转' : '旋转全屏'}
                </button>
              </div>
              <FretboardBoard
                question={boardQuestion}
                showQuestion
                canAnswer={canAnswer}
                revealAnswer={false}
                wrongCellKey={wrongCellKey}
                pluck={pluck}
                wholeBoard
                foundCellKeys={foundCellKeys}
                fullscreen={boardFullscreen}
                markers={fretboardMarkers}
                onSelect={(cell) => handleFretboardSelect(cell)}
              />
            </div>
          </div>
        )}

        <div aria-live="polite" className="min-h-14 text-center">
          {feedback ? (
            <p className={`text-sm leading-6 ${feedback.tone === 'correct' ? 'text-emerald-300' : feedback.tone === 'wrong' ? 'text-amber-200' : 'text-[var(--text-secondary)]'}`}>
              {feedback.text}
            </p>
          ) : (
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {isRunning ? '参考和弦结束后开始拨弦，答完后会沿当前和弦进行进入下一题。' : '每局随机选择调性与常见和弦进行，并按进行顺序循环出题。'}
            </p>
          )}
        </div>
      </Card>
    </AppShell>
  )
}
