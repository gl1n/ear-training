import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GuitarPitchReading } from '../../audio/guitarPitch'
import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { Button } from '../../common/ui/Button'
import { Card } from '../../common/ui/Card'
import { useGuitarInput } from '../../hooks/useGuitarInput'
import { FretboardBoard, type FretboardPluck } from '../fretboard/FretboardBoard'
import type { FretboardQuestion } from '../fretboard/fretboard'
import {
  PENTATONIC_SCALES,
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
  subtitle: '守住指定音位，自行组织一条五声音阶指法',
  badge: '音名判定',
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
  const [scaleId, setScaleId] = useState<PentatonicScaleId>('minor')
  const [phase, setPhase] = useState<Phase>('idle')
  const [question, setQuestion] = useState<PentatonicQuestion>(() => createPentatonicQuestion())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedRounds, setCompletedRounds] = useState(0)
  const [noteFeedback, setNoteFeedback] = useState<NoteFeedback>(null)

  const phaseRef = useRef<Phase>('idle')
  const questionRef = useRef(question)
  const currentIndexRef = useRef(0)
  const scaleIdRef = useRef<PentatonicScaleId>('minor')
  const sessionRootNoteRef = useRef(question.rootNote)
  const previousQuestionKeyRef = useRef<string | undefined>(undefined)
  const nextRoundTimerRef = useRef<number | null>(null)

  useEffect(() => { scaleIdRef.current = scaleId }, [scaleId])
  useEffect(() => { questionRef.current = question }, [question])

  const clearNextRoundTimer = useCallback(() => {
    if (nextRoundTimerRef.current !== null) window.clearTimeout(nextRoundTimerRef.current)
    nextRoundTimerRef.current = null
  }, [])

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
    setQuestion(next)
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
    const index = currentIndexRef.current
    const expected = activeQuestion.notes[index]
    if (!expected) return

    if (!midiMatchesNoteName(reading.midi, expected)) {
      resetRoundProgress(`听到 ${noteNameForPitchClass(reading.midi)}，请从根音 ${activeQuestion.rootNote} 重来`)
      return
    }

    const nextIndex = index + 1
    currentIndexRef.current = nextIndex
    setCurrentIndex(nextIndex)
    if (nextIndex < activeQuestion.notes.length) {
      setNoteFeedback({ tone: 'correct', text: `${expected} 正确 · 继续弹 ${activeQuestion.notes[nextIndex]}` })
      return
    }

    phaseRef.current = 'feedback'
    setPhase('feedback')
    setNoteFeedback({ tone: 'correct', text: '五个音完成，即将进入下一轮' })
    setCompletedRounds((current) => current + 1)
    nextRoundTimerRef.current = window.setTimeout(beginRound, 1200)
  }, [beginRound, resetRoundProgress])

  const guitarInput = useGuitarInput({ onPitch: handlePitch })
  const { start: startGuitarInput, stop: stopGuitarInput } = guitarInput

  const stopSession = useCallback(() => {
    clearNextRoundTimer()
    stopGuitarInput()
    phaseRef.current = 'idle'
    setPhase('idle')
    setNoteFeedback(null)
    currentIndexRef.current = 0
    setCurrentIndex(0)
  }, [clearNextRoundTimer, stopGuitarInput])

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
    setQuestion(firstQuestion)
    setCurrentIndex(0)
    phaseRef.current = 'playing'
    setPhase('playing')

    if (guitarInput.status !== 'listening') void startGuitarInput()
  }, [clearNextRoundTimer, guitarInput.status, startGuitarInput])

  useEffect(() => () => clearNextRoundTimer(), [clearNextRoundTimer])

  const isRunning = phase !== 'idle'
  const scale = PENTATONIC_SCALES[scaleId]
  const guideDegree = question.degreeLabels[question.guideIndex]
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
      <section className="grid grid-cols-2 gap-2" aria-label="当前练习状态">
        {[
          { label: '已完成轮次', value: String(completedRounds) },
          { label: '当前轮进度', value: `${Math.min(currentIndex, 5)}/5` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.035] px-3 py-3 text-center">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <Card className="overflow-hidden border-teal-300/15 bg-[linear-gradient(145deg,rgba(45,212,191,.08),rgba(255,255,255,.025))] p-4 sm:p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-teal-300">
          {phase === 'feedback' ? `第 ${completedRounds} 轮完成` : `${question.rootNote} ${scale.label}`}
        </p>

        <div className="my-5 grid grid-cols-5 gap-2" aria-label={`按顺序弹奏：${question.notes.join('，')}`}>
          {question.notes.map((note, noteIndex) => {
            const completed = noteIndex < currentIndex
            const current = phase === 'playing' && noteIndex === currentIndex
            const constrained = noteIndex === 0 || noteIndex === question.guideIndex
            return (
              <div
                key={`${note}-${noteIndex}`}
                className={`grid h-12 place-items-center rounded-lg border text-center transition ${completed ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-200' : current ? 'scale-[1.04] border-teal-300/70 bg-teal-300/14 text-teal-100 shadow-[0_0_24px_rgba(45,212,191,.16)]' : constrained ? 'border-amber-300/20 bg-amber-300/[0.035] text-white/65' : 'border-white/8 bg-black/15 text-white/45'}`}
                title={constrained ? `${question.degreeLabels[noteIndex]} 音使用指板标记位置` : question.degreeLabels[noteIndex]}
              >
                <strong className="text-sm sm:text-lg">{completed ? '✓' : note}</strong>
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
            {noteFeedback?.text ?? '按顺序弹完五个音；弹错从根音重新开始'}
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          本次练习固定为 {question.rootNote} {scaleId === 'minor' ? '小调' : '大调'} · 只按音名判定，不限制八度
        </p>
      </Card>
    </AppShell>
  )
}
