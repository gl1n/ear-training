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
    <div className="grid grid-cols-4 gap-1 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1 sm:grid-cols-7">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`min-h-10 rounded-md px-2 py-2 text-sm font-medium transition ${
            value === option.value
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
