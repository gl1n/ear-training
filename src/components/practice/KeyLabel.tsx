type KeyLabelProps = {
  label: string
  variant: 'badge' | 'display'
}

export function KeyLabel({ label, variant }: KeyLabelProps) {
  if (variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-gradient-to-r from-sky-500/15 to-cyan-500/10 px-3 py-1 text-sm font-semibold text-sky-100 scale-degree-glow">
        <span className="text-[10px] font-medium uppercase tracking-wider text-sky-300/80">
          调性
        </span>
        {label}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-cyan-500/5 scale-degree-glow">
        <span className="text-3xl font-bold text-sky-100">{label.replace(/ 大调$/, '')}</span>
      </div>
      <p className="text-lg font-semibold text-sky-100">{label}</p>
    </div>
  )
}
