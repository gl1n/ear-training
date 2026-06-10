import {
  aggregateByDegreePair,
  type NoteKeyMistakeStatsStore,
} from '../quiz/noteKeyMistakeStats'
import { DEGREE_OPTION_IDS, DEGREE_SOLFEGE_LABELS } from '../quiz/keys'
import {
  aggregateSessionDegreeDistribution,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'

type NoteKeyMistakeSummaryProps = {
  store: NoteKeyMistakeStatsStore
  title: string
  sessionStats?: SessionStats
}

function degreeSolfege(degree: number): string {
  return DEGREE_SOLFEGE_LABELS[String(degree) as (typeof DEGREE_OPTION_IDS)[number]]
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

function QuestionDistribution({ sessionStats }: { sessionStats: SessionStats }) {
  const questionCounts = aggregateSessionDegreeDistribution(sessionStats)
  const maxCount = Math.max(...questionCounts.map((item) => item.count), 1)

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-center text-[11px] text-[var(--text-secondary)]">出题分布</p>
      {DEGREE_OPTION_IDS.map((id, index) => {
        const questionCount = questionCounts[index]?.count ?? 0
        const barWidth = questionCount > 0 ? `${(questionCount / maxCount) * 100}%` : '0%'

        return (
          <div key={id} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-xs font-semibold tabular-nums text-sky-200/90 ring-1 ring-sky-400/15">
              {id}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-black/25">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-sky-400/65 transition-all"
                style={{ width: barWidth }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-[var(--text-secondary)]">
              {questionCount}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ConfusionPairs({ store }: { store: NoteKeyMistakeStatsStore }) {
  const pairs = aggregateByDegreePair(store)
  if (pairs.length === 0) return null

  const maxCount = pairs[0]!.count

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-center text-[11px] text-[var(--text-secondary)]">混淆音级</p>
      {pairs.map(({ correctDegree, wrongDegree, count, ratio }) => {
        const barWidth = `${(count / maxCount) * 100}%`

        return (
          <div
            key={`${correctDegree}-${wrongDegree}`}
            className="flex items-center gap-3"
          >
            <span className="w-[4.5rem] shrink-0 text-right text-xs font-medium text-red-200/90">
              {degreeSolfege(correctDegree)} → {degreeSolfege(wrongDegree)}
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

export function NoteKeyMistakeSummary({
  store,
  title,
  sessionStats,
}: NoteKeyMistakeSummaryProps) {
  const showQuestions = sessionStats !== undefined && hasSessionAttempts(sessionStats)
  const showPairs = store.length > 0

  if (!showQuestions && !showPairs) {
    return null
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </p>
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-4">
        {showQuestions && sessionStats && <QuestionDistribution sessionStats={sessionStats} />}
        {showPairs && <ConfusionPairs store={store} />}
      </div>
    </div>
  )
}
