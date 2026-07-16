type SegmentOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--border-subtle)] bg-black/20 p-1.5 sm:grid-cols-7">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`min-h-10 rounded-lg px-2 py-2 text-sm font-medium transition ${
            value === option.value
              ? 'bg-sky-400 text-slate-950 shadow-[0_4px_20px_rgba(56,189,248,.18)]'
              : 'text-[var(--text-secondary)] hover:bg-white/8 hover:text-white'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
