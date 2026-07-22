import { useCallback, useEffect, useRef, useState } from 'react'
import { BeatScheduler, stepDurationSec, type BeatPosition } from '../../audio/beatScheduler'
import { createAudioContext, unlockAudioContext, unlockAudioContextSync } from '../../audio/context'
import { scheduleMetronomeClick } from '../../audio/metronomeClick'
import { createPiano, type Piano } from '../../audio/piano'
import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { Button } from '../../common/ui/Button'
import {
  loadMetronomePreferences,
  loadModalScalePreferences,
  usePersistedMetronomeBpm,
  usePersistedModalScalePreferences,
} from '../../hooks/usePersistedToolSettings'
import { MAX_BPM, MIN_BPM, clampBpm } from '../../quiz/metronome'
import {
  MODAL_SCALE_IDS,
  MODAL_SCALES,
  SCALE_COUNT_IN_STEPS,
  SCALE_PHRASE_STEPS,
  SCALE_TONIC_MAX_MIDI,
  SCALE_TONIC_MIN_MIDI,
  createScalePhrase,
  shuffleTonicPitchClasses,
  tonicMidiForPitchClass,
  type ModalScaleId,
  type ScalePhraseNote,
} from '../../quiz/modalScale'
import { isAbortError } from '../../utils/abort'

const SCALE_META: AppShellMeta = {
  eyebrow: '相对音感',
  title: '音阶漫游',
  subtitle: '让每一个音都成为 do，在稳定节拍中熟悉调式色彩',
  badge: '无限模式',
  accent: '#34d399',
}

type ScalePhase = 'idle' | 'loading' | 'count-in' | 'playing' | 'paused' | 'error'

type ScheduledRound = {
  tonicMidi: number
  phrase: ScalePhraseNote[]
}

const DISPLAY_STEPS = [
  'do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do',
  'si', 'la', 'sol', 'fa', 'mi', 're', 'do', '—',
] as const

function phaseCopy(phase: ScalePhase, round: number): { kicker: string; title: string; detail: string } {
  if (phase === 'loading') return { kicker: '正在准备', title: '加载钢琴音色', detail: '首次使用可能需要片刻' }
  if (phase === 'count-in') return { kicker: '预备', title: '听四拍，找到律动', detail: '下一小节第一拍就是新的 do' }
  if (phase === 'playing') return { kicker: `第 ${round} 轮`, title: '跟随新的 do', detail: '只感受音级关系，不必判断绝对调性' }
  if (phase === 'paused') return { kicker: '已暂停', title: '耳朵休息一下', detail: '继续时会重新给四拍预备' }
  if (phase === 'error') return { kicker: '播放失败', title: '钢琴音色没有准备好', detail: '可以再次尝试，或检查浏览器音频权限' }
  return { kicker: '4/4 · 八分音符', title: '选择调式，开始无限聆听', detail: '一小节上行，一小节下行，每轮更换 do' }
}

