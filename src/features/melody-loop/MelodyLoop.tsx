import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../common/AppShell'
import { createAudioContext, unlockAudioContext } from '../../audio/context'
import { readStorage, writeStorage } from '../../utils/storage'
import { initialPattern, migratePattern, noteLabel, putNote, resizePattern, type Pattern, type Pitch } from './pattern'
import './melody-loop.css'
import { startLoop } from './loopPlayer'
import { createPiano, type Piano } from '../../audio/piano'

const STORAGE_KEY = 'ear-trainer:melody-loop:v2'
const pitchName = (midi: number) => `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`
function loadPattern(): Pattern {
  try { const value: unknown = JSON.parse(readStorage(STORAGE_KEY) ?? readStorage('ear-trainer:melody-loop:v1') ?? 'null'); return migratePattern(value) ?? initialPattern } catch { return initialPattern }
}
export function MelodyLoop() {
  const [pattern, setPattern] = useState(loadPattern)
  const [pitch, setPitch] = useState<Pitch>({ degree: 1, accidental: 0, octave: 0 })
  const [tonic, setTonic] = useState(60)
  const [cue, setCue] = useState(true)
  const [length, setLength] = useState(4)
  const [erasing, setErasing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const piano = useRef<Piano | null>(null)
  const pianoLoad = useRef<Promise<Piano> | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const source = useRef<ReturnType<typeof startLoop> | null>(null)
  const frame = useRef(0)
  const generation = useRef(0)
  useEffect(() => () => {
    generation.current++
    cancelAnimationFrame(frame.current)
    source.current?.stop()
    piano.current?.stop()
    void audio.current?.close()
  }, [])
  function stop() {
    generation.current++
    cancelAnimationFrame(frame.current)
    source.current?.stop()
    source.current = null
    setPlaying(false)
    setLoading(null)
    setStep(-1)
    setCue(true)
  }
  function edit(next: Pattern) {
    stop()
    setPattern(next)
    setSaved(writeStorage(STORAGE_KEY, JSON.stringify(next)))
  }
  async function play() {
    stop()
    const token = generation.current
    setError('')
    setPlaying(true)
    try {
      const ctx = audio.current ?? (audio.current = createAudioContext())
      await unlockAudioContext(ctx)
      if (token !== generation.current) return
      if (!piano.current) {
        setLoading('正在加载钢琴音色…')
        if (!pianoLoad.current) {
          const pending = createPiano(ctx, {
            rootMin: 35, rootMax: 95, allowSynthFallback: false,
          })
          pianoLoad.current = pending
          void pending.then((instrument) => {
            if (ctx.state === 'closed') { instrument.stop(); return }
            piano.current = instrument
          }).catch(() => {}).finally(() => {
            if (pianoLoad.current === pending) pianoLoad.current = null
          })
        }
        await pianoLoad.current
        if (token !== generation.current) return
      }
      setLoading(null)
      const player = startLoop(ctx, pattern, piano.current!, () => {
        if (token === generation.current) { stop(); setError('钢琴播放失败，请重试。') }
      })
      source.current = player
      const update = () => {
        const position = player.position()
        setStep(position.step)
        setTonic(position.tonic)
        setCue(position.cue)
        frame.current = requestAnimationFrame(update)
      }
      update()
    } catch { if (token === generation.current) { stop(); setError('钢琴音色加载或播放失败，请检查网络后重试。') } }
  }
  return <AppShell wide meta={{ eyebrow: 'MELODY LOOP', title: '旋律工坊', subtitle: '写下一段旋律，让它一遍遍陪你练习。', badge: '无缝循环', accent: '#a78bfa' }}>
    <section className="melody-toolbar" aria-label="Pattern 设置">
      <label>拍号<select value={pattern.beats} onChange={(e) => edit(resizePattern(pattern, Number(e.target.value), pattern.bars))}>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}/4</option>)}</select></label>
      <label>小节数<select value={pattern.bars} onChange={(e) => edit(resizePattern(pattern, pattern.beats, Number(e.target.value)))}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>{i + 1} 小节</option>)}</select></label>
      <label className="melody-tempo">速度 · {pattern.bpm} BPM<input aria-label="速度" type="range" min="40" max="240" value={pattern.bpm} onChange={(e) => edit({ ...pattern, bpm: Number(e.target.value) })} /></label>
      <button className="melody-play" onClick={() => playing ? stop() : void play()}>{playing ? loading ? '取消加载' : '■ 停止播放' : '▶ 循环播放'}</button>
    </section>
    <section className="melody-editor">
      <div className="melody-heading"><div><h2>你的 Pattern</h2><p>{pattern.beats}/4 拍 · {pattern.bars} 小节 · {pattern.notes.length} 个音符</p></div><span>{saved === null ? '修改后自动保存' : saved ? '已自动保存' : '本次修改未能保存'}</span></div>
      <div className="melody-tools">
        <div className="melody-degree-picker" role="group" aria-label="音级">{[1, 2, 3, 4, 5, 6, 7].map((degree) => <button key={degree} aria-pressed={pitch.degree === degree} onClick={() => setPitch({ ...pitch, degree })}>{degree}</button>)}</div>
        <label>升降号<select value={pitch.accidental} onChange={(e) => setPitch({ ...pitch, accidental: Number(e.target.value) })}><option value={0}>♮ 本位</option><option value={-1}>♭ 降半音</option><option value={1}>♯ 升半音</option></select></label>
        <label>八度<select value={pitch.octave} onChange={(e) => setPitch({ ...pitch, octave: Number(e.target.value) })}><option value={2}>上加两点 · 高两个八度</option><option value={1}>上加点 · 高八度</option><option value={0}>不加点 · 中八度</option><option value={-1}>下加点 · 低八度</option><option value={-2}>下加两点 · 低两个八度</option></select></label>
        <label>时值<select value={length} onChange={(e) => setLength(Number(e.target.value))}>{[[1, '十六分音符 · ¼ 拍'], [2, '八分音符 · ½ 拍'], [4, '四分音符 · 1 拍'], [8, '二分音符 · 2 拍'], [16, '全音符 · 4 拍']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button aria-pressed={erasing} onClick={() => setErasing(!erasing)}>{erasing ? '橡皮擦已开启' : '橡皮擦'}</button>
        <button onClick={() => edit({ ...pattern, notes: [] })}>清空旋律</button>
      </div>
      <p className="melody-help">选择音级、升降号、八度和时值，再点击格子添加或替换音符；开启橡皮擦可删除音符。插入音符只缩短前音，时值最长延伸到下个音符或小节末。空白为休止，每格 ¼ 拍。修改旋律或设置会停止播放。</p>
      <p className="melody-help">1–7 以大调音级为基准，上下点分别升降一个八度。缩短小节数会移除超出部分；切换拍号保留各小节内的位置，并裁剪超出的音符。</p>
      <div className="melody-bars">{Array.from({ length: pattern.bars }, (_, bar) => {
        const offset = bar * pattern.beats * 4
        return <section className={`melody-bar ${Math.floor(step / (pattern.beats * 4)) === bar ? 'is-playing' : ''}`} key={bar} aria-label={`第 ${bar + 1} 小节`}>
          <div className="melody-bar-title"><span>小节 {String(bar + 1).padStart(2, '0')}</span><span>{pattern.beats}/4</span></div>
          <div className="melody-grid" style={{ gridTemplateColumns: `repeat(${pattern.beats * 4}, minmax(0, 1fr))` }}>
            {Array.from({ length: pattern.beats * 4 }, (_, index) => {
              const position = offset + index
              const note = pattern.notes.find((n) => position >= n.step && position < n.step + n.length)
              return <button key={index} className={`melody-cell ${index % 4 === 0 ? 'beat-start' : ''} ${note ? 'has-note' : ''} ${step === position ? 'current' : ''}`} aria-label={`第 ${bar + 1} 小节，第 ${index / 4 + 1} 拍，${note ? `${noteLabel(note)}，${erasing ? '点击删除' : '点击写入音符'}` : erasing ? '休止' : '休止，点击添加'}`} onClick={() => edit(erasing ? { ...pattern, notes: pattern.notes.filter((n) => n !== note) } : putNote(pattern, { step: position, ...pitch, length: Math.min(length, pattern.beats * 4 - index) }))}>
                <span className="melody-beat">{index % 4 === 0 ? index / 4 + 1 : '·'}</span><strong>{note ? note.step === position ? <span className="melody-notation"><span>{note.octave > 0 ? '•'.repeat(note.octave) : '\u00a0'}</span><span>{note.accidental < 0 ? '♭' : note.accidental > 0 ? '♯' : ''}{note.degree}</span><span>{note.octave < 0 ? '•'.repeat(-note.octave) : '\u00a0'}</span></span> : '━' : '+'}</strong>
              </button>
            })}
          </div>
        </section>
      })}</div>
      <div className="melody-status" role="status">{error || loading || (playing ? cue ? `定调中 · do = ${pitchName(tonic)} · 持续 1 小节（${pattern.beats} 拍），随后进入旋律` : `循环播放中 · do = ${pitchName(tonic)} · 第 ${Math.max(1, Math.floor(step / (pattern.beats * 4)) + 1)} 小节` : '准备就绪 · 每轮先播放 1 小节定调 do，再播放旋律；随机 do（C4–B4），相邻轮不重复')}</div>
    </section>
  </AppShell>
}
