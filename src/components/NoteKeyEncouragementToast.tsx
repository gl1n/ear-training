export type NoteKeyEncouragement = {
  message: string
  key: number
}

type NoteKeyEncouragementToastProps = {
  message: string
}

export function NoteKeyEncouragementToast({ message }: NoteKeyEncouragementToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-priority-boost-in rounded-full border border-emerald-300/25 bg-[rgba(15,18,26,0.9)] px-5 py-2.5 text-base font-bold tracking-wide text-emerald-100 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md ring-1 ring-emerald-400/25"
    >
      {message}
    </div>
  )
}
