import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BeatScheduler } from '../../audio/beatScheduler'
import { createAudioContext, unlockAudioContextSync } from '../../audio/context'
import type { GuitarPitchReading } from '../../audio/guitarPitch'
import { scheduleMetronomeClick } from '../../audio/metronomeClick'
import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { Button } from '../../common/ui/Button'
import { Card } from '../../common/ui/Card'
import {
  loadPentatonicPlayPreferences,
  usePersistedPentatonicPlayPreferences,
} from '../../hooks/usePersistedToolSettings'
import { useGuitarInput } from '../../hooks/useGuitarInput'
import { MAX_BPM, MIN_BPM, clampBpm } from '../../quiz/metronome'
import { FretboardBoard, type FretboardPluck } from '../fretboard/FretboardBoard'
import type { FretboardQuestion } from '../fretboard/fretboard'
import {
  PENTATONIC_REPETITIONS_PER_POSITION,
  PENTATONIC_RUN_INDEXES,
  PENTATONIC_SCALES,
  advancePentatonicRepetition,
  createPentatonicRun,
  createPentatonicQuestion,
  midiMatchesNoteName,
  noteNameForPitchClass,
  questionKey,
  type PentatonicQuestion,
  type PentatonicScaleId,
} from './pentatonicPlay'

const PENTATONIC_PLAY_META: AppShellMeta = {
  eyebrow: '吉他音阶',
  title: '五声走位',
  subtitle: '在节拍陪伴下，连续弹完一遍上行与下行',
  badge: '节拍伴练',
  accent: '#2dd4bf',
}

type Phase = 'idle' | 'playing' | 'feedback'
type NoteFeedback = { tone: 'correct' | 'wrong'; text: string } | null

const EMPTY_PLUCK: FretboardPluck = { stringIndex: -1, fret: 1, token: 0 }

function detectedNoteLabel(reading: GuitarPitchReading): string {
  const note = noteNameForPitchClass(reading.midi)
  const cents = reading.cents === 0 ? '音准' : `${reading.cents > 0 ? '+' : ''}${reading.cents}¢`
  return `${note} · ${cents}`
}

