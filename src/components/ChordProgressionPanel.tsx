import { CHORD_KEY_OPTIONS, type ChordDegree, type ChordInversion, type ChordKey, type ChordPlaybackMode, type ChordRhythm, type PlayedChord, type RandomChordQuality, type RandomChordSettings } from '../quiz/chordProgression'
import type { TrainerState } from '../quiz/sequencer'
import { Card } from '../common/ui/Card'
import { SegmentedControl } from '../common/ui/SegmentedControl'

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
  selectedKey: ChordKey
  activeKeyLabel: string | null
  onKeyChange: (key: ChordKey) => void
  melodyEnabled: boolean
  onMelodyEnabledChange: (enabled: boolean) => void
  playbackMode: ChordPlaybackMode
  onPlaybackModeChange: (mode: ChordPlaybackMode) => void
  randomSettings: RandomChordSettings
  onRandomSettingsChange: (settings: RandomChordSettings) => void
}

const PROGRESSION_PRESETS: { name: string; description: string; degrees: ChordDegree[] }[] = [
  { name: '经典流行', description: 'I–V–vi–IV', degrees: [1, 5, 6, 4] },
  { name: '卡农走向', description: 'I–V–vi–iii', degrees: [1, 5, 6, 3] },
  { name: '抒情循环', description: 'I–vi–IV–V', degrees: [1, 6, 4, 5] },
  { name: '小调色彩', description: 'vi–IV–I–V', degrees: [6, 4, 1, 5] },
  { name: '四五三六二五一', description: 'IV–V–iii–vi–ii–V–I', degrees: [4, 5, 3, 6, 2, 5, 1] },
  { name: '爵士流行', description: 'ii–V–I–vi', degrees: [2, 5, 1, 6] },
]

const PLAYBACK_MODE_OPTIONS = [
  { value: 'progression' as const, label: '固定进行' },
  { value: 'random-ear' as const, label: '随机磨耳' },
]

const QUALITY_OPTIONS: { value: RandomChordQuality; label: string }[] = [
  { value: 'triad', label: '三和弦' },
  { value: 'seventh', label: '七和弦' },
]

const INVERSION_OPTIONS: { value: ChordInversion; label: string }[] = [
  { value: 0, label: '原位' },
  { value: 1, label: '第一转位' },
  { value: 2, label: '第二转位' },
  { value: 3, label: '第三转位' },
]

const DEGREE_OPTIONS: { value: ChordDegree; label: string }[] = [
  { value: 1, label: 'I' },
  { value: 2, label: 'ii' },
  { value: 3, label: 'iii' },
  { value: 4, label: 'IV' },
  { value: 5, label: 'V' },
  { value: 6, label: 'vi' },
  { value: 7, label: 'vii°' },
]

