type IdleTipToastProps = {
  message: string
}

export function IdleTipToast({ message }: IdleTipToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-priority-boost-in rounded-full border border-orange-300/20 bg-[rgba(15,18,26,0.88)] px-4 py-2 text-sm font-medium text-orange-100/90 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md ring-1 ring-orange-400/15"
    >
      {message}
    </div>
  )
}

export const IDLE_TIP_MESSAGES = [
  '啊欧，反应有点慢了~',
  '哎呀，再快一点哦~',
  '慢了一步，这题待会还会找你~',
] as const
