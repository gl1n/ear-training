import { INTERVALS } from '../quiz/intervals'
import { INTERVAL_PRESETS } from '../quiz/intervalPresets'
import { Card } from './ui/Card'

type IntervalSelectorProps = {
  enabledIntervalIds: string[]
  onIntervalToggle: (id: string) => void
  onSelectAllIntervals: () => void
  onClearIntervals: () => void
  onApplyPreset: (intervalIds: string[]) => void
}

export function IntervalSelector({
  enabledIntervalIds,
  onIntervalToggle,
  onSelectAllIntervals,
  onClearIntervals,
  onApplyPreset,
}: IntervalSelectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card variant="compact">
        <h3 className="mb-1 text-sm font-medium">训练预设</h3>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">按训练优先级排列，点击快速切换题集</p>
        <div className="flex flex-col gap-2">
          {INTERVAL_PRESETS.map((preset) => {
            const isActive =
              preset.intervalIds.length === enabledIntervalIds.length &&
              preset.intervalIds.every((id) => enabledIntervalIds.includes(id))
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.intervalIds)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  isActive
                    ? 'border-sky-400/50 bg-[var(--accent-muted)]'
                    : 'border-[var(--border-subtle)] bg-black/20 hover:border-white/20'
                }`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-[var(--text-secondary)]">
                  {preset.priority}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{preset.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{preset.description}</p>
                  <p className="mt-1 text-xs text-sky-300/70">
                    {preset.intervalIds
                      .map((id) => INTERVALS.find((i) => i.id === id)?.short)
                      .join(' · ')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <Card variant="compact">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">自定义选择</h3>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAllIntervals}
              className="text-sky-400 hover:text-sky-300"
            >
              全选
            </button>
            <button
              type="button"
              onClick={onClearIntervals}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              清空
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INTERVALS.map((interval) => {
            const checked = enabledIntervalIds.includes(interval.id)
            return (
              <label
                key={interval.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  checked
                    ? 'border-sky-400/50 bg-[var(--accent-muted)]'
                    : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onIntervalToggle(interval.id)}
                  className="accent-sky-400"
                />
                <span>{interval.short}</span>
              </label>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