export function ChordProgressionPanel({ degrees, currentChord, currentPosition, state, isRunning, onDegreeChange, onDegreesChange, rhythm, currentBeat, isCountIn, onRhythmChange, selectedKey, activeKeyLabel, onKeyChange, melodyEnabled, onMelodyEnabledChange, playbackMode, onPlaybackModeChange, randomSettings, onRandomSettingsChange }: Props) {
  const toggleQuality = (quality: RandomChordQuality) => {
    const selected = randomSettings.qualities.includes(quality)
    if (selected && randomSettings.qualities.length === 1) return
    const qualities = (selected
      ? randomSettings.qualities.filter((value) => value !== quality)
      : [...randomSettings.qualities, quality]) as RandomChordQuality[]
    const validInversions = qualities.includes('seventh')
      ? randomSettings.inversions
      : randomSettings.inversions.filter((value) => value !== 3)
    const inversions: ChordInversion[] = validInversions.length > 0 ? validInversions : [0]
    onRandomSettingsChange({ ...randomSettings, qualities, inversions })
  }

  const toggleInversion = (inversion: ChordInversion) => {
    const selected = randomSettings.inversions.includes(inversion)
    if (selected && randomSettings.inversions.length === 1) return
    const inversions = selected
      ? randomSettings.inversions.filter((value) => value !== inversion)
      : [...randomSettings.inversions, inversion].sort()
    onRandomSettingsChange({ ...randomSettings, inversions: inversions as ChordInversion[] })
  }

  const toggleDegree = (degree: ChordDegree) => {
    const selected = randomSettings.degrees.includes(degree)
    if (selected && randomSettings.degrees.length === 1) return
    const degrees = selected
      ? randomSettings.degrees.filter((value) => value !== degree)
      : [...randomSettings.degrees, degree].sort((a, b) => a - b)
    onRandomSettingsChange({ ...randomSettings, degrees: degrees as ChordDegree[] })
  }

  const phaseTitle = isCountIn
    ? `预备 ${currentBeat} / 4`
    : isRunning && playbackMode === 'random-ear'
      ? state === 'playing_root' ? '根音' : state === 'playing_harmonic' ? '随机和弦' : '听辨…'
      : isRunning && currentChord ? currentChord.name : playbackMode === 'random-ear' ? '准备随机磨耳' : '选择和弦级数'

  return (
    <Card>
      <div className="mx-auto mb-7 max-w-sm">
        <SegmentedControl options={PLAYBACK_MODE_OPTIONS} value={playbackMode} onChange={onPlaybackModeChange} disabled={isRunning} />
      </div>
      <div className="text-center">
        <p className="text-sm text-[var(--text-secondary)]">{activeKeyLabel ? `${activeKeyLabel} · ` : ''}{playbackMode === 'random-ear' ? '和弦 → 理论根音 · 每组 4 拍' : '循环进行 · 仅使用调内音'}</p>
        <h2 className="mt-2 text-3xl font-bold">{phaseTitle}</h2>
        <div className="mt-4 flex justify-center gap-2" aria-label="当前拍">
          {Array.from({ length: playbackMode === 'random-ear' || isCountIn ? 4 : rhythm.beatsPerChord }, (_, index) => <span key={index} className={`h-2.5 w-8 rounded-full transition ${isRunning && currentBeat === index + 1 ? 'bg-sky-400' : 'bg-[var(--bg-elevated)]'}`} />)}
        </div>
      </div>
      {playbackMode === 'progression' ? <><div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
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
      </div></> : <div className="mt-8 grid gap-6 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="mb-3 text-sm text-[var(--text-secondary)]">出题范围</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DEGREE_OPTIONS.map((option) => <label key={option.value} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-sky-500" checked={randomSettings.degrees.includes(option.value)} disabled={isRunning} onChange={() => toggleDegree(option.value)} />{option.label}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm text-[var(--text-secondary)]">和弦类型</legend>
          <div className="grid grid-cols-2 gap-2">
            {QUALITY_OPTIONS.map((option) => <label key={option.value} className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-sky-500" checked={randomSettings.qualities.includes(option.value)} disabled={isRunning} onChange={() => toggleQuality(option.value)} />{option.label}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm text-[var(--text-secondary)]">转位</legend>
          <div className="grid grid-cols-2 gap-2">
            {INVERSION_OPTIONS.map((option) => <label key={option.value} className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-sky-500" checked={randomSettings.inversions.includes(option.value)} disabled={isRunning || (option.value === 3 && !randomSettings.qualities.includes('seventh'))} onChange={() => toggleInversion(option.value)} />{option.label}</label>)}
          </div>
        </fieldset>
        <p className="text-sm leading-6 text-[var(--text-secondary)] sm:col-span-2">第三转位仅适用于七和弦。转位只改变和弦低音，随后播放的始终是理论根音。</p>
      </div>}
      <div className="mt-6 grid gap-5 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
        <label className="text-sm text-[var(--text-secondary)]">调性<select className="mt-2 w-full rounded-lg bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]" value={selectedKey} disabled={isRunning} onChange={(event) => onKeyChange(event.target.value === 'random' ? 'random' : Number(event.target.value) as ChordKey)}>{CHORD_KEY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-sm text-[var(--text-secondary)]">速度 <strong className="ml-1 text-[var(--text-primary)]">{rhythm.bpm} BPM</strong><input className="mt-2 w-full accent-sky-400" type="range" min="40" max="160" step="5" value={rhythm.bpm} disabled={isRunning} onChange={(event) => onRhythmChange({ ...rhythm, bpm: Number(event.target.value) })} /></label>
        {playbackMode === 'progression' && <><label className="text-sm text-[var(--text-secondary)]">每个和弦<select className="mt-2 w-full rounded-lg bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]" value={rhythm.beatsPerChord} disabled={isRunning} onChange={(event) => onRhythmChange({ ...rhythm, beatsPerChord: Number(event.target.value) as 1 | 2 | 4 })}><option value="1">1 拍</option><option value="2">2 拍</option><option value="4">4 拍（1 小节）</option></select></label>
        <label className="text-sm text-[var(--text-secondary)]">开始方式<select className="mt-2 w-full rounded-lg bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]" value={rhythm.countInBeats} disabled={isRunning} onChange={(event) => onRhythmChange({ ...rhythm, countInBeats: Number(event.target.value) as 0 | 4 })}><option value="0">立即播放</option><option value="4">1 小节预备拍</option></select></label>
        <label className="flex items-center gap-3 text-sm text-[var(--text-secondary)] sm:col-span-2">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-sky-500" checked={melodyEnabled} disabled={isRunning} onChange={(event) => onMelodyEnabledChange(event.target.checked)} />
          <span><strong className="block text-[var(--text-primary)]">和弦内旋律</strong>在持续和弦上方加入基础三和弦旋律音</span>
        </label></>}
      </div>
      <p className="mt-5 text-center text-sm leading-6 text-[var(--text-secondary)]">{playbackMode === 'random-ear' ? '每轮都会重新随机级数、和弦类型与有效转位。' : '每组支持 4–8 个和弦；默认立即播放，也可启用一小节预备拍。'}</p>
    </Card>
  )
}
