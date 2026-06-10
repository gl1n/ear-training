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
  if (variant === 'intervalSpeed') {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              第 {currentQuestion} 题
            </span>
            {correctCount > 0 && (
              <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                连对 {correctCount} 题
              </span>
            )}
          </div>
        </div>
        {trailing}
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {leading}
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            第 {currentQuestion} 题
          </span>
          {correctCount > 0 && (
            <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-xs tabular-nums text-sky-200/90 ring-1 ring-sky-400/20">
              连对 {correctCount}
            </span>
          )}
          {totalScore > 0 && (
            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs tabular-nums text-amber-200/90 ring-1 ring-amber-400/20">
              得分 {formatScoreDisplay(totalScore)}
            </span>
          )}
        </div>
      </div>
      {trailing}
    </div>
  )
}