export function PentatonicPlayPractice() {
  const [initialPreferences] = useState(loadPentatonicPlayPreferences)
  const [scaleId, setScaleId] = useState<PentatonicScaleId>(initialPreferences.scaleId)
  const [bpm, setBpm] = useState(initialPreferences.bpm)
  const [clickEnabled, setClickEnabled] = useState(initialPreferences.clickEnabled)
  const [autoIncreaseBpm, setAutoIncreaseBpm] = useState(initialPreferences.autoIncreaseBpm)
  const [activeBeat, setActiveBeat] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [question, setQuestion] = useState<PentatonicQuestion>(() => (
    createPentatonicQuestion(Math.random, initialPreferences.scaleId)
  ))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedRepetitions, setCompletedRepetitions] = useState(0)
  const [completedRounds, setCompletedRounds] = useState(0)
  const [noteFeedback, setNoteFeedback] = useState<NoteFeedback>(null)

  const phaseRef = useRef<Phase>('idle')
  const questionRef = useRef(question)
  const currentIndexRef = useRef(0)
  const completedRepetitionsRef = useRef(0)
  const scaleIdRef = useRef<PentatonicScaleId>(initialPreferences.scaleId)
  const sessionRootNoteRef = useRef(question.rootNote)
  const previousQuestionKeyRef = useRef<string | undefined>(undefined)
  const nextRoundTimerRef = useRef<number | null>(null)
  const tempoContextRef = useRef<AudioContext | null>(null)
  const tempoSchedulerRef = useRef<BeatScheduler | null>(null)
  const tempoOscillatorsRef = useRef(new Set<OscillatorNode>())
  const bpmRef = useRef(bpm)
  const clickEnabledRef = useRef(clickEnabled)
  const autoIncreaseBpmRef = useRef(autoIncreaseBpm)

  useEffect(() => { scaleIdRef.current = scaleId }, [scaleId])
  useEffect(() => { questionRef.current = question }, [question])
  useEffect(() => {
    bpmRef.current = bpm
    tempoSchedulerRef.current?.setBpm(bpm)
  }, [bpm])
  useEffect(() => { clickEnabledRef.current = clickEnabled }, [clickEnabled])
  useEffect(() => { autoIncreaseBpmRef.current = autoIncreaseBpm }, [autoIncreaseBpm])

  usePersistedPentatonicPlayPreferences({ scaleId, bpm, clickEnabled, autoIncreaseBpm })

  const clearNextRoundTimer = useCallback(() => {
    if (nextRoundTimerRef.current !== null) window.clearTimeout(nextRoundTimerRef.current)
    nextRoundTimerRef.current = null
  }, [])

  const stopTempo = useCallback(() => {
    tempoSchedulerRef.current?.stop()
    tempoSchedulerRef.current = null
    for (const oscillator of tempoOscillatorsRef.current) {
      try { oscillator.stop() } catch { /* already stopped */ }
    }
    tempoOscillatorsRef.current.clear()
    setActiveBeat(null)
  }, [])

  const startTempo = useCallback(() => {
    stopTempo()
    const context = tempoContextRef.current && tempoContextRef.current.state !== 'closed'
      ? tempoContextRef.current
      : createAudioContext()
    tempoContextRef.current = context
    unlockAudioContextSync(context)

    const scheduler = new BeatScheduler(context, {
      bpm: bpmRef.current,
      beatsPerBar: 4,
      onSchedule: ({ beat, time }) => {
        if (!clickEnabledRef.current) return
        for (const oscillator of scheduleMetronomeClick(context, time, {
          strong: beat === 0,
          volume: beat === 0 ? 0.16 : 0.08,
        })) {
          tempoOscillatorsRef.current.add(oscillator)
          oscillator.addEventListener(
            'ended',
            () => tempoOscillatorsRef.current.delete(oscillator),
            { once: true },
          )
        }
      },
      onTick: ({ beat }) => setActiveBeat(beat),
    })
    tempoSchedulerRef.current = scheduler
    scheduler.start()
  }, [stopTempo])

  const beginRound = useCallback(() => {
    clearNextRoundTimer()
    const next = createPentatonicQuestion(
      Math.random,
      scaleIdRef.current,
      previousQuestionKeyRef.current,
      sessionRootNoteRef.current,
    )
    previousQuestionKeyRef.current = questionKey(next)
    questionRef.current = next
    currentIndexRef.current = 0
    completedRepetitionsRef.current = 0
    setQuestion(next)
    setCurrentIndex(0)
    setCompletedRepetitions(0)
    setNoteFeedback(null)
    phaseRef.current = 'playing'
    setPhase('playing')
  }, [clearNextRoundTimer])

  const repeatCurrentPosition = useCallback(() => {
    clearNextRoundTimer()
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setNoteFeedback(null)
    phaseRef.current = 'playing'
    setPhase('playing')
  }, [clearNextRoundTimer])

  const resetRoundProgress = useCallback((text: string) => {
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setNoteFeedback({ tone: 'wrong', text })
  }, [])

  const handlePitch = useCallback((reading: GuitarPitchReading) => {
    if (phaseRef.current !== 'playing') return
    const activeQuestion = questionRef.current
    const runNotes = createPentatonicRun(activeQuestion.notes)
    const index = currentIndexRef.current
    const expected = runNotes[index]
    if (!expected) return

    if (!midiMatchesNoteName(reading.midi, expected)) {
      resetRoundProgress(`听到 ${noteNameForPitchClass(reading.midi)}，请从根音 ${activeQuestion.rootNote} 重来`)
      return
    }

    const nextIndex = index + 1
    currentIndexRef.current = nextIndex
    setCurrentIndex(nextIndex)
    if (nextIndex < runNotes.length) {
      setNoteFeedback({ tone: 'correct', text: `${expected} 正确 · 继续弹 ${runNotes[nextIndex]}` })
      return
    }

    phaseRef.current = 'feedback'
    setPhase('feedback')
    const repetition = advancePentatonicRepetition(completedRepetitionsRef.current)
    completedRepetitionsRef.current = repetition.completedRepetitions
    setCompletedRepetitions(repetition.completedRepetitions)
    if (repetition.positionComplete) {
      let speedCopy = ''
      if (autoIncreaseBpmRef.current && bpmRef.current < MAX_BPM) {
        const nextBpm = clampBpm(bpmRef.current + 5)
        bpmRef.current = nextBpm
        tempoSchedulerRef.current?.setBpm(nextBpm)
        setBpm(nextBpm)
        speedCopy = ` · 下一轮 ${nextBpm} BPM`
      }
      setNoteFeedback({ tone: 'correct', text: `这个位置已完成 3 遍${speedCopy}` })
      setCompletedRounds((current) => current + 1)
      nextRoundTimerRef.current = window.setTimeout(beginRound, 1200)
    } else {
      setNoteFeedback({
        tone: 'correct',
        text: `第 ${repetition.completedRepetitions} 遍完成，准备再弹一遍`,
      })
      nextRoundTimerRef.current = window.setTimeout(repeatCurrentPosition, 800)
    }
  }, [beginRound, repeatCurrentPosition, resetRoundProgress])

  const guitarInput = useGuitarInput({ onPitch: handlePitch })
  const { start: startGuitarInput, stop: stopGuitarInput } = guitarInput

  const stopSession = useCallback(() => {
    clearNextRoundTimer()
    stopGuitarInput()
    stopTempo()
    phaseRef.current = 'idle'
    setPhase('idle')
    setNoteFeedback(null)
    currentIndexRef.current = 0
    completedRepetitionsRef.current = 0
    setCurrentIndex(0)
    setCompletedRepetitions(0)
  }, [clearNextRoundTimer, stopGuitarInput, stopTempo])

  const startSession = useCallback((nextScaleId: PentatonicScaleId) => {
    clearNextRoundTimer()
    setCompletedRounds(0)
    setNoteFeedback(null)
    previousQuestionKeyRef.current = undefined

    const sessionRootNote = questionRef.current.rootNote
    scaleIdRef.current = nextScaleId
    sessionRootNoteRef.current = sessionRootNote
    setScaleId(nextScaleId)
    const firstQuestion = createPentatonicQuestion(
      Math.random,
      nextScaleId,
      undefined,
      sessionRootNote,
    )
    previousQuestionKeyRef.current = questionKey(firstQuestion)
    questionRef.current = firstQuestion
    currentIndexRef.current = 0
    completedRepetitionsRef.current = 0
    setQuestion(firstQuestion)
    setCurrentIndex(0)
    setCompletedRepetitions(0)
    phaseRef.current = 'playing'
    setPhase('playing')

    startTempo()
    if (guitarInput.status !== 'listening') void startGuitarInput()
  }, [clearNextRoundTimer, guitarInput.status, startGuitarInput, startTempo])

  useEffect(() => () => {
    clearNextRoundTimer()
    stopTempo()
    void tempoContextRef.current?.close()
  }, [clearNextRoundTimer, stopTempo])

  const isRunning = phase !== 'idle'
  const scale = PENTATONIC_SCALES[scaleId]
  const runNotes = useMemo(() => createPentatonicRun(question.notes), [question.notes])
  const runDegrees = useMemo(() => createPentatonicRun(question.degreeLabels), [question.degreeLabels])
  const guideDegree = question.degreeLabels[question.guideIndex]
  const updateBpm = (value: number) => setBpm(clampBpm(value))
  const markers = useMemo(() => ({
    [`${question.rootPosition.stringIndex}:${question.rootPosition.fret}`]: {
      label: `1·${question.rootNote}`,
      tone: 'root' as const,
    },
    [`${question.guidePosition.stringIndex}:${question.guidePosition.fret}`]: {
      label: `${guideDegree}·${question.notes[question.guideIndex]}`,
      tone: 'guide' as const,
    },
  }), [guideDegree, question])
  const boardQuestion: FretboardQuestion = {
    region: {
      stringStart: Math.min(3, question.rootPosition.stringIndex),
      fretStart: Math.min(9, question.rootPosition.fret),
    },
    targetNote: question.rootNote,
  }

  const microphoneCopy = guitarInput.status === 'starting'
    ? '正在连接麦克风…'
    : guitarInput.status === 'error'
      ? guitarInput.error
      : guitarInput.status === 'listening'
        ? guitarInput.reading
          ? `听到 ${detectedNoteLabel(guitarInput.reading)}`
          : '麦克风已就绪，请弹奏单音'
        : '开始后将启用麦克风'

  return (
    <AppShell
      meta={PENTATONIC_PLAY_META}
      wide
      footer={(
        isRunning ? (
          <Button onClick={stopSession} className="w-full max-w-xl py-3.5 text-lg" variant="ghost">
            结束本次练习
          </Button>
        ) : (
          <div className="grid w-full max-w-xl grid-cols-2 gap-3">
            <Button onClick={() => startSession('minor')} className="!bg-teal-400 py-3.5 !text-teal-950 hover:!bg-teal-300">
              开始 {question.rootNote} 小调
            </Button>
            <Button onClick={() => startSession('major')} className="!bg-amber-300 py-3.5 !text-amber-950 hover:!bg-amber-200">
              开始 {question.rootNote} 大调
            </Button>
          </div>
        )
      )}
    >
      <section className="grid grid-cols-3 gap-2" aria-label="当前练习状态">
        {[
          { label: '已完成轮次', value: String(completedRounds) },
          { label: '本位置重复', value: `${completedRepetitions}/${PENTATONIC_REPETITIONS_PER_POSITION}` },
          { label: '当前遍进度', value: `${Math.min(currentIndex, runNotes.length)}/${runNotes.length}` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.035] px-3 py-3 text-center">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <Card className="border-teal-300/10 p-4">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="伴练速度减 5"
              onClick={() => updateBpm(bpm - 5)}
              className="grid size-10 place-items-center rounded-full border border-[var(--border-subtle)] text-lg text-[var(--text-secondary)] hover:text-white"
            >
              −
            </button>
            <div className="min-w-20 text-center">
              <strong className="block text-2xl tabular-nums text-white">{bpm}</strong>
              <span className="text-[10px] font-semibold tracking-[0.16em] text-[var(--text-secondary)]">BPM</span>
            </div>
            <button
              type="button"
              aria-label="伴练速度加 5"
              onClick={() => updateBpm(bpm + 5)}
              className="grid size-10 place-items-center rounded-full border border-[var(--border-subtle)] text-lg text-[var(--text-secondary)] hover:text-white"
            >
              +
            </button>
          </div>

          <div className="flex justify-center gap-2" aria-label={`4/4 节拍伴练${isRunning ? `，当前第 ${(activeBeat ?? 0) + 1} 拍` : ''}`}>
            {[0, 1, 2, 3].map((beat) => (
              <span
                key={beat}
                className={`h-2.5 rounded-full transition-all duration-75 ${
                  isRunning && activeBeat === beat
                    ? 'w-9 bg-teal-300 shadow-[0_0_16px_rgba(45,212,191,.45)]'
                    : beat === 0
                      ? 'w-5 bg-teal-300/35'
                      : 'w-5 bg-white/15'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clickEnabled}
                onChange={(event) => setClickEnabled(event.target.checked)}
                className="accent-teal-300"
              />
              播放节拍声
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoIncreaseBpm}
                onChange={(event) => setAutoIncreaseBpm(event.target.checked)}
                className="accent-teal-300"
              />
              每轮自动 +5
            </label>
          </div>
        </div>
        <input
          aria-label="五声走位伴练速度"
          className="mt-4 w-full accent-teal-300"
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step={5}
          value={bpm}
          onChange={(event) => updateBpm(Number(event.target.value))}
        />
        <p className="mt-2 text-center text-xs text-[var(--text-secondary)]">
          节拍只作伴练，不参与落拍评分；连续完成 3 遍后可自动升速
        </p>
      </Card>

      <Card className="overflow-hidden border-teal-300/15 bg-[linear-gradient(145deg,rgba(45,212,191,.08),rgba(255,255,255,.025))] p-4 sm:p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-teal-300">
          {phase === 'feedback'
            ? completedRepetitions === PENTATONIC_REPETITIONS_PER_POSITION
              ? `第 ${completedRounds} 轮完成`
              : `第 ${completedRepetitions} 遍完成`
            : `${question.rootNote} ${scale.label} · 第 ${completedRepetitions + 1} 遍`}
        </p>

        <div className="my-5 grid grid-cols-9 gap-1 sm:gap-2" aria-label={`按顺序弹奏：${runNotes.join('，')}`}>
          {runNotes.map((note, noteIndex) => {
            const completed = noteIndex < currentIndex
            const current = phase === 'playing' && noteIndex === currentIndex
            const scaleNoteIndex = PENTATONIC_RUN_INDEXES[noteIndex]!
            const constrained = scaleNoteIndex === 0 || scaleNoteIndex === question.guideIndex
            return (
              <div
                key={`${note}-${noteIndex}`}
                className={`grid h-11 place-items-center rounded-lg border text-center transition sm:h-12 ${completed ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-200' : current ? 'scale-[1.04] border-teal-300/70 bg-teal-300/14 text-teal-100 shadow-[0_0_24px_rgba(45,212,191,.16)]' : constrained ? 'border-amber-300/20 bg-amber-300/[0.035] text-white/65' : 'border-white/8 bg-black/15 text-white/45'}`}
                title={constrained ? `${runDegrees[noteIndex]} 音使用指板标记位置` : runDegrees[noteIndex]}
              >
                <strong className="text-xs sm:text-lg">{completed ? '✓' : note}</strong>
              </div>
            )
          })}
        </div>

        <FretboardBoard
          question={boardQuestion}
          showQuestion
          canAnswer={false}
          revealAnswer={false}
          wrongCellKey={null}
          pluck={EMPTY_PLUCK}
          markers={markers}
          displayOnly
          onSelect={() => undefined}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={`min-h-14 rounded-xl border px-4 py-3 text-sm ${guitarInput.status === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : guitarInput.status === 'listening' ? 'border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-200' : 'border-white/10 bg-black/15 text-[var(--text-secondary)]'}`} role="status">
            <span className="flex items-center gap-2"><i className={`size-2 rounded-full ${guitarInput.status === 'listening' ? 'animate-pulse bg-emerald-400' : 'bg-white/25'}`} />{microphoneCopy}</span>
          </div>
          <div className={`min-h-14 rounded-xl border px-4 py-3 text-sm ${noteFeedback?.tone === 'wrong' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-teal-300/15 bg-teal-300/[0.045] text-teal-100'}`} aria-live="polite">
            {noteFeedback?.text ?? '每个位置连续完成 3 遍；弹错从当前遍的根音重新开始'}
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          本次练习固定为 {question.rootNote} {scaleId === 'minor' ? '小调' : '大调'} ·
          上行后原路下行 · 只按音名顺序判定，不限制八度
        </p>
      </Card>
    </AppShell>
  )
}
