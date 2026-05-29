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
    <div className="flex rounded-lg border border-[var(--border-subtle)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
            value === option.value
              ? 'bg-white text-slate-900'
              : 'text-[var(--text-secondary)] hover:bg-white/10'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
