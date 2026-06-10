type EncouragementToastProps = {
  message: string
  variant?: 'orange' | 'emerald'
}

const VARIANT_CLASSES = {
  orange:
    'rounded-full border border-orange-300/20 bg-[rgba(15,18,26,0.88)] px-4 py-2 text-sm font-medium text-orange-100/90 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md ring-1 ring-orange-400/15',
  emerald:
    'rounded-full border border-emerald-300/25 bg-[rgba(15,18,26,0.9)] px-5 py-2.5 text-base font-bold tracking-wide text-emerald-100 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md ring-1 ring-emerald-400/25',
} as const

export function EncouragementToast({
  message,
  variant = 'orange',
}: EncouragementToastProps) {
  return (
    <div role="status" aria-live="polite" className={`animate-priority-boost-in ${VARIANT_CLASSES[variant]}`}>
      {message}
    </div>
  )
}
