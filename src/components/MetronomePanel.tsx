import { useCallback, useEffect, useRef, useState } from 'react'
import { createAudioContext, unlockAudioContextSync } from '../audio/context'
import { bpmFromTapTimes, clampBpm, MAX_BPM, MIN_BPM } from '../quiz/metronome'
import { Button } from '../common/ui/Button'
import {
  loadMetronomePreferences,
  usePersistedMetronomePreferences,
} from '../hooks/usePersistedToolSettings'

const BEAT_OPTIONS = [2, 3, 4, 6] as const

export function MetronomePanel() {
  const [initialPreferences] = useState(loadMetronomePreferences)
  const [bpm, setBpm] = useState(initialPreferences.bpm)
  const [beatsPerBar, setBeatsPerBar] = useState<(typeof BEAT_OPTIONS)[number]>(initialPreferences.beatsPerBar)
  const [accentEnabled, setAccentEnabled] = useState(initialPreferences.accentEnabled)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeBeat, setActiveBeat] = useState(0)
  const contextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextBeatTimeRef = useRef(0)
  const nextBeatRef = useRef(0)
  const tapTimesRef = useRef<number[]>([])
  const bpmRef = useRef(bpm)
  const beatsRef = useRef(beatsPerBar)
  const accentRef = useRef(accentEnabled)

  usePersistedMetronomePreferences({ bpm, beatsPerBar, accentEnabled })

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { beatsRef.current = beatsPerBar }, [beatsPerBar])
  useEffect(() => { accentRef.current = accentEnabled }, [accentEnabled])

  const playClick = useCallback((context: AudioContext, time: number, beat: number) => {
    const strong = beat === 0 && accentRef.current
    const secondary = beat === 3 && beatsRef.current === 6 && accentRef.current
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(strong ? 1500 : secondary ? 1040 : 760, time)
    gain.gain.setValueAtTime(strong ? 0.25 : secondary ? 0.15 : 0.11, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + 0.05)

    if (secondary) {
      const overtone = context.createOscillator()
      const overtoneGain = context.createGain()
      overtone.type = 'sine'
      overtone.frequency.setValueAtTime(1560, time)
      overtoneGain.gain.setValueAtTime(0.035, time)
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
      overtone.connect(overtoneGain).connect(context.destination)
      overtone.start(time)
      overtone.stop(time + 0.065)
    }
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    setIsPlaying(false)
    setActiveBeat(0)
  }, [])

  const start = useCallback(() => {
    const context = contextRef.current && contextRef.current.state !== 'closed'
      ? contextRef.current
      : createAudioContext()
    contextRef.current = context
    unlockAudioContextSync(context)
    nextBeatRef.current = 0
    nextBeatTimeRef.current = context.currentTime + 0.06

    const schedule = () => {
      while (nextBeatTimeRef.current < context.currentTime + 0.1) {
        const beat = nextBeatRef.current
        const time = nextBeatTimeRef.current
        playClick(context, time, beat)
        window.setTimeout(() => setActiveBeat(beat), Math.max(0, (time - context.currentTime) * 1000))
        nextBeatTimeRef.current += 60 / bpmRef.current
        nextBeatRef.current = (beat + 1) % beatsRef.current
      }
    }
    schedule()
    timerRef.current = window.setInterval(schedule, 25)
    setIsPlaying(true)
  }, [playClick])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, button, [contenteditable="true"]')) return
      if (event.code !== 'Space' || event.repeat) return
      event.preventDefault()
      if (isPlaying) stop()
      else start()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, start, stop])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    void contextRef.current?.close()
  }, [])

  const handleTap = () => {
    const now = performance.now()
    const previous = tapTimesRef.current.at(-1)
    tapTimesRef.current = previous === undefined || now - previous > 2000
      ? [now]
      : [...tapTimesRef.current.slice(-5), now]
    const measured = bpmFromTapTimes(tapTimesRef.current)
    if (measured !== null) setBpm(measured)
  }

  const updateBpm = (value: number) => setBpm(clampBpm(value))

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7">
      <div className="mb-7 flex items-center justify-center gap-3" aria-label={`每小节 ${beatsPerBar} 拍，当前第 ${activeBeat + 1} 拍`}>
        {Array.from({ length: beatsPerBar }, (_, beat) => (
          <span key={beat} className={`h-3 rounded-full transition-all duration-75 ${activeBeat === beat && isPlaying ? 'w-10 bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.55)]' : beat === 0 ? 'w-5 bg-rose-400/40' : beatsPerBar === 6 && beat === 3 ? 'w-5 bg-rose-400/25' : 'w-5 bg-white/15'}`} />
        ))}
      </div>

      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="速度减 1" onClick={() => updateBpm(bpm - 1)} className="h-11 w-11 rounded-full border border-[var(--border-subtle)] text-xl text-[var(--text-secondary)] hover:text-white">−</button>
          <label className="min-w-32">
            <span className="block text-6xl font-bold tabular-nums tracking-tight">{bpm}</span>
            <span className="mt-1 block text-xs font-semibold tracking-[0.18em] text-[var(--text-secondary)]">BPM</span>
          </label>
          <button type="button" aria-label="速度加 1" onClick={() => updateBpm(bpm + 1)} className="h-11 w-11 rounded-full border border-[var(--border-subtle)] text-xl text-[var(--text-secondary)] hover:text-white">+</button>
        </div>
        <input aria-label="节拍速度" className="mt-6 w-full accent-rose-400" type="range" min={MIN_BPM} max={MAX_BPM} value={bpm} onChange={(event) => updateBpm(Number(event.target.value))} />
        <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]"><span>{MIN_BPM}</span><span>{MAX_BPM}</span></div>
      </div>

      <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">每小节拍数</p>
          <div className="grid grid-cols-4 gap-2">
            {BEAT_OPTIONS.map((beats) => <button type="button" key={beats} onClick={() => { setBeatsPerBar(beats); nextBeatRef.current = 0 }} className={`rounded-lg border py-2 text-sm font-semibold ${beatsPerBar === beats ? 'border-rose-400/60 bg-rose-400/15 text-rose-200' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>{beats}</button>)}
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <label className="flex h-10 items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={accentEnabled} onChange={(event) => setAccentEnabled(event.target.checked)} className="accent-rose-400" />首拍重音</label>
          <Button variant="ghost" onClick={handleTap} className="h-10 px-4">点按测速</Button>
        </div>
      </div>

      <Button onClick={isPlaying ? stop : start} className="mt-6 w-full bg-rose-500 py-3.5 text-lg hover:bg-rose-400">{isPlaying ? '停止节拍器' : '启动节拍器'} <span className="ml-2 text-sm font-normal opacity-70">空格键</span></Button>
    </section>
  )
}
