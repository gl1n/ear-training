import { aggregateByCorrectDegree, type NoteKeyMistakeStatsStore } from '../quiz/noteKeyMistakeStats'
import { DEGREE_OPTION_IDS } from '../quiz/keys'
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

export function NoteKeyMistakeSummary({
  store,
  title,
  sessionStats,
}: NoteKeyMistakeSummaryProps) {
  const showQuestions = sessionStats !== undefined && hasSessionAttempts(sessionStats)
  const questionCounts = showQuestions
    ? aggregateSessionDegreeDistribution(sessionStats)
    : null
  const mistakeCounts = store.length > 0 ? aggregateByCorrectDegree(store) : null

  if (!showQuestions && !mistakeCounts) {
    return null
  }

  const rows = DEGREE_OPTION_IDS.map((id, index) => ({
    degree: Number(id),
    questionCount: questionCounts?.[index]?.count ?? 0,
    mistakeCount: mistakeCounts?.[index]?.count ?? 0,
  }))

  const maxCount = Math.max(
    ...rows.map((row) => (showQuestions ? row.questionCount : row.mistakeCount)),
    1,
  )

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </p>
      {showQuestions && (
        <div className="flex justify-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-sky-400/70" />
            出题
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-red-400/70" />
            错题
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4">
        {rows.map(({ degree, questionCount, mistakeCount }) => {
          const barCount = showQuestions ? questionCount : mistakeCount
          const barWidth = barCount > 0 ? `${(barCount / maxCount) * 100}%` : '0%'
          const hasMistake = mistakeCount > 0

          return (
            <div key={degree} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-right text-sm tabular-nums text-[var(--text-secondary)]">
                {degree}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-black/30">
                <div
                  className={`absolute inset-y-0 left-0 rounded transition-all ${
                    showQuestions && !hasMistake ? 'bg-sky-400/70' : 'bg-red-400/70'
                  }`}
                  style={{ width: barWidth }}
                />
              </div>
              <span
                className={`w-6 shrink-0 text-right text-sm tabular-nums ${
                  hasMistake ? 'text-red-400' : ''
                }`}
              >
                {showQuestions ? questionCount : mistakeCount}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