export function ModalScalePractice() {
  const [initialScalePreferences] = useState(loadModalScalePreferences)
  const [initialMetronomePreferences] = useState(loadMetronomePreferences)
  const [scaleId, setScaleId] = useState<ModalScaleId>(initialScalePreferences.scaleId)
  const [clickEnabled, setClickEnabled] = useState(initialScalePreferences.clickEnabled)
  const [bpm, setBpm] = useState(initialMetronomePreferences.bpm)
  const [phase, setPhase] = useState<ScalePhase>('idle')
  const [round, setRound] = useState(0)
  const [activeBeat, setActiveBeat] = useState<number | null>(null)
  const [activePhraseStep, setActivePhraseStep] = useState<number | null>(null)
  const [loadProgress, setLoadProgress] = useState<number | null>(null)

  const contextRef = useRef<AudioContext | null>(null)
  const pianoRef = useRef<Piano | null>(null)
  const schedulerRef = useRef<BeatScheduler | null>(null)
  const loadControllerRef = useRef<AbortController | null>(null)
  const oscillatorsRef = useRef(new Set<OscillatorNode>())
  const sessionTokenRef = useRef(0)
  const tonicBagRef = useRef<number[]>([])
  const tonicBagIndexRef = useRef(0)
  const previousPitchClassRef = useRef<number | undefined>(undefined)
  const scheduledRoundsRef = useRef(new Map<number, ScheduledRound>())
  const scaleIdRef = useRef(scaleId)
  const clickEnabledRef = useRef(clickEnabled)
  const bpmRef = useRef(bpm)

  usePersistedMetronomeBpm(bpm)
  usePersistedModalScalePreferences({ scaleId, clickEnabled })

  useEffect(() => { scaleIdRef.current = scaleId }, [scaleId])
  useEffect(() => { clickEnabledRef.current = clickEnabled }, [clickEnabled])
  useEffect(() => { bpmRef.current = bpm }, [bpm])

  const stopScheduledAudio = useCallback(() => {
    schedulerRef.current?.stop()
    schedulerRef.current = null
    pianoRef.current?.stop()
    for (const oscillator of oscillatorsRef.current) {
      try { oscillator.stop() } catch { /* already stopped */ }
    }
    oscillatorsRef.current.clear()
  }, [])

  const resetSessionTimeline = useCallback(() => {
    tonicBagRef.current = []
    tonicBagIndexRef.current = 0
    previousPitchClassRef.current = undefined
    scheduledRoundsRef.current.clear()
    setRound(0)
    setActiveBeat(null)
    setActivePhraseStep(null)
  }, [])

  const takeNextTonic = useCallback(() => {
    if (tonicBagIndexRef.current >= tonicBagRef.current.length) {
      tonicBagRef.current = shuffleTonicPitchClasses(Math.random, previousPitchClassRef.current)
      tonicBagIndexRef.current = 0
    }
    const pitchClass = tonicBagRef.current[tonicBagIndexRef.current++]!
    previousPitchClassRef.current = pitchClass
    return tonicMidiForPitchClass(pitchClass)
  }, [])

  const scheduleClick = useCallback((context: AudioContext, position: BeatPosition) => {
    if (!clickEnabledRef.current || position.subdivision !== 0) return
    for (const oscillator of scheduleMetronomeClick(context, position.time, {
      strong: position.beat === 0,
      volume: position.beat === 0 ? 0.16 : 0.075,
    })) {
      oscillatorsRef.current.add(oscillator)
      oscillator.addEventListener('ended', () => oscillatorsRef.current.delete(oscillator), { once: true })
    }
  }, [])

  const beginTimeline = useCallback((context: AudioContext, piano: Piano) => {
    const token = sessionTokenRef.current
    const scheduler = new BeatScheduler(context, {
      bpm: bpmRef.current,
      beatsPerBar: 4,
      subdivisionsPerBeat: 2,
      onSchedule: (position) => {
        if (sessionTokenRef.current !== token) return
        scheduleClick(context, position)
        if (position.absoluteStep < SCALE_COUNT_IN_STEPS) return

        const musicalStep = position.absoluteStep - SCALE_COUNT_IN_STEPS
        const roundIndex = Math.floor(musicalStep / SCALE_PHRASE_STEPS)
        const phraseStep = musicalStep % SCALE_PHRASE_STEPS
        if (phraseStep === 0) {
          const tonicMidi = takeNextTonic()
          scheduledRoundsRef.current.set(roundIndex, {
            tonicMidi,
            phrase: createScalePhrase(tonicMidi, scaleIdRef.current),
          })
          scheduledRoundsRef.current.delete(roundIndex - 2)
        }

        const note = scheduledRoundsRef.current.get(roundIndex)?.phrase[phraseStep]
        if (!note) return
        const eighthDuration = stepDurationSec(bpmRef.current, 2)
        void piano.playNote(note.midi, note.durationSteps * eighthDuration, 80, position.time).catch((error: unknown) => {
          if (sessionTokenRef.current !== token) return
          console.error(error)
          sessionTokenRef.current += 1
          stopScheduledAudio()
          setPhase('error')
        })
      },
      onTick: (position) => {
        if (sessionTokenRef.current !== token) return
        setActiveBeat(position.beat)
        if (position.absoluteStep < SCALE_COUNT_IN_STEPS) {
          setPhase('count-in')
          return
        }
        const musicalStep = position.absoluteStep - SCALE_COUNT_IN_STEPS
        const roundIndex = Math.floor(musicalStep / SCALE_PHRASE_STEPS)
        const phraseStep = musicalStep % SCALE_PHRASE_STEPS
        if (phraseStep === 0) setRound(roundIndex + 1)
        setActivePhraseStep(phraseStep)
        setPhase('playing')
      },
    })
    schedulerRef.current = scheduler
    scheduler.start(0.1)
  }, [scheduleClick, stopScheduledAudio, takeNextTonic])

  const start = useCallback(async () => {
    sessionTokenRef.current += 1
    const token = sessionTokenRef.current
    stopScheduledAudio()
    resetSessionTimeline()
    setPhase('loading')
    setLoadProgress(null)

    const context = contextRef.current && contextRef.current.state !== 'closed'
      ? contextRef.current
      : createAudioContext()
    contextRef.current = context
    unlockAudioContextSync(context)

    try {
      let piano = pianoRef.current
      if (!piano) {
        const controller = new AbortController()
        loadControllerRef.current = controller
        piano = await createPiano(context, {
          rootMin: SCALE_TONIC_MIN_MIDI,
          rootMax: SCALE_TONIC_MAX_MIDI,
          signal: controller.signal,
          onLoadProgress: (loaded, total) => setLoadProgress(total > 0 ? Math.round(loaded / total * 100) : null),
          onLoadingIndeterminate: () => setLoadProgress(null),
        })
        if (sessionTokenRef.current !== token) return
        pianoRef.current = piano
        loadControllerRef.current = null
      }
      await unlockAudioContext(context)
      if (sessionTokenRef.current !== token) return
      beginTimeline(context, piano)
    } catch (error) {
      if (isAbortError(error)) return
      console.error(error)
      if (sessionTokenRef.current === token) setPhase('error')
    }
  }, [beginTimeline, resetSessionTimeline, stopScheduledAudio])

  const pause = useCallback(() => {
    sessionTokenRef.current += 1
    loadControllerRef.current?.abort()
    loadControllerRef.current = null
    stopScheduledAudio()
    setActiveBeat(null)
    setActivePhraseStep(null)
    setPhase('paused')
  }, [stopScheduledAudio])

  useEffect(() => () => {
    sessionTokenRef.current += 1
    loadControllerRef.current?.abort()
    stopScheduledAudio()
    void contextRef.current?.close()
  }, [stopScheduledAudio])

  const isRunning = phase === 'loading' || phase === 'count-in' || phase === 'playing'
  const copy = phaseCopy(phase, round)
  const activeScale = MODAL_SCALES[scaleId]

  return (
    <AppShell
      meta={SCALE_META}
      wide
      footer={(
        <Button onClick={isRunning ? pause : start} className="modal-scale-session-button w-full max-w-xl py-3.5 text-lg">
          {isRunning ? '暂停练习' : phase === 'paused' ? '重新预备并继续' : phase === 'error' ? '重新尝试' : '开始无限练习'}
        </Button>
      )}
    >
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-emerald-300/15 bg-[var(--bg-surface)]">
        <div className="relative grid min-h-80 place-items-center overflow-hidden px-4 py-10 text-center sm:min-h-96">
          <div className="pointer-events-none absolute h-72 w-72 rounded-full border border-emerald-300/10 shadow-[0_0_100px_rgba(52,211,153,0.08)]" aria-hidden="true" />
          <div className="relative z-10 w-full max-w-2xl">
            <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-emerald-300">{copy.kicker}</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.detail}</p>

            <div className="mx-auto mt-8 flex max-w-xs justify-center gap-3" aria-label="4/4 拍指示器">
              {[0, 1, 2, 3].map((beat) => (
                <span
                  key={beat}
                  className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-bold transition ${activeBeat === beat && isRunning ? 'scale-beat-active border-emerald-300 bg-emerald-300 text-emerald-950' : beat === 0 ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-white/10 text-white/35'}`}
                >
                  {beat + 1}
                </span>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-8 gap-1.5" aria-label="两小节音阶乐句">
              {DISPLAY_STEPS.map((degree, step) => (
                <span
                  key={`${degree}-${step}`}
                  className={`rounded-lg border px-1 py-2 text-xs font-semibold transition sm:text-sm ${activePhraseStep === step && phase === 'playing' ? 'border-emerald-300/70 bg-emerald-300/20 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.18)]' : step === 15 ? 'border-transparent text-white/15' : 'border-white/8 bg-black/15 text-white/45'}`}
                >
                  {degree}
                </span>
              ))}
            </div>

            {phase === 'loading' && (
              <div className="mx-auto mt-7 max-w-sm" role="status">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full bg-emerald-400 transition-all ${loadProgress === null ? 'w-1/3 animate-pulse' : ''}`} style={loadProgress === null ? undefined : { width: `${loadProgress}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{loadProgress === null ? '正在准备…' : `${loadProgress}%`}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">选择调式</p>
              <h3 className="mt-1 text-lg font-semibold">{activeScale.label} <span className="text-sm font-normal text-emerald-300/75">{activeScale.englishLabel}</span></h3>
            </div>
            <span className="text-right text-xs text-[var(--text-secondary)]">{activeScale.color}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="调式">
            {MODAL_SCALE_IDS.map((id) => {
              const scale = MODAL_SCALES[id]
              return (
                <button
                  type="button"
                  key={id}
                  role="radio"
                  aria-checked={scaleId === id}
                  disabled={isRunning}
                  onClick={() => setScaleId(id)}
                  className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${scaleId === id ? 'border-emerald-300/55 bg-emerald-300/12 text-emerald-100' : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-white/20'}`}
                >
                  <strong className="block text-sm">{scale.label}</strong>
                  <span className="mt-1 block text-[0.65rem]">{scale.englishLabel}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-4 rounded-lg bg-black/20 px-3 py-2 font-mono text-sm tracking-wide text-emerald-200/80">{activeScale.formula}</p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">播放速度</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{bpm} <span className="text-xs font-semibold tracking-widest text-[var(--text-secondary)]">BPM</span></p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--text-secondary)]">4/4</span>
          </div>
          <input
            aria-label="音阶播放速度"
            className="mt-5 w-full accent-emerald-400"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            disabled={isRunning}
            onChange={(event) => setBpm(clampBpm(Number(event.target.value)))}
          />
          <div className="mt-1 flex justify-between text-[0.65rem] text-[var(--text-secondary)]"><span>{MIN_BPM}</span><span>{MAX_BPM}</span></div>
          <label className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]">
            播放节拍器 click
            <input type="checkbox" checked={clickEnabled} onChange={(event) => setClickEnabled(event.target.checked)} className="accent-emerald-400" />
          </label>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">速度与节拍器共用；音阶始终跟随同一个音频时钟。</p>
        </div>
      </section>
    </AppShell>
  )
}
