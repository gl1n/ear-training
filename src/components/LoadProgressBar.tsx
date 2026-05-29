type LoadProgressBarProps = {
  label: string
  percent?: number
  indeterminate?: boolean
}

export function LoadProgressBar({ label, percent = 0, indeterminate }: LoadProgressBarProps) {
  return (
    <div className="mx-auto mb-6 w-full max-w-xs">
      <div className="mb-2 text-sm text-white/60">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        {indeterminate ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-400" />
        ) : (
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  )
}
