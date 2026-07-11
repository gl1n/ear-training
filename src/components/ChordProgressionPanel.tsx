import type { ChordDegree, ChordRhythm, PlayedChord } from '../quiz/chordProgression'
import type { TrainerState } from '../quiz/sequencer'
import { Card } from './ui/Card'

type Props = {
  degrees: ChordDegree[]
  currentChord: PlayedChord | null
  currentPosition: number
  state: TrainerState
  isRunning: boolean
  onDegreeChange: (position: number, degree: ChordDegree) => void
  onDegreesChange: (degrees: ChordDegree[]) => void
  rhythm: ChordRhythm
  currentBeat: number
  isCountIn: boolean
  onRhythmChange: (rhythm: ChordRhythm) => void
}

const PROGRESSION_PRESETS: { name: string; description: string; degrees: ChordDegree[] }[] = [
  { name: '经典流行', description: 'I–V–vi–IV', degrees: [1, 5, 6, 4] },
  { name: '卡农走向', description: 'I–V–vi–iii', degrees: [1, 5, 6, 3] },
  { name: '抒情循环', description: 'I–vi–IV–V', degrees: [1, 6, 4, 5] },
  { name: '小调色彩', description: 'vi–IV–I–V', degrees: [6, 4, 1, 5] },
  { name: '四五三六二五一', description: 'IV–V–iii–vi–ii–V–I', degrees: [4, 5, 3, 6, 2, 5, 1] },
  { name: '爵士流行', description: 'ii–V–I–vi', degrees: [2, 5, 1, 6] },
]

export function ChordProgressionPanel({ degrees, currentChord, currentPosition, state, isRunning, onDegreeChange, onDegreesChange, rhythm, currentBeat, isCountIn, onRhythmChange }: Props) {
  return (
    <Card>
      <div className="text-center">
        <p className="text-sm text-[var(--text-secondary)]">四和弦循环 · 每次随机色彩与转位</p>
        <h2 className="mt-2 text-3xl font-bold">{isCountIn ? `预备 ${currentBeat} / 4` : isRunning && currentChord ? currentChord.name : '选择和弦级数'}</h2>
        <div className="mt-4 flex justify-center gap-2" aria-label="当前拍">
          {Array.from({ length: isCountIn ? 4 : rhythm.beatsPerChord }, (_, index) => <span key={index} className={`h-2.5 w-8 rounded-full transition ${isRunning && currentBeat === index + 1 ? 'bg-sky-400' : 'bg-[var(--bg-elevated)]'}`} />)}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        {degrees.map((degree, position) => (
          <label key={position} className={`rounded-xl border p-2 text-center transition sm:p-4 ${isRunning && currentPosition === position && state === 'playing_harmonic' ? 'border-sky-400 bg-sky-400/15' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'}`}>
            <span className="mb-2 block text-xs text-[var(--text-secondary)]">第 {position + 1} 个</span>
            <select aria-label={`第 ${position + 1} 个和弦级数`} value={degree} disabled={isRunning} onChange={(event) => onDegreeChange(position, Number(event.target.value) as ChordDegree)} className="w-full rounded-lg bg-[var(--bg-elevated)] px-1 py-2 text-center text-xl font-bold disabled:opacity-100">
              {[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value} 级</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" disabled={isRunning || degrees.length <= 4} onClick={() => onDegreesChange(degrees.slice(0, -1))} className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm disabled:opacity-35">移除一个</button>
        <span className="min-w-20 text-center text-sm text-[var(--text-secondary)]">{degrees.length} 个和弦</span>
        <button type="button" disabled={isRunning || degrees.length >= 8} onClick={() => onDegreesChange([...degrees, 1])} className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm disabled:opacity-35">增加一个</button>
      </div>
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">常见进行预设</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROGRESSION_PRESETS.map((preset) => {
            const selected = preset.degrees.every((degree, index) => degrees[index] === degree)
            return <button key={preset.name} type="button" disabled={isRunning} onClick={() => onDegreesChange([...preset.degrees])} className={`rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected && degrees.length === preset.degrees.length ? 'border-sky-400 bg-sky-400/15' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'}`}><span className="block text-sm font-medium">{preset.name}</span><span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{preset.description}</span></button>
          })}
        </div>
      </div>
      <div className="mt-6 grid gap-5 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
        <label className="text-sm text-[var(--text-secondary)]">速度 <strong className="ml-1 text-[var(--text-primary)]">{rhythm.bpm} BPM</strong><input className="mt-2 w-full accent-sky-400" type="range" min="40" max="160" step="5" value={rhythm.bpm} disabled={isRunning} onChange={(event) => onRhythmChange({ ...rhythm, bpm: Number(event.target.value) })} /></label>
        <label className="text-sm text-[var(--text-secondary)]">每个和弦<select className="mt-2 w-full rounded-lg bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]" value={rhythm.beatsPerChord} disabled={isRunning} onChange={(event) => onRhythmChange({ ...rhythm, beatsPerChord: Number(event.target.value) as 1 | 2 | 4 })}><option value="1">1 拍</option><option value="2">2 拍</option><option value="4">4 拍（1 小节）</option></select></label>
      </div>
      <p className="mt-5 text-center text-sm leading-6 text-[var(--text-secondary)]">每组支持 4–8 个和弦；开始时会有一小节预备拍，演奏使用自然呼吸节奏。</p>
    </Card>
  )
}
