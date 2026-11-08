type KeyLabelProps = {
  label: string
  variant: 'badge' | 'display'
}

export function KeyLabel({ label, variant }: KeyLabelProps) {
  if (variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
        <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
          调性
        </span>
        {label}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-blue-300 bg-blue-50">
        <span className="text-3xl font-bold text-blue-800">{label.replace(/ 大调$/, '')}</span>
      </div>
      <p className="text-lg font-semibold text-blue-800">{label}</p>
    </div>
  )
}
