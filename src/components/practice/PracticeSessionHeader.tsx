import type { ReactNode } from 'react'
import { formatScoreDisplay } from '../../lib/formatScore'

type PracticeSessionHeaderProps = {
  currentQuestion: number
  correctCount: number
  variant: 'intervalSpeed' | 'scaleDegree'
  totalScore?: number
  leading?: ReactNode
  trailing?: ReactNode
}

export function PracticeSessionHeader({
  currentQuestion,
  correctCount,
  variant,
  totalScore = 0,
  leading,
  trailing,
}: PracticeSessionHeaderProps) {
  const accentClass =
    variant === 'scaleDegree'
      ? 'bg-sky-500/10 text-sky-200/90 ring-sky-400/20'
      : 'bg-amber-500/10 text-amber-200/90 ring-amber-400/20'

  return (
    <div className="relative flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {leading}
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            第 {currentQuestion} 题
          </span>
          {correctCount > 0 && (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs tabular-nums ring-1 ${accentClass}`}
            >
              答对 {correctCount}
            </span>
          )}
          {totalScore > 0 && (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs tabular-nums ring-1 ${accentClass}`}
            >
              得分 {formatScoreDisplay(totalScore)}
            </span>
          )}
        </div>
      </div>
      {trailing}
    </div>
  )
}
