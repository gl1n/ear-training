type EncouragementToastProps = {
  message: string
}

const TOAST_CLASSES =
  'rounded-full border border-emerald-600/30 bg-white px-5 py-2.5 text-base font-bold tracking-wide text-emerald-800 shadow-sm'

export function EncouragementToast({ message }: EncouragementToastProps) {
  return (
    <div role="status" aria-live="polite" className={`animate-priority-boost-in ${TOAST_CLASSES}`}>
      {message}
    </div>
  )
}
