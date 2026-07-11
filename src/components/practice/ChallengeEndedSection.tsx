import type { ReactNode } from 'react'
import type { ChallengeBestRecord } from '../../quiz/challengeBestRecord'

type ChallengeEndedSectionProps = {
  accent: 'amber' | 'sky'
  subtitle?: string
  isNewBestRecord: boolean
  bestRecord: ChallengeBestRecord | null
  children: ReactNode
  bestRecordLabel?: string
}

const BADGE_CLASSES = {
  amber: 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300',
  sky: 'rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/25',
} as const

export function ChallengeScoreCard({
  value,
  label,
  highlight = false,
  variant = 'count',
}: {
  value: number | string
  label: string
  highlight?: boolean
  variant?: 'count' | 'score'
}) {
  const isScore = variant === 'score'

  if (!highlight) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4 text-center">
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    )
  }

  return (
    <div
      className={[
        'w-full max-w-sm rounded-2xl border px-5 py-5 text-center transition-colors',
        isScore
          ? 'border-amber-400/30 bg-gradient-to-b from-amber-500/15 to-amber-500/5'
          : 'border-sky-400/30 bg-gradient-to-b from-sky-500/15 to-sky-500/5 scale-degree-glow',
      ].join(' ')}
    >
      <p
        className={[
          'text-4xl font-bold tabular-nums',
          isScore ? 'text-amber-100' : 'text-sky-100',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </p>
    </div>
  )
}

export function ChallengeEndedSection({
  accent,
  subtitle,
  isNewBestRecord,
  bestRecord,
  children,
  bestRecordLabel = '连对题数',
}: ChallengeEndedSectionProps) {
  return (
    <>
      <div className={`flex flex-col items-center gap-2 text-center ${subtitle ? '' : ''}`}>
        {accent === 'sky' ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-red-300 ring-1 ring-red-400/20">
            训练报告
          </span>
        ) : (
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">训练报告</p>
        )}
        {subtitle ? <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          本次成绩
        </p>
        {children}
      </div>

      {bestRecord ? (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              最佳记录
            </p>
            {isNewBestRecord ? (
              <span className={BADGE_CLASSES[accent]}>新纪录</span>
            ) : null}
          </div>
          <ChallengeScoreCard value={bestRecord.correctCount} label={bestRecordLabel} />
        </div>
      ) : null}
    </>
  )
}
