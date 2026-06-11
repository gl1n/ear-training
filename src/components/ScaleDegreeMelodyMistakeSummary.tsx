import {
  aggregateTopMelodyPatterns,
  type ScaleDegreeMelodyMistakeStatsStore,
} from '../quiz/scaleDegreeMelodyMistakeStats'
import { DEGREE_SOLFEGE_LABELS, DEGREE_OPTION_IDS } from '../quiz/keys'
import {
  aggregateSessionPatternDistribution,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'

type ScaleDegreeMelodyMistakeSummaryProps = {
  store: ScaleDegreeMelodyMistakeStatsStore
  title: string
  sessionStats?: SessionStats
}

function formatPatternLabel(pattern: string): string {
  return pattern
    .split('-')
    .map((id) => DEGREE_SOLFEGE_LABELS[id as (typeof DEGREE_OPTION_IDS)[number]] ?? id)
    .join(' → ')
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

function SessionPatternDistribution({ sessionStats }: { sessionStats: SessionStats }) {
  const patterns = aggregateSessionPatternDistribution(sessionStats)
  if (patterns.length === 0) return null

  const maxCount = Math.max(...patterns.map((item) => item.count), 1)

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-center text-[11px] text-[var(--text-secondary)]">本局旋律分布</p>
      {patterns.map(({ pattern, count }) => {
        const barWidth = `${(count / maxCount) * 100}%`

        return (
          <div key={pattern} className="flex items-center gap-3">
            <span className="w-[5.5rem] shrink-0 text-right text-xs font-medium text-sky-200/90">
              {formatPatternLabel(pattern)}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-black/25">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-sky-400/65 transition-all"
                style={{ width: barWidth }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-[var(--text-secondary)]">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TopErrorPatterns({ store }: { store: ScaleDegreeMelodyMistakeStatsStore }) {
  const patterns = aggregateTopMelodyPatterns(store, 10)
  if (patterns.length === 0) return null

  const maxCount = patterns[0]!.count

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-center text-[11px] text-[var(--text-secondary)]">
        易错旋律（近 {store.length} 组）
      </p>
      {patterns.map(({ pattern, count, ratio }) => {
        const barWidth = `${(count / maxCount) * 100}%`

        return (
          <div key={pattern} className="flex items-center gap-3">
            <span className="w-[5.5rem] shrink-0 text-right text-xs font-medium text-red-200/90">
              {formatPatternLabel(pattern)}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-black/25">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-red-400/70 transition-all"
                style={{ width: barWidth }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm tabular-nums font-medium text-red-400">
              {formatPercent(ratio)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ScaleDegreeMelodyMistakeSummary({
  store,
  title,
  sessionStats,
}: ScaleDegreeMelodyMistakeSummaryProps) {
  const showSessionPatterns = sessionStats !== undefined && hasSessionAttempts(sessionStats)
  const showHistoricalPatterns = store.length > 0

  if (!showSessionPatterns && !showHistoricalPatterns) {
    return null
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </p>
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-4">
        {showSessionPatterns && sessionStats && (
          <SessionPatternDistribution sessionStats={sessionStats} />
        )}
        {showHistoricalPatterns && <TopErrorPatterns store={store} />}
      </div>
    </div>
  )
}
