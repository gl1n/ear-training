type Props = {
  description?: string
  value: 10 | 20 | 30
  onChange: (value: 10 | 20 | 30) => void
}

export function SessionGoalControl({ value, onChange, description = '答错纠正后继续，完成全部题目生成报告' }: Props) {
  return (
    <fieldset className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
      <div>
        <legend className="text-sm font-medium">本轮目标</legend>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <div className="flex shrink-0 gap-1" aria-label="训练题数">
        {([10, 20, 30] as const).map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={value === count}
            onClick={() => onChange(count)}
            className={`min-h-11 min-w-11 rounded-md px-3 text-sm font-semibold transition ${value === count ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {count}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
