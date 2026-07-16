type ChipProps = {
  children: string
  active?: boolean
}

export function Chip({ children, active = false }: ChipProps) {
  return (
    <span
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        active
          ? 'border-sky-400/30 bg-[var(--accent-muted)] text-[var(--text-primary)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </span>
  )
}
