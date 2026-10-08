import type { DegreePracticeOptions, ScaleDegreeTrainingMode, ScaleFlavor } from '../quiz/keys'
import { SCALE_FLAVOR_LABELS } from '../quiz/degreePractice'

type Props = {
  mode: ScaleDegreeTrainingMode
  value: DegreePracticeOptions
  onChange: (options: DegreePracticeOptions) => void
  disabled: boolean
}

export function DegreePracticeSettings({ mode, value, onChange, disabled }: Props) {
  if (mode === 'crossRegister') return null
  const options = mode === 'single'
    ? Object.entries(SCALE_FLAVOR_LABELS).map(([id, label]) => ({ id, label }))
    : [3, 5, 7].map((length) => ({ id: String(length), label: `${length} 音` }))
  const selected = mode === 'single' ? value.scaleFlavor : String(value.melodyLength)
  const label = mode === 'single' ? '训练音阶' : '旋律长度'
  const description = mode === 'melody'
    ? value.arcadeMode ? '无限组数 · 每组完成后自动加速 · 可随时暂停' : '大调等时值旋律 · 提交前可修改 · 首听与重听分别统计'
    : value.scaleFlavor === 'minor'
      ? '以主音为 1：1、2、♭3、4、5、♭6、♭7；用小三和弦定调。'
      : value.scaleFlavor === 'chromatic'
        ? '在大调自然音中混入 ♭3、♯4、♭7，听辨相对主音的位置。'
        : '大调自然音：1、2、3、4、5、6、7。'
  return <div className="flex flex-col gap-3">
    <p className="text-sm font-medium">{label}</p>
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
      {options.map((option) => <button key={option.id} type="button" role="radio" aria-checked={option.id === selected} disabled={disabled}
        onClick={() => onChange(mode === 'single' ? { ...value, scaleFlavor: option.id as ScaleFlavor } : { ...value, melodyLength: Number(option.id) as 3 | 5 | 7 })}
        className={`min-h-11 rounded-xl border px-2 py-3 text-sm ${option.id === selected ? 'border-sky-400 bg-sky-400/15 text-sky-200' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>{option.label}</button>)}
    </div>
    <p className="text-sm text-[var(--text-secondary)]">{description}</p>
    {mode === 'melody' && <label className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${value.arcadeMode ? 'border-sky-400/40 bg-sky-500/10' : 'border-[var(--border-subtle)]'}`}>
      <span><strong className="block text-sm">街机无限模式</strong><span className="text-xs text-[var(--text-secondary)]">不设组数上限，速度逐组提升</span></span>
      <input type="checkbox" className="h-5 w-5 accent-sky-400" checked={value.arcadeMode} disabled={disabled} onChange={(event) => onChange({ ...value, arcadeMode: event.target.checked })} />
    </label>}
  </div>
}
