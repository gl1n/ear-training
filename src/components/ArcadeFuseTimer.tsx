import { useEffect, useRef, useState } from 'react'
import { ARCADE_SESSION_TIME_MS } from '../quiz/sequencer'

type ArcadeFuseTimerProps = {
  deadlineMs: number
}

export function ArcadeFuseTimer({ deadlineMs }: ArcadeFuseTimerProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.ceil(Math.max(0, deadlineMs - performance.now()) / 1000),
  )
  const [isLow, setIsLow] = useState(
    () => (deadlineMs - performance.now()) / ARCADE_SESSION_TIME_MS <= 0.25,
  )

  useEffect(() => {
    let frame = 0
    let lastSecond = -1

    const tick = () => {
      const remaining = Math.max(0, deadlineMs - performance.now())
      const ratio = remaining / ARCADE_SESSION_TIME_MS
      const fill = fillRef.current

      if (fill) {
        fill.style.width = `${ratio * 100}%`
      }

      const low = ratio <= 0.25
      setIsLow((prev) => (prev !== low ? low : prev))

      const secs = Math.ceil(remaining / 1000)
      if (secs !== lastSecond) {
        lastSecond = secs
        setRemainingSeconds(secs)
      }

      if (remaining > 0) {
        frame = requestAnimationFrame(tick)
      } else if (fill) {
        fill.style.width = '0%'
        setRemainingSeconds(0)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [deadlineMs])

  return (
    <div className="flex flex-col gap-1.5" aria-label={`剩余答题时间 ${remainingSeconds} 秒`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          答题时限
        </span>
        <span
          className={`text-xs font-bold tabular-nums transition-colors ${
            isLow ? 'text-orange-400 animate-fade-pulse' : 'text-sky-300'
          }`}
        >
          {remainingSeconds}s
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          ref={fillRef}
          className={`h-full rounded-full bg-gradient-to-r ${
            isLow
              ? 'from-orange-500 to-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.55)]'
              : 'from-sky-500 to-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
          }`}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
